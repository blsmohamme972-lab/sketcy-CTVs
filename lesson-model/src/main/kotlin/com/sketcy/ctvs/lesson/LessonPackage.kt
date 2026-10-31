package com.sketcy.ctvs.lesson

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.MessageDigest

val PackageJson = Json { encodeDefaults = true; ignoreUnknownKeys = false; isLenient = false }

@Serializable
enum class ContentType { USER_SOURCE, TECHNICAL_DEMO, EXTERNAL_REVIEW }

@Serializable
data class SourceDocument(
    val id: String, val title: String, val sha256: String,
    val userProvided: Boolean, val excerpts: Map<String, String>,
    val externalUrl: String? = null,
)

@Serializable
data class Asset(val path: String, val mediaType: String, val bytes: Long, val sha256: String)

@Serializable
data class NarrationProvenance(
    val engine: String = "Breeze TTS 2", val backend: String = "CPU",
    val modelSha256: String, val codeCommit: String, val voiceSha256: String,
)

@Serializable
data class QualityReview(
    val sourceCoverageReviewed: Boolean = false, val audioReviewed: Boolean = false,
    val reviewer: String = "", val notes: String = "",
)

@Serializable
data class TimedSegment(
    val id: String, val startMs: Long, val endMs: Long,
    val factIds: List<String>, val symbolIds: List<String>, val text: String,
) {
    fun timing() = NarrationSegment(id, startMs, endMs, factIds, symbolIds)
}

@Serializable
data class Track(
    val assetPath: String, val durationMs: Long, val segments: List<TimedSegment>,
    val captions: List<Caption>, val cameraCues: List<CameraCue>,
) {
    fun timeline() = PlaybackTimeline(NarrationTrack(assetPath, durationMs),
        segments.map { it.timing() }, captions, cameraCues)
}

@Serializable
data class PackagePart(
    val id: String, val title: String, val objectives: List<String>,
    val illustrationPath: String, val factIds: List<String>, val explanation: Track, val story: Track,
    val scene: LayeredScene? = null,
) {
    fun track(mode: NarrationMode) = if (mode == NarrationMode.EXPLANATION) explanation else story
}

@Serializable
data class LessonSymbol(
    val id: String, val partId: String, val label: String, val meaning: String,
    val factIds: List<String>, val region: ImageRegion,
)

@Serializable
enum class QuestionType { IMAGE_RECALL, IMAGE_OCCLUSION, TAP_SYMBOL, MULTIPLE_CHOICE }

@Serializable
data class AnswerChoice(val id: String, val text: String)

@Serializable
data class ReviewQuestion(
    val id: String, val factId: String, val partId: String, val type: QuestionType,
    val prompt: String, val answer: String, val explanation: String,
    val symbolId: String? = null, val choices: List<AnswerChoice> = emptyList(),
    val correctChoiceId: String? = null,
)

@Serializable
data class LessonPackage(
    val schemaVersion: Int = 1, val lessonId: String, val revision: Int,
    val title: String, val specialty: String, val language: String = "en",
    val contentType: ContentType, val sources: List<SourceDocument>, val facts: List<Fact>,
    val parts: List<PackagePart>, val symbols: List<LessonSymbol>, val questions: List<ReviewQuestion>,
    val assets: List<Asset>, val narration: NarrationProvenance, val quality: QualityReview,
) {
    fun playback(part: PackagePart): PartPlayback = PartPlayback(
        LessonPart(part.id, part.title, part.illustrationPath,
            part.factIds.map { id -> facts.first { it.id == id } },
            NarrationTrack(part.explanation.assetPath, part.explanation.durationMs),
            NarrationTrack(part.story.assetPath, part.story.durationMs)),
        part.explanation.timeline(), part.story.timeline(),
        symbols.filter { it.partId == part.id }.map { it.id }.toSet(),
    )

    fun fingerprint(fact: Fact): String = sha256(PackageJson.encodeToString(
        fact.copy(sources = fact.sources.sortedWith(compareBy({ it.sourceId }, { it.locator }, { it.quote })))
    ).toByteArray(Charsets.UTF_8))

    fun validate() {
        require(schemaVersion in 1..2) { "Unsupported lesson schema $schemaVersion" }
        if (schemaVersion == 1) require(contentType != ContentType.EXTERNAL_REVIEW && parts.all { it.scene == null } && sources.all { it.externalUrl == null }) {
            "External review and layered scenes require schema 2"
        }
        requireId(lessonId)
        require(revision > 0 && language == "en") { "Invalid revision or language" }
        require(title.isNotBlank() && title.length <= 200 && specialty.isNotBlank()) { "Lesson needs a title and specialty" }
        require(parts.size in 1..100 && facts.size in 1..5000 && sources.size in 1..100) { "Invalid lesson size" }
        unique(sources.map { it.id }, "source")
        unique(facts.map { it.id }, "fact")
        unique(parts.map { it.id }, "part")
        unique(symbols.map { it.id }, "symbol")
        unique(questions.map { it.id }, "question")
        require(assets.size in 1..500 && assets.map { it.path.lowercase() }.distinct().size == assets.size) { "Duplicate assets" }
        sources.forEach { source ->
            require(source.title.isNotBlank() && hashPattern.matches(source.sha256)) { "Invalid source identity" }
            require(source.excerpts.isNotEmpty() && source.excerpts.all { it.key.isNotBlank() && it.value.isNotBlank() }) { "Source excerpts are required" }
            if (contentType == ContentType.USER_SOURCE) require(source.userProvided) { "Medical sources must be user supplied" }
            source.externalUrl?.let { url ->
                val uri = java.net.URI(url)
                require(url.length <= 2000 && uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null) { "Invalid external source URL" }
            }
            if (contentType == ContentType.EXTERNAL_REVIEW) require(!source.userProvided && source.externalUrl != null) {
                "Review demonstrations require explicitly external sources and HTTPS attribution"
            }
        }
        if (contentType == ContentType.USER_SOURCE) {
            require(quality.sourceCoverageReviewed && quality.audioReviewed && quality.reviewer.isNotBlank()) {
                "User-source lessons require recorded source coverage and listening review"
            }
        }
        if (contentType == ContentType.EXTERNAL_REVIEW) require(quality.notes.isNotBlank()) { "Demonstrations must record review limitations" }
        if (quality.sourceCoverageReviewed || quality.audioReviewed) require(quality.reviewer.isNotBlank()) { "Name the recorded reviewer" }
        require(narration.engine == "Breeze TTS 2" && narration.backend == "CPU") { "Breeze TTS 2 CPU provenance required" }
        require(narration.modelSha256 == STANDARD_Q8_SHA256 && hashPattern.matches(narration.voiceSha256)) { "Standard Q8_0 and voice checksums required" }
        require(Regex("[a-f0-9]{40}").matches(narration.codeCommit)) { "Exact narration code revision required" }
        val sourceMap = sources.associateBy { it.id }
        facts.forEach { fact ->
            require(fact.text.length <= 4000)
            fact.sources.forEach { reference ->
                val excerpt = sourceMap[reference.sourceId]?.excerpts?.get(reference.locator)
                require(reference.quote.isNotBlank() && excerpt?.contains(reference.quote) == true) {
                    "Fact ${fact.id} requires an exact quote at its source locator"
                }
            }
        }
        val assetMap = assets.associateBy { it.path }
        assets.forEach {
            requireSafePath(it.path)
            require(it.bytes in 1..MAX_ASSET_BYTES && hashPattern.matches(it.sha256)) { "Invalid asset size or checksum" }
            require((it.mediaType == "image/png" && it.path.startsWith("images/") && it.path.endsWith(".png")) ||
                (it.mediaType == "audio/wav" && it.path.startsWith("audio/") && it.path.endsWith(".wav"))) { "Unsupported media asset" }
        }
        val factIds = facts.map { it.id }.toSet()
        require(parts.flatMap { it.factIds }.toSet() == factIds) { "Parts must cover the complete fact inventory" }
        val referencedAssets = mutableSetOf<String>()
        parts.forEach { part ->
            require(part.title.isNotBlank() && part.objectives.isNotEmpty() && part.objectives.all { it.isNotBlank() })
            unique(part.factIds, "part fact")
            require(part.factIds.isNotEmpty() && part.factIds.all { it in factIds })
            require(assetMap[part.illustrationPath]?.mediaType == "image/png") { "Missing illustration" }
            referencedAssets += part.illustrationPath
            part.scene?.let { scene ->
                scene.validate(part, assetMap, symbols)
                referencedAssets += scene.backgroundPath
                referencedAssets += scene.layers.map { it.assetPath }
            }
            listOf(part.explanation, part.story).forEach { track ->
                require(assetMap[track.assetPath]?.mediaType == "audio/wav") { "Missing narration asset" }
                referencedAssets += track.assetPath
                require(track.segments.isNotEmpty() && track.captions.isNotEmpty() && track.cameraCues.isNotEmpty()) { "Captions and camera cues are required" }
                unique(track.segments.map { it.id }, "segment")
                unique(track.captions.map { it.id }, "caption")
                require(track.segments.all { it.text.isNotBlank() && it.text.length <= 4000 })
                require(track.segments.first().startMs == 0L && track.segments.last().endMs == track.durationMs) { "Segments must span the measured track" }
                require(track.segments.zipWithNext().all { (a,b) -> a.endMs == b.startMs }) { "Narration segments must be contiguous" }
                require(track.captions.first().startMs == 0L && track.captions.last().endMs == track.durationMs)
                require(track.captions.zipWithNext().all { (a,b) -> a.endMs == b.startMs }) { "Captions must cover the track" }
            }
            require(part.explanation.assetPath != part.story.assetPath) { "Explanation and story need separate audio" }
            playback(part)
        }
        require(referencedAssets == assetMap.keys) { "Unused or missing assets" }
        val partMap = parts.associateBy { it.id }
        val symbolMap = symbols.associateBy { it.id }
        symbols.forEach { symbol ->
            require(symbol.label.isNotBlank() && symbol.meaning.isNotBlank())
            require(symbol.factIds.isNotEmpty() && symbol.factIds.distinct().size == symbol.factIds.size)
            require(symbol.factIds.all { it in (partMap[symbol.partId]?.factIds ?: emptyList()) }) { "Symbol refers outside its part" }
        }
        require(questions.size in 1..20000)
        questions.forEach { q ->
            require(q.factId in (partMap[q.partId]?.factIds ?: emptyList())) { "Unknown question fact" }
            require(q.prompt.isNotBlank() && q.answer.isNotBlank() && q.explanation.isNotBlank())
            q.symbolId?.let { id -> require(symbolMap[id]?.let { it.partId == q.partId && q.factId in it.factIds } == true) { "Unknown or unrelated question symbol" } }
            when (q.type) {
                QuestionType.MULTIPLE_CHOICE -> {
                    unique(q.choices.map { it.id }, "choice")
                    require(q.choices.size in 2..6 && q.choices.all { it.text.isNotBlank() })
                    require(q.choices.count { it.id == q.correctChoiceId } == 1) { "One correct choice required" }
                }
                QuestionType.IMAGE_OCCLUSION, QuestionType.TAP_SYMBOL -> require(q.symbolId != null)
                QuestionType.IMAGE_RECALL -> Unit
            }
        }
        facts.forEach { fact ->
            require(questions.any { it.factId == fact.id && it.type == QuestionType.IMAGE_RECALL }) { "Every fact needs initial image recall" }
        }
    }
}

const val STANDARD_Q8_SHA256 = "a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879"
const val MAX_ASSET_BYTES = 32L * 1024 * 1024
val hashPattern = Regex("[a-f0-9]{64}")
private val idPattern = Regex("[A-Za-z0-9][A-Za-z0-9_-]{0,79}")
fun requireId(id: String) = require(idPattern.matches(id)) { "Invalid stable ID" }
fun unique(ids: List<String>, label: String) {
    ids.forEach(::requireId)
    require(ids.distinct().size == ids.size) { "Duplicate $label ID" }
}
fun requireSafePath(path: String) {
    require(path.length <= 180 && Regex("[A-Za-z0-9_-]+(/[A-Za-z0-9_.-]+)+").matches(path)) { "Invalid asset path" }
    require(path.split('/').none { it == "." || it == ".." || it.startsWith('.') }) { "Unsafe asset path" }
}
fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
