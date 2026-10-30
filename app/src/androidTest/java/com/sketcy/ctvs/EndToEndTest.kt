package com.sketcy.ctvs

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import com.sketcy.ctvs.data.*
import com.sketcy.ctvs.lesson.*
import com.sketcy.ctvs.player.LessonPlayer
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.*
import org.junit.Assert.*
import java.io.File
import java.util.zip.*

/** Requires a real Breeze-generated ZIP copied to target files/fixtures/technical-demo.zip.
 * It is intentionally not embedded in the repository or test APK. See docs/VERIFICATION.md.
 */
class EndToEndTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()
    private lateinit var context: Context
    private lateinit var repo: LessonRepository
    private lateinit var fixture: File

    @Before fun seed() = runBlocking {
        context=InstrumentationRegistry.getInstrumentation().targetContext
        repo=(context.applicationContext as SketcyApplication).repository
        fixture=File(context.filesDir,"fixtures/technical-demo.zip")
        assertTrue("Copy the real CPU-generated demo ZIP before running connected tests",fixture.isFile)
        compose.runOnUiThread {compose.activity.model.player.closeLesson()}
        repo.dao.lessons().forEach {repo.deleteLesson(it.id)}
        repo.savePreferences(StudyPreferences())
        repo.importFile(fixture)
        Unit
    }

    @Test fun libraryOverviewExplorerAndRecallConcealment() {
        compose.waitUntil(30_000){compose.onAllNodesWithText("The Lantern Library").fetchSemanticsNodes().isNotEmpty()}
        compose.onNodeWithText("The Lantern Library").performClick()
        compose.onNodeWithText("A nonmedical technical demo").assertExists()
        compose.onNodeWithText("Explore symbols").performScrollTo().performClick()
        compose.onNodeWithText("Blue lantern").performScrollTo().performClick()
        compose.onAllNodesWithText("The blue lantern marks the entrance. It has a handle and square glass panels.").onFirst().assertExists()
        compose.onNodeWithContentDescription("Back").performClick()
        compose.onNodeWithContentDescription("Back").performClick()
        compose.onAllNodesWithText("Review").onLast().performClick()
        compose.onNodeWithText("Start review").performScrollTo().performClick()
        compose.waitUntil(30_000){compose.onAllNodesWithText("Reveal answer").fetchSemanticsNodes().isNotEmpty()}
        compose.onNodeWithText("Check your recall").assertDoesNotExist()
        compose.onNodeWithText("Reveal answer").performScrollTo().performClick()
        compose.onNodeWithText("Check your recall").assertExists()
        compose.onNodeWithText("Easy").performScrollTo().performClick()
        compose.waitUntil(20_000){runBlocking {repo.dao.logs().size==1}}
    }

    @Test fun realMedia3ClockDrivesSeekSwitchSpeedAndReducedMotion() = runBlocking {
        val installed=repo.installed(repo.dao.lessons().single());val part=installed.lesson.parts.single()
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Main)
        lateinit var player: LessonPlayer
        onMain {player=LessonPlayer(context,scope){_,_,_,_,_->};player.open(installed,part,NarrationMode.EXPLANATION,0)
            player.playPause();player.playPause();assertFalse(player.state.value.playRequested);player.playPause()}
        try {
            waitFor("real audio position") {player.state.value.positionMs>1500 && player.state.value.playing}
            assertNull(player.state.value.error)
            onMain {player.pause();player.seek(35_000)}
            waitFor("seek") {kotlin.math.abs(player.state.value.positionMs-35_000)<100}
            val frozen=player.state.value.positionMs
            delay(600)
            assertTrue(kotlin.math.abs(frozen-player.state.value.positionMs)<100)
            var expected=0L
            onMain {expected=installed.lesson.playback(part).switchMode(NarrationMode.EXPLANATION,NarrationMode.STORY,player.state.value.positionMs).positionMs
                player.switchMode(NarrationMode.STORY)}
            waitFor("shared-fact switch") {player.state.value.mode==NarrationMode.STORY && kotlin.math.abs(player.state.value.positionMs-expected)<100}
            val state=player.state.value
            assertEquals(part.story.timeline().frameAt(state.positionMs),state.frame)
            onMain {player.configure(1.5f,true)}
            assertEquals(ImageRegion(0f,0f,1f,1f),player.state.value.frame!!.focus)
            assertEquals(1.5f,player.state.value.speed,0.0f)
            onMain {player.playPause()}
            waitFor("speed playback") {player.state.value.positionMs>expected+1500}
            assertEquals(part.story.timeline().frameAt(player.state.value.positionMs,true).caption,player.state.value.frame!!.caption)
            assertNull(player.state.value.error)
        } finally {onMain {player.closeLesson();player.release();scope.cancel()}}
    }

    @Test fun rotationKeepsPlaybackAndBackgroundPauseSavesResume() = runBlocking {
        val lesson=repo.installed(repo.dao.lessons().single());val part=lesson.lesson.parts.single()
        compose.waitUntil(30_000){compose.onAllNodesWithText("The Lantern Library").fetchSemanticsNodes().isNotEmpty()}
        compose.onNodeWithText("The Lantern Library").performClick()
        compose.onNodeWithText("Start lesson").performScrollTo().performClick()
        waitFor("open") {compose.activity.model.player.state.value.partId==part.id}
        compose.runOnUiThread {compose.activity.model.player.seek(22_000);compose.activity.model.player.playPause()}
        waitFor("play before rotation") {compose.activity.model.player.state.value.playing}
        val model=compose.activity.model
        val beforeRotation=model.player.state.value.positionMs
        compose.activityRule.scenario.recreate()
        assertSame(model,compose.activity.model)
        waitFor("position after recreation") {model.player.state.value.playing && model.player.state.value.positionMs>beforeRotation+500}
        compose.activityRule.scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        waitFor("background pause") {!model.player.state.value.playing}
        waitFor("persisted pause") {repo.dao.lessonProgress(lesson.row.id).any {it.positionMs>=22_000}}
        compose.activityRule.scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)
        assertFalse(model.player.state.value.playing)
        val stored=repo.dao.lessonProgress(lesson.row.id).single()
        compose.runOnUiThread {model.player.closeLesson()}
        delay(300)
        assertEquals(stored.positionMs,repo.dao.lessonProgress(lesson.row.id).single().positionMs)
        compose.runOnUiThread {model.openPlayer(lesson,part)}
        waitFor("restored position") {model.player.state.value.positionMs>=stored.positionMs}
    }

    @Test fun importUpdateAndBackupRestorePreserveOnlyTheAppropriateState() = runBlocking {
        val installed=repo.installed(repo.dao.lessons().single());val lesson=installed.lesson;val part=lesson.parts.single()
        val card=repo.dao.cards().first();val question=lesson.questions.first {it.factId==card.factId && it.type==QuestionType.MULTIPLE_CHOICE}
        repo.rate(card.key,card.memoryJson,question,Rating.EASY,false,1700)
        val rated=repo.dao.card(card.key)!!
        assertEquals(Rating.AGAIN.name,repo.dao.logs().single().rating)
        repo.saveProgress(lesson.lessonId,part.id,NarrationMode.EXPLANATION,23_000,false,installed.row.manifestSha256,installed.row.folder)
        repo.dao.bookmark(lesson.lessonId,true)
        repo.savePreferences(StudyPreferences(captions=false,reducedMotion=true,playbackSpeed=1.25f,retention=.95))
        val backup=File(context.cacheDir,"test-backup.zip")
        try {
            repo.exportBackup(Uri.fromFile(backup))
            val update=rewrite(lesson.copy(revision=2),"update.zip")
            repo.importFile(update);update.delete()
            assertEquals(rated,repo.dao.card(card.key))
            assertEquals(23_000L,repo.dao.lessonProgress(lesson.lessonId).single().positionMs)
            val changed=lesson.copy(revision=3,facts=lesson.facts.map {if(it.id==card.factId)it.copy(text=it.text+" (Updated wording.)") else it})
            val changedZip=rewrite(changed,"changed.zip");repo.importFile(changedZip);changedZip.delete()
            assertEquals(0,PackageJson.decodeFromString<MemoryState>(repo.dao.card(card.key)!!.memoryJson).reviews)
            assertTrue(repo.dao.lessonProgress(lesson.lessonId).isEmpty())
            val bad=File(context.cacheDir,"bad.zip").apply {writeText("not a ZIP")}
            try {repo.importFile(bad);fail("Bad import must fail")}catch(_:IllegalArgumentException){}finally{bad.delete()}
            assertEquals(3,repo.dao.lesson(lesson.lessonId)!!.revision)
            repo.restoreBackup(Uri.fromFile(backup))
            // An old player callback cannot overwrite restored progress even when content hashes match.
            repo.saveProgress(lesson.lessonId,part.id,NarrationMode.EXPLANATION,0,false,installed.row.manifestSha256,installed.row.folder)
            assertEquals(1,repo.dao.lesson(lesson.lessonId)!!.revision)
            assertTrue(repo.dao.lesson(lesson.lessonId)!!.bookmarked)
            assertEquals(rated,repo.dao.card(card.key))
            assertEquals(23_000L,repo.dao.lessonProgress(lesson.lessonId).single().positionMs)
            assertEquals(1,repo.dao.logs().size)
            assertEquals(.95,repo.preferences.values.first().retention,0.0)
            assertTrue(repo.preferences.values.first().reducedMotion)
            assertNull(repo.dao.pendingPreferences())
            val before=repo.dao.lessons()
            val invalidBackup=File(context.cacheDir,"bad-backup.zip").apply {writeText("bad backup")}
            try {repo.restoreBackup(Uri.fromFile(invalidBackup));fail("Invalid restore must fail")}catch(_:IllegalArgumentException){}finally{invalidBackup.delete()}
            assertEquals(before,repo.dao.lessons())
        } finally {backup.delete()}
    }

    private fun rewrite(lesson: LessonPackage,name: String): File {
        val result=File(context.cacheDir,name)
        ZipFile(fixture).use {input->ZipOutputStream(result.outputStream()).use {output->
            input.entries().asSequence().forEach {entry->
                output.putNextEntry(ZipEntry(entry.name))
                if(entry.name=="manifest.json")output.write(PackageJson.encodeToString(lesson).toByteArray())
                else input.getInputStream(entry).use {it.copyTo(output)}
                output.closeEntry()
            }
        }}
        return result
    }
    private fun onMain(block: ()->Unit)=InstrumentationRegistry.getInstrumentation().runOnMainSync(block)
    private suspend fun waitFor(label: String,condition: suspend ()->Boolean) {
        val until=SystemClock.elapsedRealtime()+45_000
        while(!condition()){check(SystemClock.elapsedRealtime()<until){"Timed out waiting for $label"};delay(100)}
    }
}
