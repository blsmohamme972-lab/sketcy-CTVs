package com.sketcy.ctvs.ui

import android.graphics.BitmapFactory
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.sketcy.ctvs.lesson.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.min
import kotlin.math.roundToInt

private data class SceneImages(val background: ImageBitmap, val layers: Map<String,ImageBitmap>)
private fun decodeImage(file: File, limit: Int): ImageBitmap? {
    val bounds=BitmapFactory.Options().apply {inJustDecodeBounds=true}
    BitmapFactory.decodeFile(file.path,bounds)
    var sample=1
    while(bounds.outWidth/sample>limit || bounds.outHeight/sample>limit)sample*=2
    return BitmapFactory.decodeFile(file.path,BitmapFactory.Options().apply {inSampleSize=sample})?.asImageBitmap()
}

@Composable
fun Illustration(file: File, symbols: List<LessonSymbol>, modifier: Modifier=Modifier,
    focus: ImageRegion=ImageRegion(0f,0f,1f,1f), highlighted: Set<String> = emptySet(),
    mask: String?=null, gestures: Boolean=true, resetKey: Any?=null,
    marker: Offset?=null,onTap: ((Float,Float)->Unit)?=null,
    layeredScene: LayeredScene?=null, directory: File?=null,
    positionMs: Long=0,mode: NarrationMode=NarrationMode.EXPLANATION,reducedMotion: Boolean=false) {
    // Decode once per scene. Every animation frame samples only immutable transforms.
    var images by remember(file.path,layeredScene) {mutableStateOf<SceneImages?>(null)}
    var loading by remember(file.path,layeredScene) {mutableStateOf(true)}
    LaunchedEffect(file.path,layeredScene,directory?.path) {
        images=withContext(Dispatchers.IO) {
            if(layeredScene==null)decodeImage(file,1800)?.let {SceneImages(it,emptyMap())}
            else if(directory==null)null
            else {
                val background=decodeImage(File(directory,layeredScene.backgroundPath),1800)
                val layers=layeredScene.layers.associate {it.id to decodeImage(File(directory,it.assetPath),1024)}
                if(background==null || layers.values.any {it==null})null
                else SceneImages(background,layers.mapValues {requireNotNull(it.value)})
            }
        }
        loading=false
    }
    var viewport by remember {mutableStateOf(IntSize.Zero)}
    var manual by remember(file.path) {mutableStateOf(false)}
    var manualFocus by remember(file.path) {mutableStateOf(focus)}
    var zoom by remember(file.path) {mutableFloatStateOf(1f)}
    var pan by remember(file.path) {mutableStateOf(Offset.Zero)}
    LaunchedEffect(resetKey) {manual=false;zoom=1f;pan=Offset.Zero}
    val currentFocus by rememberUpdatedState(if(manual)manualFocus else focus)
    val currentTap by rememberUpdatedState(onTap)
    val width=(layeredScene?.width ?: images?.background?.width ?: 1).toFloat()
    val height=(layeredScene?.height ?: images?.background?.height ?: 1).toFloat()
    val projection by rememberUpdatedState(images?.let {
        val f=if(manual)manualFocus else focus
        val scale=min(viewport.width/(width*f.width),viewport.height/(height*f.height))*zoom
        Triple(scale,viewport.width/2f-(f.x+f.width/2)*width*scale+pan.x,
            viewport.height/2f-(f.y+f.height/2)*height*scale+pan.y)
    })
    Box(modifier.clipToBounds()) {
        val loaded=images
        if(loaded==null) {
            if(loading)CircularProgressIndicator(Modifier.align(Alignment.Center))
            else Text("Scene media unavailable. Reimport this lesson.",Modifier.align(Alignment.Center).padding(16.dp))
        } else {
            val touch=Modifier.pointerInput(file.path,gestures,layeredScene) {
                detectTapGestures { point ->
                    val matrix=projection ?: return@detectTapGestures
                    if(matrix.first<=0f)return@detectTapGestures
                    val x=(point.x-matrix.second)/(width*matrix.first)
                    val y=(point.y-matrix.third)/(height*matrix.first)
                    if(x in 0f..1f && y in 0f..1f)currentTap?.invoke(x,y)
                }
            }.then(if(gestures)Modifier.pointerInput(file.path) {
                detectTransformGestures { _, movement, scale, _ ->
                    if(!manual){manualFocus=currentFocus;manual=true}
                    zoom=(zoom*scale).coerceIn(1f,4f)
                    pan=Offset((pan.x+movement.x).coerceIn(-viewport.width*2f,viewport.width*2f),
                        (pan.y+movement.y).coerceIn(-viewport.height*2f,viewport.height*2f))
                }
            } else Modifier)
            Canvas(Modifier.fillMaxSize().onSizeChanged {viewport=it}.then(touch)
                .semantics {contentDescription=if(gestures)"Lesson illustration. Pinch to zoom and drag to explore." else "Review illustration"}) {
                drawRect(Color(0xff152b28))
                val matrix=projection ?: return@Canvas
                if(matrix.first<=0f)return@Canvas
                fun DrawScope.symbolBox(symbol: LessonSymbol,layerScale: Float=1f) {
                    val r=symbol.region
                    val origin=Offset(r.x*width,r.y*height)
                    val size=Size(r.width*width,r.height*height)
                    if(symbol.id in highlighted) {
                        drawRect(Color(0xfff8d36e).copy(alpha=.18f),origin,size)
                        drawRect(Color(0xffffdd6c),origin,size,style=Stroke(3.dp.toPx()/matrix.first/layerScale))
                    }
                    if(symbol.id==mask)drawRect(Color(0xff244c43),origin,size)
                }
                withTransform({translate(matrix.second,matrix.third);scale(matrix.first,matrix.first,Offset.Zero)}) {
                    drawImage(loaded.background,dstSize=IntSize(width.toInt(),height.toInt()))
                    val movingSymbols=layeredScene?.layers?.mapNotNull {it.symbolId}.orEmpty().toSet()
                    layeredScene?.layers?.forEach {layer ->
                        val r=layer.region
                        val pose=layer.pose(mode,positionMs,reducedMotion)
                        val pivot=Offset((r.x+r.width*layer.pivotX)*width,(r.y+r.height*layer.pivotY)*height)
                        withTransform({
                            translate(pose.dx*width,pose.dy*height)
                            rotate(pose.rotation,pivot)
                            scale(pose.scale,pose.scale,pivot)
                        }) {
                            drawImage(loaded.layers.getValue(layer.id),
                                dstOffset=IntOffset((r.x*width).roundToInt(),(r.y*height).roundToInt()),
                                dstSize=IntSize((r.width*width).roundToInt().coerceAtLeast(1),(r.height*height).roundToInt().coerceAtLeast(1)))
                            symbols.find {it.id==layer.symbolId}?.let {symbolBox(it,pose.scale)}
                        }
                    }
                    symbols.filter {it.id !in movingSymbols}.forEach {symbolBox(it)}
                    marker?.let {drawCircle(Color(0xfff6ca61),7.dp.toPx()/matrix.first,
                        Offset(it.x*width,it.y*height))}
                }
            }
            if(manual)AssistChip(onClick={manual=false;zoom=1f;pan=Offset.Zero},label={Text("Follow scene")},
                modifier=Modifier.align(Alignment.TopEnd).padding(8.dp))
        }
    }
}
