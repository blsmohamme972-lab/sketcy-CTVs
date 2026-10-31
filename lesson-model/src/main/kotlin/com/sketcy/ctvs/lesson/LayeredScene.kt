package com.sketcy.ctvs.lesson

import kotlinx.serialization.Serializable

/** Schema 2: static background plus independently animated transparent objects.
 * Coordinates and translations are fractions of the complete scene, not of a sprite.
 * Sample only from the media clock; no accumulated animation state survives a seek.
 */
@Serializable
data class LayerKeyframe(
    val atMs: Long, val dx: Float = 0f, val dy: Float = 0f,
    val scale: Float = 1f, val rotation: Float = 0f,
)

data class LayerPose(val dx: Float = 0f, val dy: Float = 0f, val scale: Float = 1f, val rotation: Float = 0f)

@Serializable
data class SceneLayer(
    val id: String, val assetPath: String, val region: ImageRegion,
    val symbolId: String? = null,
    val pivotX: Float = .5f, val pivotY: Float = .5f,
    val explanation: List<LayerKeyframe> = emptyList(),
    val story: List<LayerKeyframe> = emptyList(),
) {
    fun pose(mode: NarrationMode, positionMs: Long, reducedMotion: Boolean = false): LayerPose {
        if (reducedMotion) return LayerPose()
        val keys = if (mode == NarrationMode.EXPLANATION) explanation else story
        if (keys.isEmpty()) return LayerPose()
        val time = positionMs.coerceAtLeast(0)
        var previous = LayerKeyframe(0)
        for (next in keys) {
            if (time < next.atMs) {
                val fraction = (time - previous.atMs).toFloat() / (next.atMs - previous.atMs)
                val t = fraction * fraction * (3f - 2f * fraction)
                fun mix(a: Float, b: Float) = a + (b - a) * t
                return LayerPose(mix(previous.dx, next.dx), mix(previous.dy, next.dy),
                    mix(previous.scale, next.scale), mix(previous.rotation, next.rotation))
            }
            previous = next
        }
        return LayerPose(previous.dx, previous.dy, previous.scale, previous.rotation)
    }
}

@Serializable
data class LayeredScene(
    val width: Int, val height: Int, val backgroundPath: String, val layers: List<SceneLayer>,
) {
    fun validate(part: PackagePart, assets: Map<String, Asset>, symbols: List<LessonSymbol>) {
        require(width in 64..4096 && height in 64..4096 && width.toLong() * height <= 4_194_304) { "Invalid scene size" }
        require(layers.size in 1..16) { "A scene needs 1–16 independent layers" }
        unique(layers.map { it.id }, "scene layer")
        val paths = listOf(backgroundPath) + layers.map { it.assetPath }
        require(paths.distinct().size == paths.size && part.illustrationPath !in paths) { "Use separate background, layers and thumbnail" }
        require(paths.all { assets[it]?.mediaType == "image/png" }) { "Missing scene PNG" }
        val linked = layers.mapNotNull { it.symbolId }
        require(linked.distinct().size == linked.size) { "A symbol belongs to only one moving layer" }
        require(linked.all { id -> symbols.any { it.id == id && it.partId == part.id } }) { "Unknown scene symbol" }
        layers.forEach { layer ->
            require(layer.pivotX.isFinite() && layer.pivotY.isFinite() && layer.pivotX in 0f..1f && layer.pivotY in 0f..1f) { "Invalid layer pivot" }
            layer.symbolId?.let { id ->
                val r = symbols.first { it.id == id }.region
                val b = layer.region
                require(r.x >= b.x - .0001f && r.y >= b.y - .0001f && r.x + r.width <= b.x + b.width + .0001f && r.y + r.height <= b.y + b.height + .0001f) { "Moving symbol must fit its layer" }
            }
            listOf(layer.explanation to part.explanation.durationMs, layer.story to part.story.durationMs).forEach { (keys, duration) ->
                require(keys.size <= 100 && keys.zipWithNext().all { (a, b) -> a.atMs < b.atMs }) { "Keyframes must be ordered and unique" }
                keys.forEach { key ->
                    require(key.atMs in 0..duration) { "Layer keyframe outside measured track" }
                    require(listOf(key.dx, key.dy, key.scale, key.rotation).all { it.isFinite() }) { "Nonfinite layer transform" }
                    require(key.dx in -0.1f..0.1f && key.dy in -0.1f..0.1f && key.scale in .9f..1.12f && key.rotation in -10f..10f) { "Layer motion must remain gentle" }
                }
            }
        }
    }
}
