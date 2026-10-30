package com.sketcy.ctvs.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sketcy.ctvs.AppViewModel
import com.sketcy.ctvs.data.*
import com.sketcy.ctvs.lesson.*
import java.io.File

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlayerScreen(model: AppViewModel,installed: InstalledLesson,part: PackagePart,prefs: StudyPreferences,
    fullscreen: Boolean,onFullscreen: ()->Unit,onExplorer: ()->Unit) {
    val state by model.player.state.collectAsStateWithLifecycle()
    LaunchedEffect(installed.row.folder,part.id){model.openPlayer(installed,part)}
    val view=LocalView.current
    DisposableEffect(state.playing,view){view.keepScreenOn=state.playing;onDispose{view.keepScreenOn=false}}
    val symbols=installed.lesson.symbols.filter {it.partId==part.id}
    val frame=state.frame
    val scene: @Composable (Modifier)->Unit = {modifier->
        Box(modifier.clip(RoundedCornerShape(if(fullscreen)0.dp else 20.dp))) {
            Illustration(File(installed.directory,part.illustrationPath),symbols,Modifier.fillMaxSize(),
                focus=frame?.focus ?: ImageRegion(0f,0f,1f,1f),highlighted=frame?.highlightedSymbolIds?.toSet() ?: emptySet(),
                resetKey="${part.id}/${state.mode}")
            FilledTonalIconButton(onClick=onFullscreen,modifier=Modifier.align(Alignment.BottomEnd).padding(8.dp)) {
                Icon(if(fullscreen)StudyIcons.FullscreenExit else StudyIcons.Fullscreen,if(fullscreen)"Exit fullscreen" else "Fullscreen")
            }
            if(state.buffering)CircularProgressIndicator(Modifier.align(Alignment.Center))
        }
    }
    val controls: @Composable ()->Unit = {
        Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
            FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                NarrationMode.entries.forEach {mode->FilterChip(selected=state.mode==mode,onClick={model.player.switchMode(mode)},
                    label={Text(if(mode==NarrationMode.EXPLANATION)"Explanation" else "Story")})}
            }
            state.error?.let {Text(it,color=MaterialTheme.colorScheme.error)}
            var seeking by remember(state.mode) {mutableStateOf<Float?>(null)}
            Slider(value=seeking ?: state.positionMs.toFloat(),onValueChange={seeking=it},
                onValueChangeFinished={seeking?.let {model.player.seek(it.toLong())};seeking=null},
                valueRange=0f..state.durationMs.coerceAtLeast(1).toFloat(),modifier=Modifier.fillMaxWidth())
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
                Text(clock(seeking?.toLong() ?: state.positionMs),style=MaterialTheme.typography.labelMedium)
                Text(clock(state.durationMs),style=MaterialTheme.typography.labelMedium)
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.Center,verticalAlignment=Alignment.CenterVertically) {
                IconButton(onClick={model.player.seek(state.positionMs-10_000)},modifier=Modifier.size(56.dp)){Icon(StudyIcons.Replay10,"Back 10 seconds")}
                FilledIconButton(onClick=model.player::playPause,modifier=Modifier.size(64.dp),enabled=state.partId==part.id) {
                    Icon(if(state.playRequested)StudyIcons.Pause else Icons.Outlined.PlayArrow,if(state.playRequested)"Pause" else "Play",Modifier.size(36.dp))
                }
                IconButton(onClick={model.player.seek(state.positionMs+10_000)},modifier=Modifier.size(56.dp)){Icon(StudyIcons.Forward10,"Forward 10 seconds")}
            }
            val captionScroll=rememberScrollState()
            LaunchedEffect(state.mode,frame?.segmentId){captionScroll.scrollTo(0)}
            if(prefs.captions)Surface(color=MaterialTheme.colorScheme.surfaceContainerHigh,shape=RoundedCornerShape(16.dp)) {
                Text(frame?.caption ?: if(state.positionMs>=state.durationMs && state.durationMs>0)"Track complete" else "Ready when you are.",
                    Modifier.fillMaxWidth().heightIn(max=160.dp).verticalScroll(captionScroll).padding(16.dp),style=MaterialTheme.typography.bodyLarge)
            }
            FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                listOf(.75f,1f,1.25f,1.5f,2f).forEach {speed->FilterChip(selected=prefs.playbackSpeed==speed,
                    onClick={model.settings(prefs.copy(playbackSpeed=speed))},label={Text("${speed}×")})}
                FilterChip(selected=prefs.captions,onClick={model.settings(prefs.copy(captions=!prefs.captions))},label={Text("Captions")})
                FilterChip(selected=prefs.reducedMotion,onClick={model.settings(prefs.copy(reducedMotion=!prefs.reducedMotion))},label={Text("Still scene")})
            }
            if(!fullscreen) {
                OutlinedButton(onClick=onExplorer){Icon(StudyIcons.TouchApp,null);Spacer(Modifier.width(8.dp));Text("Explore the symbols")}
                var evidence by rememberSaveable(part.id) {mutableStateOf(false)}
                TextButton(onClick={evidence=!evidence}){Text(if(evidence)"Hide current source" else "Show current source")}
                if(evidence){val ids=part.track(state.mode).segments.find {it.id==frame?.segmentId}?.factIds.orEmpty()
                    installed.lesson.facts.filter {it.id in ids}.forEach {SourceEvidence(installed.lesson,it)}}
            }
        }
    }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        if(fullscreen && maxWidth>maxHeight)Row(Modifier.fillMaxSize(),horizontalArrangement=Arrangement.spacedBy(16.dp)) {
            scene(Modifier.weight(1.25f).fillMaxHeight())
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(12.dp)){controls()}
        } else Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if(fullscreen)0.dp else 16.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
            scene(Modifier.fillMaxWidth().heightIn(min=220.dp,max=440.dp).aspectRatio(1.5f))
            Column(Modifier.padding(if(fullscreen)16.dp else 0.dp)){controls()}
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ExplorerScreen(installed: InstalledLesson,part: PackagePart) {
    val symbols=installed.lesson.symbols.filter {it.partId==part.id}
    var selectedId by rememberSaveable(part.id) {mutableStateOf<String?>(null)}
    var hide by rememberSaveable {mutableStateOf(false)}
    val selected=symbols.find {it.id==selectedId}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        Text("Every object has a purpose",style=MaterialTheme.typography.headlineMedium)
        Text("Tap a symbol, or choose one below. Pinch and drag to explore the illustration.")
        Illustration(File(installed.directory,part.illustrationPath),symbols,Modifier.fillMaxWidth().aspectRatio(1.4f).clip(RoundedCornerShape(20.dp)),
            focus=selected?.region ?: ImageRegion(0f,0f,1f,1f),highlighted=setOfNotNull(selectedId),resetKey=selectedId,
            onTap={x,y->symbols.filter {x>=it.region.x && x<=it.region.x+it.region.width && y>=it.region.y && y<=it.region.y+it.region.height}
                .minByOrNull {it.region.width*it.region.height}?.let {selectedId=it.id}})
        FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            FilterChip(selected=selectedId==null,onClick={selectedId=null},label={Text("Whole scene")})
            symbols.forEach {symbol->FilterChip(selected=selectedId==symbol.id,onClick={selectedId=symbol.id},label={Text(symbol.label)})}
        }
        Row(verticalAlignment=Alignment.CenterVertically){Text("Hide meanings for recall",Modifier.weight(1f));Switch(checked=hide,onCheckedChange={hide=it})}
        if(selected==null)Text("Choose a symbol to see its meaning and source.")
        else if(hide)Notice("Try to recall it","What does this symbol represent? Turn off “Hide meanings” when you are ready to check.")
        else {
            SectionTitle(selected.label);Text(selected.meaning,style=MaterialTheme.typography.bodyLarge)
            installed.lesson.facts.filter {it.id in selected.factIds}.forEach {SourceEvidence(installed.lesson,it)}
        }
    }
}
