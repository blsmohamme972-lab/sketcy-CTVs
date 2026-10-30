package com.sketcy.ctvs.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/** Original small vectors for this interface; avoid shipping thousands of unused icons. */
object StudyIcons {
    val AutoStories by lazy { outline("Open book") {
        moveTo(3f,4f);lineTo(7f,4f);curveTo(9f,4f,10.5f,4.5f,12f,6f)
        curveTo(13.5f,4.5f,15f,4f,17f,4f);lineTo(21f,4f);lineTo(21f,19f)
        lineTo(17f,19f);curveTo(15f,19f,13.5f,19.5f,12f,21f)
        curveTo(10.5f,19.5f,9f,19f,7f,19f);lineTo(3f,19f);close()
        moveTo(12f,6f);lineTo(12f,21f)
    } }
    val Style by lazy { outline("Review cards") {
        moveTo(7f,4f);lineTo(18f,2f);lineTo(22f,17f);lineTo(19f,18f)
        moveTo(3f,7f);lineTo(17f,7f);lineTo(17f,22f);lineTo(3f,22f);close()
        moveTo(7f,12f);lineTo(13f,12f);moveTo(7f,17f);lineTo(11f,17f)
    } }
    val Tune by lazy { outline("Preferences") {
        moveTo(5f,3f);lineTo(5f,7f);circle(5f,9f,2f);moveTo(5f,11f);lineTo(5f,21f)
        moveTo(12f,3f);lineTo(12f,13f);circle(12f,15f,2f);moveTo(12f,17f);lineTo(12f,21f)
        moveTo(19f,3f);lineTo(19f,7f);circle(19f,9f,2f);moveTo(19f,11f);lineTo(19f,21f)
    } }
    val BookmarkBorder by lazy { outline("Bookmark") { bookmark() } }
    val Bookmark by lazy { ImageVector.Builder("Saved bookmark",24.dp,24.dp,24f,24f).apply {
        path(fill=SolidColor(Color.Black)){bookmark()}
    }.build() }
    val DeleteOutline by lazy { outline("Remove") {
        moveTo(6f,7f);lineTo(7f,21f);lineTo(17f,21f);lineTo(18f,7f)
        moveTo(4f,7f);lineTo(20f,7f);moveTo(9f,7f);lineTo(9f,3f);lineTo(15f,3f);lineTo(15f,7f)
        moveTo(10f,11f);lineTo(10f,17f);moveTo(14f,11f);lineTo(14f,17f)
    } }
    val CheckCircleOutline by lazy { outline("Complete") {
        circle(12f,12f,9f);moveTo(7f,12f);lineTo(10.5f,15.5f);lineTo(17f,8.5f)
    } }
    val FileUpload by lazy { outline("Export") {
        moveTo(12f,16f);lineTo(12f,3f);moveTo(7f,8f);lineTo(12f,3f);lineTo(17f,8f)
        moveTo(3f,16f);lineTo(3f,21f);lineTo(21f,21f);lineTo(21f,16f)
    } }
    val Fullscreen by lazy { outline("Fullscreen") {
        moveTo(3f,8f);lineTo(3f,3f);lineTo(8f,3f)
        moveTo(16f,3f);lineTo(21f,3f);lineTo(21f,8f)
        moveTo(21f,16f);lineTo(21f,21f);lineTo(16f,21f)
        moveTo(8f,21f);lineTo(3f,21f);lineTo(3f,16f)
    } }
    val FullscreenExit by lazy { outline("Leave fullscreen") {
        moveTo(3f,8f);lineTo(8f,8f);lineTo(8f,3f)
        moveTo(16f,3f);lineTo(16f,8f);lineTo(21f,8f)
        moveTo(21f,16f);lineTo(16f,16f);lineTo(16f,21f)
        moveTo(8f,21f);lineTo(8f,16f);lineTo(3f,16f)
    } }
    val Pause by lazy { outline("Pause") {
        moveTo(6f,4f);lineTo(10f,4f);lineTo(10f,20f);lineTo(6f,20f);close()
        moveTo(14f,4f);lineTo(18f,4f);lineTo(18f,20f);lineTo(14f,20f);close()
    } }
    val Replay10 by lazy { outline("Back ten seconds") {
        moveTo(4f,7f);curveTo(7f,2f,15f,1f,19f,6f);curveTo(25f,13f,18f,23f,10f,21f)
        curveTo(6f,20f,3f,17f,3f,13f);moveTo(4f,3f);lineTo(4f,7f);lineTo(8f,7f);ten()
    } }
    val Forward10 by lazy { outline("Forward ten seconds") {
        moveTo(20f,7f);curveTo(17f,2f,9f,1f,5f,6f);curveTo(-1f,13f,6f,23f,14f,21f)
        curveTo(18f,20f,21f,17f,21f,13f);moveTo(20f,3f);lineTo(20f,7f);lineTo(16f,7f);ten()
    } }
    val TouchApp by lazy { outline("Explore") {
        moveTo(9f,15f);lineTo(9f,6f);curveTo(9f,3f,13f,3f,13f,6f);lineTo(13f,11f)
        lineTo(17f,10f);curveTo(19f,10f,20f,12f,19f,15f);lineTo(17f,21f)
        lineTo(10f,21f);lineTo(5f,16f);curveTo(3f,14f,6f,12f,7f,13f);lineTo(9f,15f)
    } }

    private fun outline(name: String,draw: PathBuilder.()->Unit)=
        ImageVector.Builder(name,24.dp,24.dp,24f,24f).apply {
            path(fill=null,stroke=SolidColor(Color.Black),strokeLineWidth=1.8f,
                strokeLineCap=StrokeCap.Round,strokeLineJoin=StrokeJoin.Round){draw()}
        }.build()
    private fun PathBuilder.bookmark() {
        moveTo(6f,3f);lineTo(18f,3f);lineTo(18f,21f);lineTo(12f,17f);lineTo(6f,21f);close()
    }
    private fun PathBuilder.ten() {
        moveTo(7f,12f);lineTo(9f,10f);lineTo(9f,16f)
        moveTo(13f,10f);lineTo(17f,10f);lineTo(17f,16f);lineTo(13f,16f);close()
    }
    private fun PathBuilder.circle(x: Float,y: Float,r: Float) {
        val k=r*.5522848f
        moveTo(x+r,y);curveTo(x+r,y+k,x+k,y+r,x,y+r)
        curveTo(x-k,y+r,x-r,y+k,x-r,y);curveTo(x-r,y-k,x-k,y-r,x,y-r)
        curveTo(x+k,y-r,x+r,y-k,x+r,y);close()
    }
}
