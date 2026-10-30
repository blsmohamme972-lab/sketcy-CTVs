package com.sketcy.ctvs.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.*
import androidx.media3.exoplayer.ExoPlayer
import com.sketcy.ctvs.data.InstalledLesson
import com.sketcy.ctvs.lesson.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

data class PlayerSnapshot(
    val lessonId: String? = null, val partId: String? = null,
    val mode: NarrationMode = NarrationMode.EXPLANATION, val positionMs: Long = 0,
    val durationMs: Long = 0, val playing: Boolean = false, val buffering: Boolean = false,
    val speed: Float = 1f, val frame: PlaybackFrame? = null, val error: String? = null,
    val playRequested: Boolean = false,
)

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class LessonPlayer(context: Context, private val scope: CoroutineScope,
    private val save: suspend (InstalledLesson,PackagePart,NarrationMode,Long,Boolean)->Unit) {
    private val player=ExoPlayer.Builder(context.applicationContext).build().apply {
        setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),true)
        setHandleAudioBecomingNoisy(true)
    }
    private var installed: InstalledLesson?=null
    private var part: PackagePart?=null
    private var timing: PartPlayback?=null
    private var mode=NarrationMode.EXPLANATION
    private var reducedMotion=false
    private var error: String?=null
    private var lastSaveAt=0L
    private val mutable=MutableStateFlow(PlayerSnapshot())
    val state=mutable.asStateFlow()

    init {
        player.addListener(object: Player.Listener {
            override fun onEvents(player: Player,events: Player.Events) { snapshot() }
            override fun onPlayerError(exception: PlaybackException) {
                error="Audio could not play: ${exception.errorCodeName}";snapshot();persist()
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState==Player.STATE_READY) {
                    val declared=part?.track(mode)?.durationMs
                    if (declared!=null && player.duration!=C.TIME_UNSET && kotlin.math.abs(player.duration-declared)>100) {
                        error="Audio duration changed. Reimport this lesson.";player.pause()
                    }
                }
                if (playbackState==Player.STATE_ENDED) persist(completed=true)
                snapshot()
            }
            override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo,newPosition: Player.PositionInfo,reason: Int) {
                snapshot();persist()
            }
        })
        scope.launch {
            while (true) {
                if (part!=null) {
                    snapshot()
                    val now=android.os.SystemClock.elapsedRealtime()
                    if (player.isPlaying && now-lastSaveAt>=1000) { lastSaveAt=now;persist() }
                }
                delay(if(player.isPlaying) 33 else 200)
            }
        }
    }

    fun open(lesson: InstalledLesson, selected: PackagePart, initialMode: NarrationMode, positionMs: Long) {
        if (installed?.row?.folder==lesson.row.folder && part?.id==selected.id) return
        pause();installed=lesson;part=selected;timing=lesson.lesson.playback(selected);mode=initialMode;error=null
        player.setMediaItem(item(initialMode),positionMs.coerceIn(0,selected.track(initialMode).durationMs))
        player.prepare();snapshot()
    }
    private fun item(mode: NarrationMode): MediaItem {
        val part=requireNotNull(part);val lesson=requireNotNull(installed)
        return MediaItem.Builder().setMediaId("${part.id}/${mode.name}")
            .setUri(Uri.fromFile(File(lesson.directory,part.track(mode).assetPath))).build()
    }
    fun switchMode(target: NarrationMode) {
        if (target==mode || timing==null) return
        val seek=requireNotNull(timing).switchMode(mode,target,player.currentPosition)
        val continuePlaying=player.playWhenReady && player.playbackState!=Player.STATE_ENDED
        persist();mode=target;error=null
        player.setMediaItem(item(target),seek.positionMs);player.prepare();player.playWhenReady=continuePlaying;snapshot()
    }
    fun playPause() {
        if(player.playWhenReady && error==null && player.playbackState!=Player.STATE_ENDED) pause() else {
            if(player.playbackState==Player.STATE_ENDED) player.seekTo(0)
            if(error!=null) {error=null;player.prepare()}
            player.play();snapshot()
        }
    }
    fun seek(position: Long) { player.seekTo(position.coerceIn(0,part?.track(mode)?.durationMs ?: 0));snapshot();persist() }
    fun configure(speed: Float,reducedMotion: Boolean) {
        player.setPlaybackSpeed(speed);this.reducedMotion=reducedMotion;snapshot()
    }
    fun pause() { player.pause();snapshot();persist() }
    fun closeLesson() { pause();installed=null;part=null;timing=null;error=null;player.stop();player.clearMediaItems();snapshot() }
    private fun snapshot() {
        val duration=part?.track(mode)?.durationMs ?: 0
        val position=player.currentPosition.coerceIn(0,duration)
        mutable.value=PlayerSnapshot(installed?.row?.id,part?.id,mode,position,duration,player.isPlaying,
            player.playbackState==Player.STATE_BUFFERING,player.playbackParameters.speed,
            timing?.timeline(mode)?.frameAt(position,reducedMotion),error,
            player.playWhenReady && error==null && player.playbackState!=Player.STATE_ENDED)
    }
    private fun persist(completed: Boolean=false) {
        val lesson=installed ?: return;val selected=part ?: return;val selectedMode=mode
        val position=player.currentPosition.coerceIn(0,selected.track(mode).durationMs)
        scope.launch { save(lesson,selected,selectedMode,position,completed) }
    }
    fun release() { player.release() }
}
