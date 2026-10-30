package com.sketcy.ctvs.lesson

import kotlinx.serialization.Serializable
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** FSRS-6 Kotlin port of the pinned Open Spaced Repetition reference; see THIRD_PARTY.md. */
@Serializable
enum class Rating(val grade: Int) { AGAIN(1), HARD(2), GOOD(3), EASY(4) }
@Serializable
enum class MemoryPhase { LEARNING, REVIEW, RELEARNING }

@Serializable
data class MemoryState(
    val phase: MemoryPhase = MemoryPhase.LEARNING, val step: Int? = 0,
    val stability: Double? = null, val difficulty: Double? = null,
    val lastReviewMs: Long? = null, val dueMs: Long = 0,
    val reviews: Int = 0, val lapses: Int = 0,
) {
    fun validate() {
        require(dueMs >= 0 && reviews >= 0 && lapses in 0..reviews)
        require(stability == null || stability.isFinite() && stability >= 0.001)
        require(difficulty == null || difficulty.isFinite() && difficulty in 1.0..10.0)
        require((stability == null) == (difficulty == null))
        require(lastReviewMs == null || lastReviewMs >= 0)
        if (reviews == 0) require(stability == null && lastReviewMs == null && phase == MemoryPhase.LEARNING && step == 0)
        else require(stability != null && lastReviewMs != null && dueMs >= lastReviewMs)
        if (phase == MemoryPhase.REVIEW) require(step == null && stability != null && lastReviewMs != null)
        else require(step != null && step in 0..if (phase == MemoryPhase.LEARNING) 1 else 0)
    }
}

/** Deterministic scheduling: fixed 1/10 minute learning, 10 minute relearning, no fuzz. */
class FsrsScheduler(private val retention: Double = 0.9) {
    init { require(retention.isFinite() && retention in 0.7..0.99) }
    private val w = doubleArrayOf(0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,
        1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542)
    private val decay = -w[20]
    private val factor = 0.9.pow(1.0 / decay) - 1.0

    fun retrievability(card: MemoryState, nowMs: Long): Double {
        if (card.lastReviewMs == null || card.stability == null) return 0.0
        val elapsed = max(0L, nowMs - card.lastReviewMs) / DAY_MS
        return (1 + factor * elapsed / card.stability).pow(decay)
    }

    fun review(card: MemoryState, rating: Rating, nowMs: Long): MemoryState {
        card.validate()
        require(nowMs >= 0 && (card.lastReviewMs == null || nowMs >= card.lastReviewMs)) { "Review clock is earlier than the previous review" }
        val grade = rating.grade
        val elapsedDays = card.lastReviewMs?.let { (nowMs - it) / DAY_MS }
        val stability: Double
        val difficulty: Double
        if (card.stability == null || card.difficulty == null) {
            stability = max(w[grade-1], 0.001)
            difficulty = initialDifficulty(grade).coerceIn(1.0,10.0)
        } else {
            val s = card.stability; val d = card.difficulty
            stability = if (elapsedDays != null && elapsedDays < 1) {
                var increase = exp(w[17] * (grade - 3 + w[18])) * s.pow(-w[19])
                if (rating != Rating.AGAIN) increase = max(increase,1.0)
                max(s * increase,0.001)
            } else {
                val r = retrievability(card,nowMs)
                val next = if (rating == Rating.AGAIN) {
                    min(w[11] * d.pow(-w[12]) * ((s+1).pow(w[13])-1) * exp((1-r)*w[14]),
                        s / exp(w[17]*w[18]))
                } else {
                    val hard = if (rating == Rating.HARD) w[15] else 1.0
                    val easy = if (rating == Rating.EASY) w[16] else 1.0
                    s * (1 + exp(w[8]) * (11-d) * s.pow(-w[9]) * (exp((1-r)*w[10])-1) * hard * easy)
                }
                max(next,0.001)
            }
            difficulty = (w[7]*initialDifficulty(4) + (1-w[7]) *
                (d + (10-d) * (-w[6]*(grade-3)) / 9)).coerceIn(1.0,10.0)
        }
        var phase = card.phase
        var step = card.step
        val intervalMs = if (phase == MemoryPhase.REVIEW) {
            if (rating == Rating.AGAIN) { phase = MemoryPhase.RELEARNING; step = 0; 600_000L }
            else interval(stability) * DAY_MS
        } else {
            val steps = if (phase == MemoryPhase.LEARNING) longArrayOf(60_000,600_000) else longArrayOf(600_000)
            when (rating) {
                Rating.AGAIN -> { step = 0; steps[0] }
                Rating.HARD -> if (step == 0) {
                    if (steps.size == 1) steps[0]*3/2 else (steps[0]+steps[1])/2
                } else steps[requireNotNull(step)]
                Rating.GOOD -> if (requireNotNull(step) + 1 >= steps.size) {
                    phase = MemoryPhase.REVIEW; step = null; interval(stability)*DAY_MS
                } else { step = step + 1; steps[step] }
                Rating.EASY -> { phase = MemoryPhase.REVIEW; step = null; interval(stability)*DAY_MS }
            }
        }
        return MemoryState(phase,step,stability,difficulty,nowMs,Math.addExact(nowMs,intervalMs),
            card.reviews+1,card.lapses + if (card.phase == MemoryPhase.REVIEW && rating == Rating.AGAIN) 1 else 0)
            .also { it.validate() }
    }

    fun previews(card: MemoryState, nowMs: Long) = Rating.entries.associateWith { review(card,it,nowMs) }
    private fun initialDifficulty(grade: Int) = w[4] - exp(w[5]*(grade-1)) + 1
    private fun interval(stability: Double): Long = Math.rint(stability/factor*(retention.pow(1/decay)-1)).toLong().coerceIn(1,36500)
    companion object { const val DAY_MS = 86_400_000L }
}

object ReviewSelection {
    fun choose(questions: List<ReviewQuestion>, factId: String, card: MemoryState, previousType: QuestionType?): ReviewQuestion {
        val available = questions.filter { it.factId == factId }.sortedBy { it.id }
        require(available.isNotEmpty())
        if (card.reviews == 0 || card.phase != MemoryPhase.REVIEW) return available.first { it.type == QuestionType.IMAGE_RECALL }
        val variants = QuestionType.entries.filter { type -> available.any { it.type == type } }
        val next = variants[(variants.indexOf(previousType) + 1).mod(variants.size)]
        val sameType = available.filter { it.type == next }
        return sameType[card.reviews.mod(sameType.size)]
    }
    fun effectiveRating(requested: Rating, objectivelyCorrect: Boolean?): Rating =
        if (objectivelyCorrect == false) Rating.AGAIN else requested
}
