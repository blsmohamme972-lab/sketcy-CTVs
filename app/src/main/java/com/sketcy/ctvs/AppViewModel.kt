package com.sketcy.ctvs

import android.app.Application
import android.net.Uri
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sketcy.ctvs.data.*
import com.sketcy.ctvs.lesson.*
import com.sketcy.ctvs.player.LessonPlayer
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.serialization.decodeFromString

class SketcyApplication: Application() { val repository by lazy { LessonRepository(this) } }

data class ReviewPrompt(val installed: InstalledLesson,val card: CardRow,val question: ReviewQuestion,
    val startedAt: Long=SystemClock.elapsedRealtime(),val choice: String?=null,val tapX: Float?=null,val tapY: Float?=null,
    val revealed: Boolean=false,val objectivelyCorrect: Boolean?=null)

class AppViewModel(application: Application): AndroidViewModel(application) {
    val repository=(application as SketcyApplication).repository
    val lessons=repository.dao.observeLessons().map { rows -> rows.map(repository::installed) }
        .flowOn(Dispatchers.IO).stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),emptyList())
    val cards=repository.dao.observeCards().stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),emptyList())
    val progress=repository.dao.observeProgress().stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),emptyList())
    val history=repository.dao.observeLog().stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),emptyList())
    val preferences=repository.preferences.values.stateIn(viewModelScope,SharingStarted.Eagerly,StudyPreferences())
    val busy=MutableStateFlow(false)
    val ready=MutableStateFlow(false)
    val review=MutableStateFlow<ReviewPrompt?>(null)
    val reviewLoading=MutableStateFlow(false)
    val messages=MutableSharedFlow<String>(extraBufferCapacity=8)
    val player=LessonPlayer(application,viewModelScope) { lesson,part,mode,position,completed ->
        runCatching { repository.saveProgress(lesson.row.id,part.id,mode,position,completed,lesson.row.manifestSha256,lesson.row.folder) }
            .onFailure { messages.tryEmit("Playback position could not be saved") }
    }

    init {
        viewModelScope.launch {
            runCatching { repository.recoverOrphans() }.onFailure { messages.emit("Storage recovery: ${it.message}") }
            ready.value=true
        }
        viewModelScope.launch { preferences.collect { player.configure(it.playbackSpeed,it.reducedMotion) } }
    }

    private fun action(block: suspend ()->String) {
        if(busy.value)return
        busy.value=true
        viewModelScope.launch {
            try { messages.emit(block()) }
            catch(cancelled: CancellationException){throw cancelled}
            catch(error: Exception){messages.emit(error.message ?: "The operation could not finish")}
            finally {busy.value=false}
        }
    }
    fun importLesson(uri: Uri) {player.closeLesson();review.value=null;action {repository.importUri(uri)}}
    fun exportBackup(uri: Uri)=action {repository.exportBackup(uri);"Backup exported"}
    fun restoreBackup(uri: Uri) {player.closeLesson();review.value=null;action {repository.restoreBackup(uri);"Backup restored"}}
    fun deleteLesson(id: String) {player.closeLesson();review.value=null;action {repository.deleteLesson(id);"Lesson removed"}}
    fun bookmark(id: String,value: Boolean) {viewModelScope.launch {repository.dao.bookmark(id,value)}}
    fun settings(value: StudyPreferences) {viewModelScope.launch {
        runCatching {repository.savePreferences(value)}.onFailure {messages.emit("Settings could not be saved")}
    }}
    fun openPlayer(lesson: InstalledLesson,part: PackagePart) {
        if(busy.value)return
        viewModelScope.launch {
            val resume=repository.dao.lessonProgress(lesson.row.id).filter {it.partId==part.id}.maxByOrNull {it.updatedAt}
            if(busy.value || repository.dao.lesson(lesson.row.id)?.folder!=lesson.row.folder)return@launch
            player.open(lesson,part,resume?.let { NarrationMode.valueOf(it.mode) } ?: NarrationMode.EXPLANATION,
                resume?.positionMs ?: 0)
        }
    }
    fun startReview() {viewModelScope.launch {
        runCatching {nextReview()}.onFailure {messages.emit(it.message ?: "Review could not load")}
    }}
    private suspend fun nextReview() {
        reviewLoading.value=true
        try {
        val card=repository.dao.cards().filter {it.dueMs<=System.currentTimeMillis()}.minByOrNull {it.dueMs}
        if(card==null){review.value=null;return}
        val lesson=repository.dao.lesson(card.lessonId)?.let(repository::installed) ?: run {review.value=null;return}
        val memory=PackageJson.decodeFromString<MemoryState>(card.memoryJson)
        val question=ReviewSelection.choose(lesson.lesson.questions,card.factId,memory,card.previousType?.let(QuestionType::valueOf))
        review.value=ReviewPrompt(lesson,card,question)
        } finally {reviewLoading.value=false}
    }
    fun chooseAnswer(id: String) {review.value?.takeUnless {it.revealed}?.let {review.value=it.copy(choice=id)}}
    fun tapAnswer(x: Float,y: Float) {review.value?.takeUnless {it.revealed}?.let {review.value=it.copy(tapX=x,tapY=y)}}
    fun reveal() {
        val prompt=review.value ?: return
        if(prompt.revealed)return
        val correct=when(prompt.question.type) {
            QuestionType.MULTIPLE_CHOICE -> { if(prompt.choice==null)return;prompt.choice==prompt.question.correctChoiceId }
            QuestionType.TAP_SYMBOL -> {
                val x=prompt.tapX ?: return;val y=prompt.tapY ?: return
                val region=prompt.installed.lesson.symbols.first {it.id==prompt.question.symbolId}.region
                x>=region.x && x<=region.x+region.width && y>=region.y && y<=region.y+region.height
            }
            else -> null
        }
        review.value=prompt.copy(revealed=true,objectivelyCorrect=correct)
    }
    fun rate(rating: Rating) {
        val prompt=review.value?.takeIf {it.revealed} ?: return
        action {
            repository.rate(prompt.card.key,prompt.card.memoryJson,prompt.question,rating,prompt.objectivelyCorrect,
                SystemClock.elapsedRealtime()-prompt.startedAt)
            nextReview();"Review saved"
        }
    }
    override fun onCleared(){player.release();super.onCleared()}
}
