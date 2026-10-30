package com.sketcy.ctvs.lesson

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PlaybackTimelineTest {
    private val full = ImageRegion(0f, 0f, 1f, 1f)
    private val detail = ImageRegion(0.5f, 0.25f, 0.25f, 0.5f)
    private val audio = NarrationTrack("explanation.wav", 60_000)
    private val segments = listOf(
        NarrationSegment("first", 0, 20_000, listOf("fact-a"), listOf("symbol-a")),
        NarrationSegment("second", 30_000, 60_000, listOf("fact-b")),
    )

    @Test fun `captions and highlights use exclusive ends and clear in gaps`() {
        val timeline = PlaybackTimeline(audio, segments, listOf(
            Caption("a", 0, 10_000, "Synthetic caption A"),
            Caption("b", 10_000, 20_000, "Synthetic caption B"),
        ))
        assertEquals("Synthetic caption A", timeline.frameAt(9_999).caption)
        assertEquals("Synthetic caption B", timeline.frameAt(10_000).caption)
        assertEquals(listOf("symbol-a"), timeline.frameAt(19_999).highlightedSymbolIds)
        assertNull(timeline.frameAt(20_000).caption)
        assertNull(timeline.frameAt(20_000).segmentId)
        assertEquals(emptyList(), timeline.frameAt(20_000).highlightedSymbolIds)
        assertEquals("second", timeline.frameAt(30_000).segmentId)
        assertNull(timeline.frameAt(60_000).segmentId)
    }

    @Test fun `player positions clamp safely including extreme values`() {
        val timeline = PlaybackTimeline(audio, segments)
        assertEquals(timeline.frameAt(0), timeline.frameAt(Long.MIN_VALUE))
        assertEquals(timeline.frameAt(60_000), timeline.frameAt(Long.MAX_VALUE))
    }

    @Test fun `camera holds between cues and interpolates from the last focus`() {
        val timeline = PlaybackTimeline(audio, segments, cameraCues = listOf(
            CameraCue(10_000, 20_000, detail, CameraEasing.LINEAR),
            CameraCue(30_000, 40_000, full, CameraEasing.LINEAR),
        ))
        assertEquals(full, timeline.frameAt(9_999).focus)
        assertEquals(full, timeline.frameAt(10_000).focus)
        assertEquals(ImageRegion(0.25f, 0.125f, 0.625f, 0.75f), timeline.frameAt(15_000).focus)
        assertEquals(detail, timeline.frameAt(20_000).focus)
        assertEquals(detail, timeline.frameAt(29_999).focus)
        assertEquals(ImageRegion(0.25f, 0.125f, 0.625f, 0.75f), timeline.frameAt(35_000).focus)
        assertEquals(full, timeline.frameAt(60_000).focus)
    }

    @Test fun `smooth easing starts slower than linear motion and lands exactly`() {
        val timeline = PlaybackTimeline(audio, segments, cameraCues = listOf(CameraCue(0, 20_000, detail)))
        assertEquals(0.078125f, timeline.frameAt(5_000).focus.x)
        assertEquals(0.25f, timeline.frameAt(10_000).focus.x)
        assertEquals(detail, timeline.frameAt(20_000).focus)
    }

    @Test fun `backward seeks and changed sampling frequency do not accumulate drift`() {
        val timeline = PlaybackTimeline(audio, segments, cameraCues = listOf(CameraCue(0, 40_000, detail)))
        val reference = timeline.frameAt(15_000)
        // A faster player changes the sequence of content positions, not the timing formula.
        listOf(0L, 500, 30_000, 60_000, 20_000, 1_000).forEach { timeline.frameAt(it) }
        assertEquals(reference, timeline.frameAt(15_000))
    }

    @Test fun `reduced motion keeps the initial focus while captions and highlights advance`() {
        val timeline = PlaybackTimeline(audio, segments,
            captions = listOf(Caption("a", 0, 20_000, "Synthetic caption")),
            cameraCues = listOf(CameraCue(0, 10_000, detail)))
        val frame = timeline.frameAt(15_000, reducedMotion = true)
        assertEquals(full, frame.focus)
        assertEquals("Synthetic caption", frame.caption)
        assertEquals(listOf("symbol-a"), frame.highlightedSymbolIds)
        assertEquals(detail, timeline.frameAt(15_000).focus)
    }

    @Test fun `invalid and overlapping timing is rejected before playback`() {
        for ((start, end) in listOf(-1L to 10L, 0L to 0L, 20L to 10L, 0L to 60_001L)) {
            assertFailsWith<IllegalArgumentException> {
                PlaybackTimeline(audio, listOf(segments.first().copy(startMs = start, endMs = end)))
            }
        }
        assertFailsWith<IllegalArgumentException> { PlaybackTimeline(audio, segments.reversed()) }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, segments, listOf(Caption("a", 0, 20, "A"), Caption("b", 10, 30, "B")))
        }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, segments, cameraCues = listOf(CameraCue(0, 20, detail), CameraCue(10, 30, full)))
        }
    }

    @Test fun `missing or ambiguous metadata is rejected`() {
        assertFailsWith<IllegalArgumentException> { PlaybackTimeline(audio, emptyList()) }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, listOf(segments.first().copy(factIds = emptyList())))
        }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, listOf(segments.first().copy(factIds = listOf("fact-a", "fact-a"))))
        }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, listOf(segments.first(), segments.last().copy(id = "first")))
        }
        assertFailsWith<IllegalArgumentException> {
            PlaybackTimeline(audio, segments, listOf(Caption("a", 0, 20, " ")))
        }
    }

    @Test fun `caller changes to authoring lists cannot change a built timeline`() {
        val factIds = mutableListOf("fact-a")
        val authored = mutableListOf(segments.first().copy(factIds = factIds))
        val timeline = PlaybackTimeline(audio, authored)
        authored.clear()
        factIds.clear()
        assertEquals(listOf("fact-a"), timeline.segments.single().factIds)
        assertEquals("first", timeline.frameAt(0).segmentId)
    }

    @Test fun `camera focus stays in image bounds across edge touching cues`() {
        val timeline = PlaybackTimeline(audio, segments, cameraCues = listOf(
            CameraCue(0, 20_000, ImageRegion(0.8f, 0.8f, 0.2f, 0.2f)),
            CameraCue(20_000, 40_000, ImageRegion(0f, 0f, 0.1f, 0.1f)),
            CameraCue(40_000, 60_000, full),
        ))
        for (position in 0L..60_000L step 37) {
            val focus = timeline.frameAt(position).focus
            assertTrue(focus.x + focus.width <= 1f && focus.y + focus.height <= 1f)
        }
    }
}
