package com.sketcy.ctvs.lesson

import java.io.File
import java.nio.file.Files

/** Desktop validation uses exactly the same parser and media rules as the Android importer. */
fun main(args: Array<String>) {
    val path=args.singleOrNull() ?: System.getenv("SKETCY_PACKAGE_PATH")
        ?: error("Supply one lesson ZIP path, or set SKETCY_PACKAGE_PATH")
    val temporary=Files.createTempDirectory("sketcy-validate-").toFile()
    try {
        val valid=PackageArchive.extract(File(path),File(temporary,"lesson"))
        val lesson=valid.lesson
        println("VALID: ${lesson.title}; ${lesson.facts.size} facts; ${lesson.parts.size} parts; ${lesson.contentType}")
        lesson.parts.forEach {println("${it.id}: explanation ${it.explanation.durationMs} ms; story ${it.story.durationMs} ms")}
        println("Manifest SHA-256: ${valid.manifestSha256}")
        println("This validates structure, coverage IDs, quotes, checksums and media. It does not verify medical accuracy or listening quality.")
    } finally {temporary.deleteRecursively()}
}
