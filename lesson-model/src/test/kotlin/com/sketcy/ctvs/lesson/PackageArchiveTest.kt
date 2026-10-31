package com.sketcy.ctvs.lesson

import kotlinx.serialization.encodeToString
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.file.Files
import java.util.Base64
import java.util.zip.*
import kotlin.test.*

/** Synthetic PCM here is a binary parser fixture only; it is never shipped as narration. */
class PackageArchiveTest {
    private val png=Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")
    private fun wav(seconds: Int=60,silent: Boolean=false): ByteArray {
        val pcm=ByteArray(seconds*48000)
        if(!silent)java.util.Random(42).nextBytes(pcm)
        return ByteBuffer.allocate(44+pcm.size).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("RIFF".toByteArray());putInt(36+pcm.size);put("WAVEfmt ".toByteArray());putInt(16)
            putShort(1);putShort(1);putInt(24000);putInt(48000);putShort(2);putShort(16)
            put("data".toByteArray());putInt(pcm.size);put(pcm)
        }.array()
    }
    private fun lesson(audio: ByteArray): LessonPackage {
        val text="The test object is blue."
        val fact=Fact("f",text,listOf(SourceReference("source","passage 1",text)))
        fun track(path: String)=Track(path,60_000,listOf(TimedSegment("segment",0,60_000,listOf("f"),listOf("s"),text)),
            listOf(Caption("caption",0,60_000,text)),listOf(CameraCue(0,1000,ImageRegion(0f,0f,1f,1f))))
        return LessonPackage(lessonId="fixture",revision=1,title="Parser test",specialty="Technical",contentType=ContentType.TECHNICAL_DEMO,
            sources=listOf(SourceDocument("source","Test text",sha256(text.toByteArray()),false,mapOf("passage 1" to text))),facts=listOf(fact),
            parts=listOf(PackagePart("p","Test part",listOf("Test parsing"),"images/scene.png",listOf("f"),track("audio/explanation.wav"),track("audio/story.wav"))),
            symbols=listOf(LessonSymbol("s","p","Blue object",text,listOf("f"),ImageRegion(0f,0f,1f,1f))),
            questions=listOf(ReviewQuestion("q","f","p",QuestionType.IMAGE_RECALL,"Recall it",text,text,"s")),
            assets=listOf(Asset("images/scene.png","image/png",png.size.toLong(),sha256(png)),
                Asset("audio/explanation.wav","audio/wav",audio.size.toLong(),sha256(audio)),Asset("audio/story.wav","audio/wav",audio.size.toLong(),sha256(audio))),
            narration=NarrationProvenance(modelSha256=STANDARD_Q8_SHA256,codeCommit="a".repeat(40),voiceSha256="b".repeat(64)),quality=QualityReview())
    }
    private fun archive(directory: File,lesson: LessonPackage,audio: ByteArray,extra: Pair<String,ByteArray>?=null): File {
        val file=File(directory,"lesson.zip")
        val entries=linkedMapOf("manifest.json" to PackageJson.encodeToString(lesson).toByteArray(),"images/scene.png" to png,
            "audio/explanation.wav" to audio,"audio/story.wav" to audio)
        extra?.let {entries[it.first]=it.second}
        ZipOutputStream(file.outputStream()).use {zip->entries.forEach {(name,bytes)->
            zip.putNextEntry(ZipEntry(name).apply {method=ZipEntry.STORED;size=bytes.size.toLong();compressedSize=size;crc=CRC32().apply {update(bytes)}.value})
            zip.write(bytes);zip.closeEntry()
        }}
        return file
    }
    private inline fun temporary(block:(File)->Unit) {val dir=Files.createTempDirectory("package-test").toFile();try{block(dir)}finally{dir.deleteRecursively()}}
    @Test fun `valid archive is checked and extracted with measured audio`()=temporary {dir->
        val audio=wav();val lesson=lesson(audio)
        val valid=PackageArchive.extract(archive(dir,lesson,audio),File(dir,"stage"))
        assertEquals(lesson,valid.lesson);assertEquals(60_000,PackageArchive.inspectWav(File(dir,"stage/audio/story.wav")))
        assertTrue(File(dir,"stage/manifest.json").isFile)
    }
    @Test fun `changed bytes cannot pass declared asset checksums and staging is removed`()=temporary {dir->
        val audio=wav();val lesson=lesson(audio);audio[audio.lastIndex]=(audio.last().toInt() xor 1).toByte()
        assertFails {PackageArchive.extract(archive(dir,lesson,audio),File(dir,"stage"))}
        assertFalse(File(dir,"stage").exists())
    }
    @Test fun `measured duration cannot be replaced by a declared duration`()=temporary {dir->
        val audio=wav(59)
        assertFails {PackageArchive.extract(archive(dir,lesson(audio),audio),File(dir,"stage"))}
        assertFalse(File(dir,"stage").exists())
    }
    @Test fun `digital silence is not accepted as narration`()=temporary {dir->
        val audio=wav(silent=true)
        assertFails {PackageArchive.extract(archive(dir,lesson(audio),audio),File(dir,"stage"))}
    }
    @Test fun `undeclared executable or traversal entry fails before publishing`()=temporary {dir->
        val audio=wav();val lesson=lesson(audio)
        listOf("other/code.sh","../escaped.txt","audio/../../escaped.txt","/absolute.wav","audio\\bad.wav").forEach {name->
            assertFails {PackageArchive.extract(archive(dir,lesson,audio,name to "test".toByteArray()),File(dir,"stage"))}
            assertFalse(File(dir,"stage").exists())
        }
    }
    @Test fun `case collisions and symbolic links are rejected`()=temporary {dir->
        val audio=wav();val lesson=lesson(audio)
        assertFails {PackageArchive.extract(archive(dir,lesson,audio,"images/SCENE.png" to png),File(dir,"stage"))}
        val zip=archive(dir,lesson,audio);val bytes=zip.readBytes()
        val central=(0..bytes.size-46).first {bytes[it]==0x50.toByte() && bytes[it+1]==0x4b.toByte() && bytes[it+2]==1.toByte() && bytes[it+3]==2.toByte()}
        // POSIX S_IFLNK in external attributes of the first central-directory entry.
        bytes[central+40]=0xff.toByte();bytes[central+41]=0xa1.toByte();zip.writeBytes(bytes)
        assertFails {PackageArchive.extract(zip,File(dir,"stage"))}
    }
    @Test fun `an existing destination is never overwritten`()=temporary {dir->
        val stage=File(dir,"stage").apply {mkdir()};File(stage,"keep.txt").writeText("keep")
        val audio=wav()
        assertFails {PackageArchive.extract(archive(dir,lesson(audio),audio),stage)}
        assertEquals("keep",File(stage,"keep.txt").readText())
    }
    @Test fun `duplicate JSON keys including escaped aliases are rejected`() {
        assertFails {StrictJson.check("{\"title\":1,\"title\":2}")}
        assertFails {StrictJson.check("{\"title\":1,\"ti\\u0074le\":2}")}
        assertFails {StrictJson.check("[1,]")}
        assertFails {StrictJson.check("{\"value\":NaN}")}
        StrictJson.check("{\"title\":1,\"nested\":{\"title\":2}}")
    }
    @Test fun `source quotes and both narration inventories are required`() {
        val lesson=lesson(wav());lesson.validate()
        assertFails {lesson.copy(facts=listOf(lesson.facts.single().copy(sources=listOf(SourceReference("source","passage 1","invented"))))).validate()}
        val part=lesson.parts.single()
        assertFails {lesson.copy(parts=listOf(part.copy(story=part.story.copy(segments=emptyList())))).validate()}
        assertFails {lesson.copy(narration=lesson.narration.copy(backend="GPU")).validate()}
        assertFails {lesson.copy(narration=lesson.narration.copy(modelSha256="0".repeat(64))).validate()}
    }
    @Test fun `user source package requires supplied sources and recorded reviews`() {
        val lesson=lesson(wav()).copy(contentType=ContentType.USER_SOURCE)
        assertFails {lesson.validate()}
        val supplied=lesson.copy(sources=lesson.sources.map {it.copy(userProvided=true)})
        assertFails {supplied.validate()}
        supplied.copy(quality=QualityReview(true,true,"Test reviewer","Unit fixture only")).validate()
    }
    @Test fun `unchanged source references have stable fingerprints and changed facts do not`() {
        val lesson=lesson(wav());val fact=lesson.facts.single()
        assertEquals(lesson.fingerprint(fact),lesson.copy(revision=2).fingerprint(fact))
        assertNotEquals(lesson.fingerprint(fact),lesson.fingerprint(fact.copy(text="The test object is red.")))
        assertNotEquals(lesson.fingerprint(fact),lesson.fingerprint(fact.copy(sources=fact.sources.map {it.copy(locator="passage 2")})))
    }

    @Test fun `external medical demonstrations have a separate versioned origin and review policy`() {
        val draft=lesson(wav()).copy(schemaVersion=2,contentType=ContentType.EXTERNAL_REVIEW,
            sources=lesson(wav()).sources.map {it.copy(externalUrl="https://example.org/source")},
            quality=QualityReview(notes="Synthetic fixture. Awaiting human review."))
        draft.validate()
        assertFails {draft.copy(schemaVersion=1).validate()}
        assertFails {draft.copy(sources=draft.sources.map {it.copy(userProvided=true)}).validate()}
        assertFails {draft.copy(sources=draft.sources.map {it.copy(externalUrl=null)}).validate()}
        assertFails {draft.copy(sources=draft.sources.map {it.copy(externalUrl="javascript:alert(1)")}).validate()}
        assertFails {draft.copy(quality=QualityReview()).validate()}
        // A demonstration cannot be promoted to user-supplied content by changing its label.
        assertFails {draft.copy(contentType=ContentType.USER_SOURCE).validate()}
    }

    @Test fun `layered package references every PNG and bounds keys to its measured tracks`() {
        val base=lesson(wav())
        val layer=SceneLayer("layer","images/object.png",ImageRegion(0f,0f,1f,1f),"s",
            explanation=listOf(LayerKeyframe(0),LayerKeyframe(1000,scale=1.04f)))
        val scene=LayeredScene(64,64,"images/background.png",listOf(layer))
        val pkg=base.copy(schemaVersion=2,parts=listOf(base.parts.single().copy(scene=scene)),
            assets=base.assets+listOf("images/background.png","images/object.png").map {Asset(it,"image/png",png.size.toLong(),sha256(png))})
        pkg.validate()
        assertFails {pkg.copy(schemaVersion=1).validate()}
        assertFails {pkg.copy(assets=pkg.assets.dropLast(1)).validate()}
        fun changed(l: SceneLayer)=pkg.copy(parts=listOf(pkg.parts.single().copy(scene=scene.copy(layers=listOf(l)))))
        assertFails {changed(layer.copy(story=listOf(LayerKeyframe(60_001)))).validate()}
        assertFails {changed(layer.copy(story=listOf(LayerKeyframe(1000),LayerKeyframe(1000)))).validate()}
        assertFails {changed(layer.copy(story=listOf(LayerKeyframe(1000,dx=Float.NaN)))).validate()}
        assertFails {changed(layer.copy(story=listOf(LayerKeyframe(1000,scale=2f)))).validate()}
        assertFails {changed(layer.copy(symbolId="missing")).validate()}
        assertFails {changed(layer.copy(pivotX=2f)).validate()}
    }
}
