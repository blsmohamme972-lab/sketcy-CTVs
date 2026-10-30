package com.sketcy.ctvs.lesson

data class NarrationSegment(
    val id: String,
    val startMs: Long,
    val endMs: Long,
    val factIds: List<String>,
    val symbolIds: List<String> = emptyList(),
)

data class Caption(val id: String, val startMs: Long, val endMs: Long, val text: String)

enum class CameraEasing { LINEAR, EASE_IN_OUT }

/** Moves from the previous settled focus to [target] over this interval. */
data class CameraCue(
    val startMs: Long,
    val endMs: Long,
    val target: ImageRegion,
    val easing: CameraEasing = CameraEasing.EASE_IN_OUT,
)

data class PlaybackFrame(
    val positionMs: Long,
    val caption: String?,
    val segmentId: String?,
    val highlightedSymbolIds: List<String>,
    val focus: ImageRegion,
)

/**
 * Stateless timing driven by the audio player's content position, in milliseconds.
 * Sampling directly after a seek or speed change gives the same frame as normal playback.
 * This validates timing metadata; it does not decode or verify an audio asset.
 */
class PlaybackTimeline(
    val audio: NarrationTrack,
    segments: List<NarrationSegment>,
    captions: List<Caption> = emptyList(),
    cameraCues: List<CameraCue> = emptyList(),
    val initialFocus: ImageRegion = ImageRegion(0f, 0f, 1f, 1f),
) {
    // Detach from the caller's mutable authoring lists.
    val segments: List<NarrationSegment> = segments.map {
        it.copy(factIds = it.factIds.toList(), symbolIds = it.symbolIds.toList())
    }
    val captions: List<Caption> = captions.toList()
    val cameraCues: List<CameraCue> = cameraCues.toList()

    init {
        require(this.segments.isNotEmpty()) { "A timeline needs fact-linked narration segments" }
        requireUniqueIds(this.segments.map { it.id }, "segment")
        requireUniqueIds(this.captions.map { it.id }, "caption")
        requireIntervals(this.segments.map { it.startMs to it.endMs }, "segments")
        requireIntervals(this.captions.map { it.startMs to it.endMs }, "captions")
        requireIntervals(this.cameraCues.map { it.startMs to it.endMs }, "camera cues")
        this.segments.forEach {
            require(it.factIds.isNotEmpty()) { "Every segment needs at least one fact ID" }
            requireUniqueIds(it.factIds, "fact reference")
            requireUniqueIds(it.symbolIds, "symbol reference")
        }
        require(this.captions.all { it.text.isNotBlank() }) { "Captions must contain text" }
    }

    fun frameAt(positionMs: Long, reducedMotion: Boolean = false): PlaybackFrame {
        val position = positionMs.coerceIn(0L, audio.durationMs)
        val segment = segments.firstOrNull { position >= it.startMs && position < it.endMs }
        return PlaybackFrame(
            positionMs = position,
            caption = captions.firstOrNull { position >= it.startMs && position < it.endMs }?.text,
            segmentId = segment?.id,
            highlightedSymbolIds = segment?.symbolIds ?: emptyList(),
            focus = focusAt(position, reducedMotion),
        )
    }

    private fun focusAt(position: Long, reducedMotion: Boolean): ImageRegion {
        // Reduced motion keeps the initial focus static; captions/highlights still advance.
        if (reducedMotion) return initialFocus
        var previous = initialFocus
        for (cue in cameraCues) {
            if (position < cue.startMs) return previous
            if (position < cue.endMs) {
                val progress = (position - cue.startMs).toDouble() / (cue.endMs - cue.startMs)
                val amount = when (cue.easing) {
                    CameraEasing.LINEAR -> progress
                    CameraEasing.EASE_IN_OUT -> progress * progress * (3.0 - 2.0 * progress)
                }.toFloat()
                return ImageRegion(
                    blend(previous.x, cue.target.x, amount),
                    blend(previous.y, cue.target.y, amount),
                    blend(previous.width, cue.target.width, amount),
                    blend(previous.height, cue.target.height, amount),
                )
            }
            previous = cue.target
        }
        return previous
    }

    private fun requireIntervals(intervals: List<Pair<Long, Long>>, label: String) {
        var previousEnd = 0L
        intervals.forEach { (start, end) ->
            require(start >= previousEnd && end > start && end <= audio.durationMs) {
                "$label must be ordered, non-overlapping, and inside the audio duration"
            }
            previousEnd = end
        }
    }

    private fun requireUniqueIds(ids: List<String>, label: String) {
        require(ids.all { it.isNotBlank() } && ids.distinct().size == ids.size) {
            "$label IDs must be nonblank and unique"
        }
    }

    private fun blend(from: Float, to: Float, amount: Float): Float =
        (from.toDouble() + (to.toDouble() - from) * amount).toFloat()
}

data class NarrationSeek(val mode: NarrationMode, val positionMs: Long, val factId: String?)

/** Validates both narration timelines against the part's source-backed fact inventory. */
class PartPlayback(
    part: LessonPart,
    private val explanation: PlaybackTimeline,
    private val story: PlaybackTimeline,
    symbolIds: Set<String> = emptySet(),
) {
    init {
        require(explanation.audio == part.explanation && story.audio == part.story) {
            "Timelines must use this part's audio tracks"
        }
        require(symbolIds.all { it.isNotBlank() }) { "Symbol IDs must be nonblank" }
        val factIds = part.facts.map { it.id }.toSet()
        listOf(explanation, story).forEach { timeline ->
            require(timeline.segments.flatMap { it.factIds }.toSet() == factIds) {
                "Each narration mode must cover exactly the part's fact inventory"
            }
            require(timeline.segments.flatMap { it.symbolIds }.all { it in symbolIds }) {
                "Narration refers to an unknown symbol"
            }
        }
    }

    fun timeline(mode: NarrationMode): PlaybackTimeline = when (mode) {
        NarrationMode.EXPLANATION -> explanation
        NarrationMode.STORY -> story
    }

    /**
     * Matches the first fact in the active segment, even if the other mode reorders facts.
     * Gaps select the upcoming segment; after the last segment, its final position is used.
     * A repeated fact selects its first occurrence in the destination track.
     */
    fun switchMode(from: NarrationMode, to: NarrationMode, positionMs: Long): NarrationSeek {
        val source = timeline(from)
        val position = positionMs.coerceIn(0L, source.audio.durationMs)
        if (from == to) return NarrationSeek(to, position, null)
        val anchor = source.segments.firstOrNull { position < it.endMs } ?: source.segments.last()
        val factId = anchor.factIds.first()
        val target = timeline(to).segments.first { factId in it.factIds }
        val fraction = ((position - anchor.startMs).toDouble() / (anchor.endMs - anchor.startMs))
            .coerceIn(0.0, 1.0)
        val targetPosition = target.startMs + ((target.endMs - target.startMs) * fraction).toLong()
        return NarrationSeek(to, targetPosition, factId)
    }
}
