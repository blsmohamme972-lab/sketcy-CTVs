package com.sketcy.ctvs.lesson

import kotlinx.serialization.json.*
import kotlin.test.*

class FsrsSchedulerTest {
    @Test fun `matches all 24 independently generated py-fsrs reference steps`() {
        val fixture=javaClass.getResource("/fsrs-reference.json")!!.readText()
        val root=PackageJson.parseToJsonElement(fixture).jsonObject
        assertEquals("9446cb06605c597a063aeee49f7d188d42e34dc2",root.getValue("referenceCommit").jsonPrimitive.content)
        var group="";var card=MemoryState();var checked=0
        root.getValue("vectors").jsonArray.forEach { value ->
            val row=value.jsonObject
            val sequence=row.getValue("sequence").toString()
            if(sequence!=group){group=sequence;card=MemoryState()}
            val now=row.getValue("nowMs").jsonPrimitive.long
            card=FsrsScheduler().review(card,Rating.entries[row.getValue("grade").jsonPrimitive.int-1],now)
            assertEquals(row.getValue("phase").jsonPrimitive.content,card.phase.name)
            assertEquals(row.getValue("step").jsonPrimitive.intOrNull,card.step)
            assertEquals(row.getValue("stability").jsonPrimitive.double,card.stability!!,1e-10)
            assertEquals(row.getValue("difficulty").jsonPrimitive.double,card.difficulty!!,1e-10)
            assertEquals(row.getValue("dueMs").jsonPrimitive.long,card.dueMs)
            checked++
        }
        assertEquals(24,checked)
    }
    @Test fun `incorrect objective answer cannot become a passing rating`() {
        Rating.entries.forEach {assertEquals(Rating.AGAIN,ReviewSelection.effectiveRating(it,false))}
        assertEquals(Rating.EASY,ReviewSelection.effectiveRating(Rating.EASY,true))
        assertEquals(Rating.GOOD,ReviewSelection.effectiveRating(Rating.GOOD,null))
    }
    @Test fun `higher desired retention schedules a shorter interval`() {
        val now=1_000_000L
        assertTrue(FsrsScheduler(.95).review(MemoryState(),Rating.EASY,now).dueMs <
            FsrsScheduler(.85).review(MemoryState(),Rating.EASY,now).dueMs)
    }
    @Test fun `lapse enters relearning and keeps a per-fact history count`() {
        val learned=FsrsScheduler().review(MemoryState(),Rating.EASY,0)
        val lapse=FsrsScheduler().review(learned,Rating.AGAIN,learned.dueMs)
        assertEquals(MemoryPhase.RELEARNING,lapse.phase);assertEquals(1,lapse.lapses);assertEquals(2,lapse.reviews)
        assertEquals(learned.dueMs+600_000,lapse.dueMs)
        val recovered=FsrsScheduler().review(lapse,Rating.GOOD,lapse.dueMs)
        assertEquals(MemoryPhase.REVIEW,recovered.phase)
    }
    @Test fun `clock rollback and impossible memory states are rejected`() {
        val card=FsrsScheduler().review(MemoryState(),Rating.GOOD,1000)
        assertFailsWith<IllegalArgumentException>{FsrsScheduler().review(card,Rating.GOOD,999)}
        assertFailsWith<IllegalArgumentException>{MemoryState(stability=Double.NaN,difficulty=2.0).validate()}
        assertFailsWith<IllegalArgumentException>{MemoryState(phase=MemoryPhase.REVIEW).validate()}
        assertFailsWith<IllegalArgumentException>{FsrsScheduler(Double.NaN)}
    }
    @Test fun `learning begins with image recall then rotates all eligible types`() {
        val questions=QuestionType.entries.map {ReviewQuestion(it.name,"f","p",it,"Question","Answer","Evidence","s")}
        var state=MemoryState()
        assertEquals(QuestionType.IMAGE_RECALL,ReviewSelection.choose(questions,"f",state,null).type)
        state=FsrsScheduler().review(state,Rating.EASY,0)
        var previous=QuestionType.IMAGE_RECALL
        listOf(QuestionType.IMAGE_OCCLUSION,QuestionType.TAP_SYMBOL,QuestionType.MULTIPLE_CHOICE,QuestionType.IMAGE_RECALL).forEach {
            assertEquals(it,ReviewSelection.choose(questions,"f",state,previous).type);previous=it
        }
        val lapse=FsrsScheduler().review(state,Rating.AGAIN,state.dueMs)
        assertEquals(QuestionType.IMAGE_RECALL,ReviewSelection.choose(questions,"f",lapse,previous).type)
    }
}
