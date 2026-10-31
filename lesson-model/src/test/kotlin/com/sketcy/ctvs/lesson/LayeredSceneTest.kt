package com.sketcy.ctvs.lesson

import kotlin.test.*

class LayeredSceneTest {
    private val layer=SceneLayer("object","images/object.png",ImageRegion(.2f,.3f,.3f,.4f),
        explanation=listOf(LayerKeyframe(2000,dx=.08f,scale=1.1f,rotation=4f),LayerKeyframe(4000)),
        story=listOf(LayerKeyframe(0,dy=.02f),LayerKeyframe(1000,dy=-.02f)))

    @Test fun `omitted zero key starts at base and uses smooth interpolation`() {
        assertEquals(LayerPose(),layer.pose(NarrationMode.EXPLANATION,-100))
        assertEquals(.04f,layer.pose(NarrationMode.EXPLANATION,1000).dx,.00001f)
        assertEquals(1.05f,layer.pose(NarrationMode.EXPLANATION,1000).scale,.00001f)
        assertEquals(2f,layer.pose(NarrationMode.EXPLANATION,1000).rotation,.00001f)
    }
    @Test fun `backward seek recomputes from the media position`() {
        val expected=layer.pose(NarrationMode.EXPLANATION,500)
        layer.pose(NarrationMode.EXPLANATION,3500)
        assertEquals(expected,layer.pose(NarrationMode.EXPLANATION,500))
    }
    @Test fun `each narration selects its own keys at shared fact positions`() {
        assertEquals(.02f,layer.pose(NarrationMode.STORY,0).dy)
        assertEquals(0f,layer.pose(NarrationMode.EXPLANATION,0).dy)
        assertEquals(-.02f,layer.pose(NarrationMode.STORY,5000).dy)
        assertEquals(LayerPose(),layer.pose(NarrationMode.EXPLANATION,5000))
    }
    @Test fun `reduced motion always gives the base composition including nonzero first keys`() {
        for(mode in NarrationMode.entries)for(time in listOf(0L,500L,2000L,9000L))
            assertEquals(LayerPose(),layer.pose(mode,time,true))
    }
}
