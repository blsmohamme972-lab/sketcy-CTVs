package com.sketcy.ctvs.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "lessons")
data class LessonRow(@PrimaryKey val id: String, val title: String, val specialty: String,
    val revision: Int, val manifestJson: String, val manifestSha256: String,
    val folder: String, val importedAt: Long, val bookmarked: Boolean = false)

@Serializable
@Entity(tableName = "progress", primaryKeys = ["lessonId","partId","mode"])
data class ProgressRow(val lessonId: String, val partId: String, val mode: String,
    val positionMs: Long, val completed: Boolean, val updatedAt: Long)

@Serializable
@Entity(tableName = "cards", indices = [Index("lessonId"),Index("dueMs")])
data class CardRow(@PrimaryKey val key: String, val lessonId: String, val factId: String,
    val fingerprint: String, val memoryJson: String, val dueMs: Long, val previousType: String? = null)

@Serializable
@Entity(tableName = "review_log", indices = [Index("lessonId"),Index("reviewedAt")])
data class ReviewLogRow(@PrimaryKey val id: String, val lessonId: String, val factId: String,
    val fingerprint: String, val questionId: String, val questionType: String, val rating: String,
    val objectivelyCorrect: Boolean?, val reviewedAt: Long, val durationMs: Long,
    val beforeJson: String, val afterJson: String)

@Entity(tableName = "pending_preferences")
data class PendingPreferences(@PrimaryKey val id: Int = 1, val json: String)

@Dao
interface StudyDao {
    @Query("SELECT * FROM pending_preferences WHERE id=1") suspend fun pendingPreferences(): PendingPreferences?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putPendingPreferences(row: PendingPreferences)
    @Query("DELETE FROM pending_preferences") suspend fun clearPendingPreferences()
    @Query("SELECT * FROM lessons ORDER BY importedAt DESC") fun observeLessons(): Flow<List<LessonRow>>
    @Query("SELECT * FROM cards ORDER BY dueMs") fun observeCards(): Flow<List<CardRow>>
    @Query("SELECT * FROM progress ORDER BY updatedAt DESC") fun observeProgress(): Flow<List<ProgressRow>>
    @Query("SELECT * FROM review_log ORDER BY reviewedAt DESC") fun observeLog(): Flow<List<ReviewLogRow>>
    @Query("SELECT * FROM lessons") suspend fun lessons(): List<LessonRow>
    @Query("SELECT * FROM cards") suspend fun cards(): List<CardRow>
    @Query("SELECT * FROM progress") suspend fun progress(): List<ProgressRow>
    @Query("SELECT * FROM review_log") suspend fun logs(): List<ReviewLogRow>
    @Query("SELECT * FROM lessons WHERE id=:id") suspend fun lesson(id: String): LessonRow?
    @Query("SELECT * FROM cards WHERE `key`=:key") suspend fun card(key: String): CardRow?
    @Query("SELECT * FROM cards WHERE lessonId=:id") suspend fun lessonCards(id: String): List<CardRow>
    @Query("SELECT * FROM progress WHERE lessonId=:id") suspend fun lessonProgress(id: String): List<ProgressRow>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putLesson(row: LessonRow)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putCards(rows: List<CardRow>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putProgress(row: ProgressRow)
    @Insert(onConflict = OnConflictStrategy.ABORT) suspend fun putLog(row: ReviewLogRow)
    @Query("UPDATE lessons SET bookmarked=:value WHERE id=:id") suspend fun bookmark(id: String,value: Boolean)
    @Query("DELETE FROM lessons WHERE id=:id") suspend fun removeLesson(id: String)
    @Query("DELETE FROM cards WHERE lessonId=:id") suspend fun removeCards(id: String)
    @Query("DELETE FROM progress WHERE lessonId=:id") suspend fun removeProgress(id: String)
    @Query("DELETE FROM review_log WHERE lessonId=:id") suspend fun removeLogs(id: String)
    @Query("DELETE FROM lessons") suspend fun clearLessons()
    @Query("DELETE FROM cards") suspend fun clearCards()
    @Query("DELETE FROM progress") suspend fun clearProgress()
    @Query("DELETE FROM review_log") suspend fun clearLogs()
}

@Database(entities = [LessonRow::class,ProgressRow::class,CardRow::class,ReviewLogRow::class,PendingPreferences::class], version = 1, exportSchema = true)
abstract class StudyDatabase: RoomDatabase() { abstract fun study(): StudyDao }
