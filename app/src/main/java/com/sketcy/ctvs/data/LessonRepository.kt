package com.sketcy.ctvs.data

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.room.Room
import androidx.room.withTransaction
import com.sketcy.ctvs.lesson.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

data class InstalledLesson(val row: LessonRow, val lesson: LessonPackage, val directory: File)

class LessonRepository(private val context: Context) {
    val database = Room.databaseBuilder(context.applicationContext,StudyDatabase::class.java,"sketcy.db").build()
    val dao = database.study()
    val preferences = PreferenceStore(context)
    private val root = File(context.filesDir,"lessons").apply { mkdirs() }
    private val mutex = Mutex()

    fun installed(row: LessonRow) = InstalledLesson(row,PackageJson.decodeFromString(row.manifestJson),File(root,row.folder))

    suspend fun recoverOrphans() = withContext(Dispatchers.IO) { mutex.withLock {
        applyPendingPreferences()
        val live = dao.lessons().map { it.folder }.toSet()
        root.listFiles()?.filter { it.name !in live }?.forEach { it.deleteRecursively() }
    } }

    private suspend fun applyPendingPreferences() {
        dao.pendingPreferences()?.let { pending ->
            preferences.save(PackageJson.decodeFromString<StudyPreferences>(pending.json))
            dao.clearPendingPreferences()
        }
    }

    suspend fun savePreferences(value: StudyPreferences) = mutex.withLock {
        value.validate()
        dao.putPendingPreferences(PendingPreferences(json=PackageJson.encodeToString(value)))
        applyPendingPreferences()
    }

    suspend fun importUri(uri: Uri): String = withContext(Dispatchers.IO) {
        val temporary = File.createTempFile("lesson-",".zip",context.cacheDir)
        try {
            context.contentResolver.openInputStream(uri).use { input ->
                requireNotNull(input) { "Cannot open selected file" }
                temporary.outputStream().use { copyBounded(input,it,PackageArchive.MAX_ZIP_BYTES) }
            }
            importFile(temporary)
        } finally { temporary.delete() }
    }

    suspend fun importFile(file: File): String = withContext(Dispatchers.IO) { mutex.withLock {
        val stage = File(root,"stage-${UUID.randomUUID()}")
        var published: File? = null
        var committed = false
        try {
            val valid = PackageArchive.extract(file,stage)
            decodeImages(valid.lesson,stage)
            val lesson = valid.lesson
            val old = dao.lesson(lesson.lessonId)
            if (old?.manifestSha256 == valid.manifestSha256) return@withLock "${lesson.title} is already imported"
            require(old == null || lesson.revision > old.revision) { "An update needs a higher content revision" }
            val folder = "${lesson.lessonId}-${lesson.revision}-${UUID.randomUUID()}"
            val target = File(root,folder)
            require(stage.renameTo(target)) { "Cannot publish lesson files" }
            published = target
            val now = System.currentTimeMillis()
            // Once files are published, cancellation must not delete files whose DB commit succeeded.
            withContext(NonCancellable) {
            database.withTransaction {
                val oldCards = dao.lessonCards(lesson.lessonId).associateBy { it.factId }
                val oldProgress = dao.lessonProgress(lesson.lessonId)
                val previous = old?.let { PackageJson.decodeFromString<LessonPackage>(it.manifestJson) }
                val cards = lesson.facts.map { fact ->
                    val fingerprint = lesson.fingerprint(fact)
                    oldCards[fact.id]?.takeIf { it.fingerprint == fingerprint } ?: CardRow(
                        "${lesson.lessonId}/${fact.id}",lesson.lessonId,fact.id,fingerprint,
                        PackageJson.encodeToString(MemoryState(dueMs=now)),now)
                }
                dao.putLesson(LessonRow(lesson.lessonId,lesson.title,lesson.specialty,lesson.revision,
                    valid.manifestJson,valid.manifestSha256,folder,now,old?.bookmarked ?: false))
                dao.removeCards(lesson.lessonId);dao.putCards(cards)
                dao.removeProgress(lesson.lessonId)
                oldProgress.forEach { progress ->
                    val currentPart = lesson.parts.find { it.id == progress.partId }
                    val oldPart = previous?.parts?.find { it.id == progress.partId }
                    if (currentPart != null && oldPart != null) {
                        val mode = NarrationMode.valueOf(progress.mode)
                        val currentTrack = currentPart.track(mode);val oldTrack = oldPart.track(mode)
                        val currentHash = lesson.assets.find { it.path==currentTrack.assetPath }?.sha256
                        val oldHash = previous.assets.find { it.path==oldTrack.assetPath }?.sha256
                        val sameFacts = currentPart.factIds == oldPart.factIds && currentPart.factIds.all { id ->
                            cards.find { it.factId==id }?.fingerprint == oldCards[id]?.fingerprint }
                        if (currentHash == oldHash && currentTrack.durationMs == oldTrack.durationMs && sameFacts) dao.putProgress(progress)
                    }
                }
            }
            committed = true
            old?.let { File(root,it.folder).deleteRecursively() }
            }
            "Imported ${lesson.title}"
        } finally {
            stage.deleteRecursively()
            if (!committed) published?.deleteRecursively()
        }
    } }

    private fun decodeImages(lesson: LessonPackage, directory: File) {
        lesson.assets.filter { it.mediaType=="image/png" }.forEach { asset ->
            val options=BitmapFactory.Options().apply { inSampleSize=4 }
            val bitmap=BitmapFactory.decodeFile(File(directory,asset.path).path,options)
            requireNotNull(bitmap) { "Illustration cannot be decoded" };bitmap.recycle()
        }
    }

    suspend fun saveProgress(lessonId: String,partId: String,mode: NarrationMode,position: Long,completed: Boolean,
        expectedManifest: String,expectedFolder: String) = database.withTransaction {
        val row=dao.lesson(lessonId) ?: return@withTransaction
        if(row.manifestSha256!=expectedManifest || row.folder!=expectedFolder)return@withTransaction
        val lesson=PackageJson.decodeFromString<LessonPackage>(row.manifestJson)
        val part=lesson.parts.find { it.id==partId } ?: return@withTransaction
        val prior=dao.lessonProgress(lessonId).find { it.partId==partId && it.mode==mode.name }
        dao.putProgress(ProgressRow(lessonId,partId,mode.name,position.coerceIn(0,part.track(mode).durationMs),
            completed || prior?.completed==true,System.currentTimeMillis()))
    }

    suspend fun rate(cardKey: String,expectedMemory: String,question: ReviewQuestion,requested: Rating,
        objectivelyCorrect: Boolean?,durationMs: Long): MemoryState = database.withTransaction {
        val row=requireNotNull(dao.card(cardKey)) { "This fact is no longer available" }
        require(row.memoryJson==expectedMemory) { "This review was already saved or the lesson changed" }
        val lesson=PackageJson.decodeFromString<LessonPackage>(requireNotNull(dao.lesson(row.lessonId)).manifestJson)
        require(lesson.questions.any { it==question } && question.factId==row.factId) { "Question changed during review" }
        val before=PackageJson.decodeFromString<MemoryState>(row.memoryJson)
        val now=System.currentTimeMillis()
        val effective=ReviewSelection.effectiveRating(requested,objectivelyCorrect)
        val after=FsrsScheduler(preferences.values.first().retention).review(before,effective,now)
        val afterJson=PackageJson.encodeToString(after)
        dao.putCards(listOf(row.copy(memoryJson=afterJson,dueMs=after.dueMs,previousType=question.type.name)))
        dao.putLog(ReviewLogRow(UUID.randomUUID().toString(),row.lessonId,row.factId,row.fingerprint,
            question.id,question.type.name,effective.name,objectivelyCorrect,now,durationMs.coerceIn(0,3_600_000),row.memoryJson,afterJson))
        after
    }

    suspend fun deleteLesson(id: String) = withContext(Dispatchers.IO) { mutex.withLock {
        val row=dao.lesson(id) ?: return@withLock
        database.withTransaction { dao.removeCards(id);dao.removeProgress(id);dao.removeLogs(id);dao.removeLesson(id) }
        File(root,row.folder).deleteRecursively()
    } }

    suspend fun exportBackup(uri: Uri) = withContext(Dispatchers.IO) { mutex.withLock {
        applyPendingPreferences()
        val snapshot=database.withTransaction { BackupSnapshot(lessons=dao.lessons(),cards=dao.cards(),
            progress=dao.progress(),logs=dao.logs(),preferences=preferences.values.first()) }
        require(snapshot.lessons.size<=100) { "Version 1 backups support at most 100 lessons" }
        validateSnapshot(snapshot)
        val metadata=PackageJson.encodeToString(snapshot).toByteArray()
        require(metadata.size<=16*1024*1024) { "Backup metadata exceeds 16 MiB" }
        var expanded=metadata.size.toLong()
        val temporary=File.createTempFile("backup-",".zip",context.cacheDir)
        try {
            ZipOutputStream(temporary.outputStream()).use { zip ->
                zip.putNextEntry(ZipEntry("backup.json"));zip.write(metadata);zip.closeEntry()
                snapshot.lessons.forEach { row ->
                    val installed=installed(row)
                    val lessonZip=File.createTempFile("export-lesson-",".zip",context.cacheDir)
                    try {
                        ZipOutputStream(lessonZip.outputStream()).use { nested ->
                            listOf("manifest.json").plus(installed.lesson.assets.map { it.path }).forEach { path ->
                                nested.putNextEntry(ZipEntry(path));File(installed.directory,path).inputStream().use { it.copyTo(nested) };nested.closeEntry()
                            }
                        }
                        require(lessonZip.length()<=PackageArchive.MAX_ZIP_BYTES) { "An exported lesson exceeds 256 MiB" }
                        expanded+=lessonZip.length()
                        require(expanded<=MAX_BACKUP_BYTES) { "Expanded backup exceeds 1 GiB" }
                        zip.putNextEntry(ZipEntry("lessons/${row.id}.zip"));lessonZip.inputStream().use { it.copyTo(zip) };zip.closeEntry()
                    } finally { lessonZip.delete() }
                }
            }
            require(temporary.length()<=MAX_BACKUP_BYTES) { "Backup exceeds 1 GiB" }
            context.contentResolver.openOutputStream(uri,"wt").use { output ->
                requireNotNull(output);temporary.inputStream().use { it.copyTo(output) }
            }
        } finally { temporary.delete() }
    } }

    suspend fun restoreBackup(uri: Uri) = withContext(Dispatchers.IO) { mutex.withLock {
        val file=File.createTempFile("restore-",".zip",context.cacheDir)
        val stages=mutableListOf<File>();val published=mutableListOf<File>()
        var committed=false
        try {
            context.contentResolver.openInputStream(uri).use { input ->
                requireNotNull(input);file.outputStream().use { copyBounded(input,it,MAX_BACKUP_BYTES) }
            }
            PackageArchive.checkCentralDirectory(file,setOf("backup.json"),256L*1024*1024,MAX_BACKUP_BYTES,130)
            ZipFile(file).use { zip ->
                val metadata=requireNotNull(zip.getEntry("backup.json")) { "Missing backup manifest" }
                require(metadata.size in 1..16L*1024*1024)
                val bytes=zip.getInputStream(metadata).use { input ->
                    val buffer=java.io.ByteArrayOutputStream();copyBounded(input,buffer,16L*1024*1024);buffer.toByteArray()
                }
                require(bytes.size.toLong()==metadata.size && java.util.zip.CRC32().apply {update(bytes)}.value==metadata.crc) { "Corrupt backup metadata" }
                var expanded=bytes.size.toLong()
                val text=Charsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString();StrictJson.check(text)
                val snapshot=PackageJson.decodeFromString<BackupSnapshot>(text)
                require(snapshot.schemaVersion==1 && snapshot.lessons.size<=100)
                require(snapshot.lessons.map { it.id }.distinct().size==snapshot.lessons.size)
                require(zip.entries().asSequence().filterNot { it.isDirectory }.map { it.name }.toSet()==
                    snapshot.lessons.map { "lessons/${it.id}.zip" }.toSet()+"backup.json")
                snapshot.preferences.validate()
                val lessons=snapshot.lessons.map { row ->
                    requireId(row.id)
                    val stage=File(root,"stage-${UUID.randomUUID()}");stages+=stage
                    val nested=File.createTempFile("restore-lesson-",".zip",context.cacheDir)
                    val valid=try {
                        val entry=requireNotNull(zip.getEntry("lessons/${row.id}.zip"))
                        val crc=java.util.zip.CRC32()
                        zip.getInputStream(entry).use { raw ->
                            java.util.zip.CheckedInputStream(raw,crc).use { input ->
                                val copied=nested.outputStream().use { copyBounded(input,it,minOf(PackageArchive.MAX_ZIP_BYTES,MAX_BACKUP_BYTES-expanded)) }
                                expanded+=copied
                                require(copied==entry.size && crc.value==entry.crc) { "Corrupt lesson in backup" }
                            }
                        }
                        PackageArchive.extract(nested,stage)
                    } finally { nested.delete() }
                    require(valid.lesson.lessonId==row.id && valid.manifestSha256==row.manifestSha256 && valid.manifestJson==row.manifestJson)
                    require(row.revision==valid.lesson.revision && row.title==valid.lesson.title && row.specialty==valid.lesson.specialty)
                    decodeImages(valid.lesson,stage)
                    val target=File(root,"${row.id}-restore-${UUID.randomUUID()}")
                    require(stage.renameTo(target));published+=target
                    row.copy(folder=target.name)
                }
                validateSnapshot(snapshot)
                val oldFolders=dao.lessons().map { File(root,it.folder) }
                withContext(NonCancellable) {
                database.withTransaction {
                    dao.clearLessons();dao.clearCards();dao.clearProgress();dao.clearLogs()
                    lessons.forEach { dao.putLesson(it) };dao.putCards(snapshot.cards)
                    snapshot.progress.forEach { dao.putProgress(it) };snapshot.logs.forEach { dao.putLog(it) }
                    dao.putPendingPreferences(PendingPreferences(json=PackageJson.encodeToString(snapshot.preferences)))
                }
                committed=true
                oldFolders.forEach { it.deleteRecursively() }
                try { applyPendingPreferences() } catch(error: java.io.IOException) {
                    throw java.io.IOException("Lesson data was restored. Settings are queued for recovery on the next launch.",error)
                }
                }
            }
        } finally {
            file.delete();stages.forEach { it.deleteRecursively() }
            if (!committed) published.forEach { it.deleteRecursively() }
        }
    } }

    private fun validateSnapshot(snapshot: BackupSnapshot) {
        require(snapshot.cards.size<=100_000 && snapshot.logs.size<=100_000 && snapshot.progress.size<=20_000)
        val lessons=snapshot.lessons.associate { it.id to PackageJson.decodeFromString<LessonPackage>(it.manifestJson) }
        require(snapshot.cards.map { it.key }.distinct().size==snapshot.cards.size)
        require(snapshot.logs.map { it.id }.distinct().size==snapshot.logs.size)
        require(snapshot.progress.map { "${it.lessonId}/${it.partId}/${it.mode}" }.distinct().size==snapshot.progress.size)
        val expected=lessons.values.flatMap { lesson -> lesson.facts.map { "${lesson.lessonId}/${it.id}" } }.toSet()
        require(snapshot.cards.map { it.key }.toSet()==expected) { "Backup fact inventory differs" }
        snapshot.cards.forEach { card ->
            val lesson=requireNotNull(lessons[card.lessonId]);val fact=lesson.facts.first { it.id==card.factId }
            require(card.key=="${card.lessonId}/${card.factId}" && card.fingerprint==lesson.fingerprint(fact))
            val state=PackageJson.decodeFromString<MemoryState>(card.memoryJson);state.validate();require(card.dueMs==state.dueMs)
            card.previousType?.let { QuestionType.valueOf(it) }
        }
        snapshot.progress.forEach { row ->
            val part=requireNotNull(lessons[row.lessonId]).parts.first { it.id==row.partId }
            require(row.positionMs in 0..part.track(NarrationMode.valueOf(row.mode)).durationMs && row.updatedAt>=0)
        }
        snapshot.logs.forEach { row ->
            requireId(row.lessonId);requireId(row.factId);requireId(row.questionId)
            require(row.lessonId in lessons) { "Review history refers to a missing lesson" }
            require(row.id.length in 1..100 && hashPattern.matches(row.fingerprint) && row.reviewedAt>=0 && row.durationMs in 0..3_600_000)
            Rating.valueOf(row.rating);QuestionType.valueOf(row.questionType)
            val before=PackageJson.decodeFromString<MemoryState>(row.beforeJson).also {it.validate()}
            val after=PackageJson.decodeFromString<MemoryState>(row.afterJson).also {it.validate()}
            require(after.lastReviewMs==row.reviewedAt && after.reviews==before.reviews+1) { "Inconsistent review history" }
            require(row.objectivelyCorrect!=false || row.rating==Rating.AGAIN.name)
        }
    }
    companion object { const val MAX_BACKUP_BYTES=1024L*1024*1024 }
}

@Serializable
data class BackupSnapshot(val schemaVersion: Int=1,val lessons: List<LessonRow>,val cards: List<CardRow>,
    val progress: List<ProgressRow>,val logs: List<ReviewLogRow>,val preferences: StudyPreferences)

fun copyBounded(input: InputStream,output: OutputStream,maximum: Long): Long {
    val buffer=ByteArray(65536);var total=0L
    while (true) { val count=input.read(buffer);if(count<0)break;total+=count;require(total<=maximum){"File exceeds allowed size"};output.write(buffer,0,count) }
    return total
}
