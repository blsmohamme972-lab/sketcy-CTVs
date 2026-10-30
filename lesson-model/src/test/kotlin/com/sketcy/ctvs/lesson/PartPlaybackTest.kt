package com.sketcy.ctvs.lesson

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PartPlaybackTest {
    private val explanation = NarrationTrack("explanation.wav", 60_000)
    private val story = NarrationTrack("story.wav", 120_000)
    private val part = LessonPart("part", "Synthetic test part", "image.png",
        listOf("fact-a", "fact-b").map { Fact(it, "Synthetic text", listOf(SourceReference("source", "passage 1"))) },
        explanation, story)
    private val explanationSegments = listOf(
        NarrationSegment("explain-a", 0, 20_000, listOf("fact-a")),
        NarrationSegment("explain-b", 30_000, 60_000, listOf("fact-b")),
    )
    private val storySegments = listOf(
        NarrationSegment("story-b", 0, 60_000, listOf("fact-b")),
        NarrationSegment("story-a", 60_000, 120_000, listOf("fact-a")),
    )
    private fun playback() = PartPlayback(part,
        PlaybackTimeline(explanation, explanationSegments), PlaybackTimeline(story, storySegments))

    @Test fun `switching follows the same fact when the story reorders facts`() {
        val result = playback().switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, 10_000)
        assertEquals(NarrationSeek(NarrationMode.STORY, 90_000, "fact-a"), result)
        assertEquals(NarrationSeek(NarrationMode.EXPLANATION, 10_000, "fact-a"),
            playback().switchMode(NarrationMode.STORY, NarrationMode.EXPLANATION, result.positionMs))
    }

    @Test fun `switching from a gap uses the upcoming fact and from the end uses the final fact`() {
        val playback = playback()
        assertEquals(0L, playback.switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, 25_000).positionMs)
        assertEquals(0L, playback.switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, 20_000).positionMs)
        assertEquals(60_000L, playback.switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, Long.MAX_VALUE).positionMs)
        assertEquals(60_000L, playback.switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, Long.MIN_VALUE).positionMs)
    }

    @Test fun `choosing the current mode preserves its position`() {
        assertEquals(NarrationSeek(NarrationMode.STORY, 90_000, null),
            playback().switchMode(NarrationMode.STORY, NarrationMode.STORY, 90_000))
    }

    @Test fun `a repeated fact selects the first destination occurrence`() {
        val repeated = PlaybackTimeline(story, listOf(
            NarrationSegment("story-a-1", 0, 20_000, listOf("fact-a")),
            NarrationSegment("story-b", 20_000, 40_000, listOf("fact-b")),
            NarrationSegment("story-a-2", 40_000, 120_000, listOf("fact-a")),
        ))
        val playback = PartPlayback(part, PlaybackTimeline(explanation, explanationSegments), repeated)
        assertEquals(10_000L, playback.switchMode(NarrationMode.EXPLANATION, NarrationMode.STORY, 10_000).positionMs)
    }

    @Test fun `each mode must cover the inventory without introducing unknown facts`() {
        val invalidInventories = listOf(
            listOf(storySegments.first()),
            storySegments.map { it.copy(factIds = listOf("unknown")) },
        )
        for (segments in invalidInventories) {
            assertFailsWith<IllegalArgumentException> {
                PartPlayback(part, PlaybackTimeline(explanation, explanationSegments), PlaybackTimeline(story, segments))
            }
        }
    }

    @Test fun `mismatched audio and unknown symbols fail before mode switching`() {
        assertFailsWith<IllegalArgumentException> {
            PartPlayback(part, PlaybackTimeline(explanation.copy(assetPath = "wrong.wav"), explanationSegments),
                PlaybackTimeline(story, storySegments))
        }
        val withSymbol = PlaybackTimeline(explanation, explanationSegments.map { it.copy(symbolIds = listOf("symbol-a")) })
        assertFailsWith<IllegalArgumentException> { PartPlayback(part, withSymbol, PlaybackTimeline(story, storySegments)) }
        PartPlayback(part, withSymbol, PlaybackTimeline(story, storySegments), setOf("symbol-a"))
    }
}
