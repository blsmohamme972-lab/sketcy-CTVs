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
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.sketcy.ctvs.lesson.ImageRegion
import com.sketcy.ctvs.lesson.LessonSymbol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.min

@Composable
fun Illustration(file: File, symbols: List<LessonSymbol>, modifier: Modifier=Modifier,
    focus: ImageRegion=ImageRegion(0f,0f,1f,1f), highlighted: Set<String> = emptySet(),
    mask: String?=null, gestures: Boolean=true, resetKey: Any?=null,
    marker: Offset?=null,onTap: ((Float,Float)->Unit)?=null) {
    var image by remember(file.path) {mutableStateOf<ImageBitmap?>(null)}
    var loading by remember(file.path) {mutableStateOf(true)}
    LaunchedEffect(file.path) {
        image=withContext(Dispatchers.IO) {
            val bounds=BitmapFactory.Options().apply {inJustDecodeBounds=true}
            BitmapFactory.decodeFile(file.path,bounds)
            var sample=1
            while(bounds.outWidth/sample>1800 || bounds.outHeight/sample>1800)sample*=2
            BitmapFactory.decodeFile(file.path,BitmapFactory.Options().apply {inSampleSize=sample})?.asImageBitmap()
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
    val projection by rememberUpdatedState(image?.let { bitmap ->
        val f=if(manual)manualFocus else focus
        val scale=min(viewport.width/(bitmap.width*f.width),viewport.height/(bitmap.height*f.height))*zoom
        Triple(scale,viewport.width/2f-(f.x+f.width/2)*bitmap.width*scale+pan.x,
            viewport.height/2f-(f.y+f.height/2)*bitmap.height*scale+pan.y)
    })
    Box(modifier.clipToBounds()) {
        val bitmap=image
        if(bitmap==null) {
            if(loading)CircularProgressIndicator(Modifier.align(Alignment.Center))
            else Text("Illustration unavailable. Reimport this lesson.",Modifier.align(Alignment.Center).padding(16.dp))
        } else {
            val touch=Modifier.pointerInput(file.path,gestures) {
                detectTapGestures { point ->
                    val matrix=projection ?: return@detectTapGestures
                    if(matrix.first<=0f)return@detectTapGestures
                    val x=(point.x-matrix.second)/(bitmap.width*matrix.first)
                    val y=(point.y-matrix.third)/(bitmap.height*matrix.first)
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
                withTransform({translate(matrix.second,matrix.third);scale(matrix.first,matrix.first,Offset.Zero)}) {
                    drawImage(bitmap)
                    symbols.forEach { symbol ->
                        val r=symbol.region
                        val origin=Offset(r.x*bitmap.width,r.y*bitmap.height)
                        val size=Size(r.width*bitmap.width,r.height*bitmap.height)
                        if(symbol.id in highlighted) {
                            drawRect(Color(0xfff8d36e).copy(alpha=.18f),origin,size)
                            drawRect(Color(0xffffdd6c),origin,size,style=Stroke(3.dp.toPx()/matrix.first))
                        }
                        if(symbol.id==mask)drawRect(Color(0xff244c43),origin,size)
                    }
                    marker?.let {drawCircle(Color(0xfff6ca61),7.dp.toPx()/matrix.first,
                        Offset(it.x*bitmap.width,it.y*bitmap.height))}
                }
            }
            if(manual)AssistChip(onClick={manual=false;zoom=1f;pan=Offset.Zero},label={Text("Follow scene")},
                modifier=Modifier.align(Alignment.TopEnd).padding(8.dp))
        }
    }
}
