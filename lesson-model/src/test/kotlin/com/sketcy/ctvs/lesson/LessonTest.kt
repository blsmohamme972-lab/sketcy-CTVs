package com.sketcy.ctvs.lesson

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class LessonTest {
    @Test fun `duration accepts both endpoints and rejects values outside them`() {
        for (duration in listOf(60_000L, 240_000L)) {
            assertEquals(duration, NarrationTrack("audio.wav", duration).durationMs)
        }
        for (duration in listOf(-1L, 0L, 59_999L, 240_001L)) {
            assertFailsWith<IllegalArgumentException> { NarrationTrack("audio.wav", duration) }
        }
    }

    @Test fun `regions reject nonfinite empty and overflowing bounds`() {
        ImageRegion(0f, 0f, 1f, 1f)
        ImageRegion(0.5f, 0.5f, 0.5f, 0.5f)
        ImageRegion(0.8f, 0.8f, 0.2f, 0.2f)
        for (region in listOf(
            listOf(Float.NaN, 0f, 1f, 1f),
            listOf(0f, 0f, Float.POSITIVE_INFINITY, 1f),
            listOf(-0.1f, 0f, 0.5f, 0.5f),
            listOf(0f, 0f, 0f, 1f),
            listOf(0.8f, 0f, 0.5f, 1f),
            listOf(0f, 0.8f, 1f, 0.5f),
        )) {
            assertFailsWith<IllegalArgumentException> {
                ImageRegion(region[0], region[1], region[2], region[3])
            }
        }
    }

    @Test fun `facts require source provenance`() {
        assertFailsWith<IllegalArgumentException> { Fact("fact-1", "Test text", emptyList()) }
        assertFailsWith<IllegalArgumentException> { SourceReference("source-1", " ") }
    }

    @Test fun `parts keep explanation and story tracks distinct`() {
        val explanation = NarrationTrack("explanation.wav", 60_000)
        val story = NarrationTrack("story.wav", 120_000)
        val part = LessonPart("part-1", "Test part", "image.png", listOf(fact()), explanation, story)
        assertEquals(explanation, part.track(NarrationMode.EXPLANATION))
        assertEquals(story, part.track(NarrationMode.STORY))
    }

    @Test fun `parts reject duplicate fact identifiers`() {
        assertFailsWith<IllegalArgumentException> {
            LessonPart("part-1", "Test part", "image.png", listOf(fact(), fact()),
                NarrationTrack("explanation.wav", 60_000), NarrationTrack("story.wav", 60_000))
        }
    }

    private fun fact() = Fact("fact-1", "Synthetic test text; not medical content",
        listOf(SourceReference("test-source", "passage 1")))
}
