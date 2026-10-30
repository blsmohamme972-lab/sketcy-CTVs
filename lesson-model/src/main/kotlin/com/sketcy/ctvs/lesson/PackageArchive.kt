package com.sketcy.ctvs.lesson

import kotlinx.serialization.decodeFromString
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.zip.CRC32
import java.util.zip.ZipFile

data class ValidatedPackage(val lesson: LessonPackage, val manifestJson: String, val manifestSha256: String)

/** Bounded, strict v1 archive import. Call only with a new private staging directory. */
object PackageArchive {
    const val MAX_ZIP_BYTES = 256L * 1024 * 1024
    const val MAX_EXPANDED_BYTES = 512L * 1024 * 1024
    const val MAX_MANIFEST_BYTES = 1024 * 1024

    fun extract(archive: File, destination: File): ValidatedPackage {
        require(archive.length() in 1..MAX_ZIP_BYTES) { "Lesson ZIP exceeds 256 MiB" }
        require(!destination.exists()) { "Staging directory already exists" }
        checkCentralDirectory(archive)
        require(destination.mkdirs()) { "Cannot create import staging directory" }
        try {
            ZipFile(archive).use { zip ->
                val entries = zip.entries().asSequence().toList()
                val manifest = zip.getEntry("manifest.json") ?: error("Missing manifest.json")
                require(manifest.size in 1..MAX_MANIFEST_BYTES.toLong()) { "Manifest too large" }
                val bytes = zip.getInputStream(manifest).use { input ->
                    val buffer = java.io.ByteArrayOutputStream()
                    val chunk = ByteArray(8192)
                    var total = 0
                    while (true) {
                        val n = input.read(chunk)
                        if (n < 0) break
                        total += n
                        require(total <= MAX_MANIFEST_BYTES) { "Manifest too large" }
                        buffer.write(chunk, 0, n)
                    }
                    buffer.toByteArray()
                }
                val manifestCrc = CRC32().apply { update(bytes) }
                require(bytes.size.toLong() == manifest.size && manifestCrc.value == manifest.crc) { "Corrupt manifest" }
                val text = Charsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString()
                StrictJson.check(text)
                val lesson = PackageJson.decodeFromString<LessonPackage>(text)
                lesson.validate()
                val expected = lesson.assets.associateBy { it.path }
                require(entries.filterNot { it.isDirectory }.map { it.name }.toSet() == expected.keys + "manifest.json") { "Archive contains missing or undeclared files" }
                var expanded = bytes.size.toLong()
                lesson.assets.forEach { asset ->
                    val entry = zip.getEntry(asset.path) ?: error("Missing asset ${asset.path}")
                    require(entry.size == asset.bytes && entry.size <= MAX_ASSET_BYTES) { "Declared asset size differs" }
                    require(entry.compressedSize > 0 && entry.size.toDouble() / entry.compressedSize <= 200) { "Suspicious compression ratio" }
                    val output = File(destination, asset.path)
                    require(output.canonicalPath.startsWith(destination.canonicalPath + File.separator))
                    require(output.parentFile!!.isDirectory || output.parentFile!!.mkdirs())
                    val digest = MessageDigest.getInstance("SHA-256")
                    val crc = CRC32()
                    var count = 0L
                    zip.getInputStream(entry).use { input ->
                        output.outputStream().use { sink ->
                            val chunk = ByteArray(64 * 1024)
                            while (true) {
                                val n = input.read(chunk)
                                if (n < 0) break
                                count += n; expanded += n
                                require(count <= asset.bytes && expanded <= MAX_EXPANDED_BYTES) { "Expanded archive limit exceeded" }
                                digest.update(chunk, 0, n); crc.update(chunk, 0, n); sink.write(chunk, 0, n)
                            }
                        }
                    }
                    require(count == asset.bytes && crc.value == entry.crc && digest.digest().hex() == asset.sha256) { "Asset checksum mismatch: ${asset.path}" }
                    if (asset.mediaType == "image/png") inspectPng(output)
                }
                lesson.parts.forEach { part ->
                    listOf(part.explanation, part.story).forEach { track ->
                        val duration = inspectWav(File(destination, track.assetPath))
                        require(duration in 60_000..240_000 && kotlin.math.abs(duration - track.durationMs) <= 1) { "Actual narration duration differs from declaration" }
                    }
                }
                File(destination, "manifest.json").writeBytes(bytes)
                return ValidatedPackage(lesson, text, sha256(bytes))
            }
        } catch (error: Throwable) {
            destination.deleteRecursively()
            throw error
        }
    }

    /** Reject ZIP64, encryption, links, duplicate/case-colliding paths and misleading local headers. */
    fun checkCentralDirectory(file: File, rootNames: Set<String> = setOf("manifest.json"),
        maxEntry: Long = MAX_ASSET_BYTES, maxExpanded: Long = MAX_EXPANDED_BYTES, maxEntries: Int = 512) {
        RandomAccessFile(file, "r").use { input ->
            require(input.length() >= 22) { "Truncated ZIP" }
            val tailSize = minOf(input.length(), 65557L).toInt()
            val tail = ByteArray(tailSize)
            input.seek(input.length() - tailSize); input.readFully(tail)
            val end = (tailSize - 22 downTo 0).firstOrNull { tail.u32(it) == 0x06054b50L }
                ?: error("Missing ZIP directory")
            val eocd = input.length() - tailSize + end
            require(end + 22 + tail.u16(end + 20) == tailSize) { "Trailing or corrupt ZIP data" }
            require(tail.u16(end + 4) == 0 && tail.u16(end + 6) == 0) { "Multipart ZIP unsupported" }
            val count = tail.u16(end + 10)
            require(count in 1..maxEntries && count == tail.u16(end + 8)) { "Too many ZIP entries or ZIP64" }
            val centralSize = tail.u32(end + 12)
            val centralOffset = tail.u32(end + 16)
            require(centralOffset + centralSize == eocd) { "ZIP64 or invalid central directory" }
            input.seek(centralOffset)
            val names = mutableSetOf<String>()
            var declaredTotal = 0L
            repeat(count) {
                val header = ByteArray(46); input.readFully(header)
                require(header.u32(0) == 0x02014b50L) { "Invalid central directory" }
                val flags = header.u16(8); val method = header.u16(10)
                require(flags and (1 or 64 or 8192) == 0 && method in listOf(0, 8)) { "Encrypted or unsupported ZIP entry" }
                val size = header.u32(24)
                require(size <= maxEntry)
                declaredTotal += size; require(declaredTotal <= maxExpanded)
                val nameSize = header.u16(28); val extraSize = header.u16(30); val commentSize = header.u16(32)
                require(nameSize in 1..180 && header.u16(34) == 0)
                val nameBytes = ByteArray(nameSize); input.readFully(nameBytes)
                val name = nameBytes.toString(Charsets.UTF_8)
                val isDirectory = name.endsWith('/')
                if (name !in rootNames) {
                    if (isDirectory) {
                        require(Regex("[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*/").matches(name)) { "Unsafe directory" }
                    } else requireSafePath(name)
                }
                require(names.add(name.lowercase())) { "Duplicate or case-colliding ZIP path" }
                val unixType = (header.u32(38) shr 16).toInt() and 0xf000
                require(unixType == 0 || unixType == 0x8000 || (unixType == 0x4000 && isDirectory)) { "Links and special files are forbidden" }
                if (isDirectory) require(size == 0L)
                val next = input.filePointer + extraSize + commentSize
                require(next <= centralOffset + centralSize)
                val localOffset = header.u32(42)
                require(localOffset + 30 < centralOffset)
                input.seek(localOffset)
                val local = ByteArray(30); input.readFully(local)
                require(local.u32(0) == 0x04034b50L && local.u16(6) == flags && local.u16(8) == method)
                require(local.u16(26) == nameSize)
                val localName = ByteArray(nameSize); input.readFully(localName)
                require(localName.contentEquals(nameBytes)) { "Local and central paths differ" }
                require(localOffset + 30 + nameSize + local.u16(28) + header.u32(20) <= centralOffset)
                input.seek(next)
            }
            require(input.filePointer == centralOffset + centralSize)
        }
    }

    fun inspectPng(file: File): Pair<Int, Int> {
        val header = ByteArray(33)
        file.inputStream().use { require(it.read(header) == 33) { "Truncated PNG" } }
        require(header.copyOfRange(0, 8).contentEquals(byteArrayOf(-119,80,78,71,13,10,26,10))) { "Invalid PNG signature" }
        val data = ByteBuffer.wrap(header).order(ByteOrder.BIG_ENDIAN)
        require(data.getInt(8) == 13 && String(header, 12, 4, Charsets.US_ASCII) == "IHDR")
        val width = data.getInt(16); val height = data.getInt(20)
        require(width in 1..4096 && height in 1..4096 && width.toLong() * height <= 16_777_216) { "Illustration exceeds pixel limit" }
        val crc = CRC32().apply { update(header, 12, 17) }
        require(crc.value == (data.getInt(29).toLong() and 0xffffffffL)) { "Corrupt PNG header" }
        return width to height
    }

    fun inspectWav(file: File): Long {
        RandomAccessFile(file, "r").use { input ->
            val header = ByteArray(12); input.readFully(header)
            require(String(header,0,4,Charsets.US_ASCII) == "RIFF" && String(header,8,4,Charsets.US_ASCII) == "WAVE") { "Invalid WAV" }
            require(header.u32(4) + 8 == input.length()) { "Truncated WAV" }
            var formatSeen = false; var duration: Long? = null
            while (input.filePointer + 8 <= input.length()) {
                val chunk = ByteArray(8); input.readFully(chunk)
                val kind = String(chunk,0,4,Charsets.US_ASCII); val size = chunk.u32(4)
                val end = input.filePointer + size
                require(end <= input.length()) { "Truncated WAV chunk" }
                if (kind == "fmt ") {
                    require(!formatSeen && size in 16..64)
                    val fmt = ByteArray(size.toInt()); input.readFully(fmt)
                    require(fmt.u16(0) == 1 && fmt.u16(2) == 1 && fmt.u32(4) == 24000L &&
                        fmt.u32(8) == 48000L && fmt.u16(12) == 2 && fmt.u16(14) == 16) { "Only mono 24 kHz PCM16 narration is supported" }
                    formatSeen = true
                } else if (kind == "data") {
                    require(duration == null && formatSeen && size > 0 && size % 2 == 0L)
                    duration = size / 2 * 1000 / 24000
                    var nonzero = false
                    val bytes = ByteArray(8192)
                    while (input.filePointer < end) {
                        val count = input.read(bytes, 0, minOf(bytes.size.toLong(), end - input.filePointer).toInt())
                        require(count > 0)
                        if (!nonzero) nonzero = (0 until count).any { bytes[it] != 0.toByte() }
                    }
                    require(nonzero) { "Narration is digital silence" }
                }
                input.seek(end + size % 2)
            }
            return requireNotNull(duration) { "Missing PCM data" }
        }
    }
}

private fun ByteArray.u16(offset: Int): Int = (this[offset].toInt() and 255) or ((this[offset+1].toInt() and 255) shl 8)
private fun ByteArray.u32(offset: Int): Long = u16(offset).toLong() or (u16(offset+2).toLong() shl 16)
private fun ByteArray.hex() = joinToString("") { "%02x".format(it) }

/** Detect duplicate object keys before a deserializer can silently keep the last value. */
object StrictJson {
    fun check(text: String) {
        var index = 0
        fun space() { while (index < text.length && text[index].isWhitespace()) index++ }
        fun string(): String {
            space(); require(index < text.length && text[index] == '"')
            val start = index++
            while (index < text.length) {
                val c = text[index++]
                if (c == '\\') { require(index < text.length); index++ }
                else if (c == '"') return PackageJson.decodeFromString(text.substring(start,index))
            }
            error("Unterminated JSON string")
        }
        fun value(depth: Int) {
            require(depth <= 64) { "JSON nesting limit" }; space(); require(index < text.length)
            when (text[index]) {
                '{' -> {
                    index++; space(); val keys = mutableSetOf<String>()
                    if (index < text.length && text[index] == '}') { index++; return }
                    while (true) {
                        require(keys.add(string())) { "Duplicate JSON key" }; space()
                        require(index < text.length && text[index++] == ':'); value(depth+1); space()
                        require(index < text.length)
                        if (text[index++] == '}') break
                        require(text[index-1] == ',')
                    }
                }
                '[' -> {
                    index++; space()
                    if (index < text.length && text[index] == ']') { index++; return }
                    while (true) {
                        value(depth+1); space(); require(index < text.length)
                        if (text[index++] == ']') break
                        require(text[index-1] == ',')
                    }
                }
                '"' -> string()
                else -> {
                    val start = index
                    while (index < text.length && text[index] !in ",]} \n\r\t") index++
                    require(index > start)
                    val token = text.substring(start,index)
                    require(token in listOf("true","false","null") || Regex("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?").matches(token))
                }
            }
        }
        value(0); space(); require(index == text.length) { "Trailing JSON data" }
    }
}
