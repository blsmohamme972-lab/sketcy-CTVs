package com.sketcy.ctvs.lesson

/** Foundation types, not a ZIP parser or a complete package validator. */
enum class NarrationMode { EXPLANATION, STORY }

/** Coordinates relative to the image, with the origin at the top left. */
data class ImageRegion(val x: Float, val y: Float, val width: Float, val height: Float) {
    init {
        require(listOf(x, y, width, height).all { it.isFinite() }) { "Coordinates must be finite" }
        require(x >= 0f && y >= 0f && width > 0f && height > 0f) { "Invalid image region" }
        require(x + width <= 1f && y + height <= 1f) {
            "Image region must fit inside the image"
        }
    }
}

/** A page, table, figure label, or passage in material supplied by the learner. */
data class SourceReference(val sourceId: String, val locator: String) {
    init {
        require(sourceId.isNotBlank() && locator.isNotBlank()) { "Source and locator are required" }
    }
}

data class Fact(val id: String, val text: String, val sources: List<SourceReference>) {
    init {
        require(id.isNotBlank() && text.isNotBlank()) { "Fact ID and text are required" }
        require(sources.isNotEmpty()) { "Every fact must refer to supplied material" }
    }
}

data class NarrationTrack(val assetPath: String, val durationMs: Long) {
    init {
        require(assetPath.isNotBlank()) { "Audio asset path is required" }
        require(durationMs in 60_000L..240_000L) { "Narration must last 1–4 minutes" }
    }
}

data class LessonPart(
    val id: String,
    val title: String,
    val illustrationPath: String,
    val facts: List<Fact>,
    val explanation: NarrationTrack,
    val story: NarrationTrack,
) {
    init {
        require(id.isNotBlank() && title.isNotBlank() && illustrationPath.isNotBlank())
        require(facts.isNotEmpty()) { "A part must contain source-backed facts" }
        require(facts.map { it.id }.distinct().size == facts.size) { "Duplicate fact ID in part" }
    }

    fun track(mode: NarrationMode): NarrationTrack = when (mode) {
        NarrationMode.EXPLANATION -> explanation
        NarrationMode.STORY -> story
    }
}
