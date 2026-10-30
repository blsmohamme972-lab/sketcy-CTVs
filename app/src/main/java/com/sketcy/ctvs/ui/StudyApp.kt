package com.sketcy.ctvs.ui

import android.app.Activity
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sketcy.ctvs.AppViewModel
import com.sketcy.ctvs.data.StudyPreferences

private val LightPalette = lightColorScheme(primary=Color(0xff285c4d), onPrimary=Color.White,
    primaryContainer=Color(0xffd4eadb), secondary=Color(0xff88642b), secondaryContainer=Color(0xfff7e2b8),
    background=Color(0xfffaf8f1), surface=Color(0xfffaf8f1), surfaceContainer=Color(0xfff0eee5),
    surfaceContainerHigh=Color(0xffe9e8de))
private val DarkPalette = darkColorScheme(primary=Color(0xffa7d5bc),onPrimary=Color(0xff103c2e),
    primaryContainer=Color(0xff294f40),secondary=Color(0xffe9c680),secondaryContainer=Color(0xff57431e),
    background=Color(0xff14201b),surface=Color(0xff14201b),surfaceContainer=Color(0xff1d2a23),
    surfaceContainerHigh=Color(0xff26342c))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyApp(model: AppViewModel) {
    MaterialTheme(colorScheme=if(isSystemInDarkTheme()) DarkPalette else LightPalette,
        typography=Typography().let {it.copy(headlineLarge=it.headlineLarge.copy(fontFamily=FontFamily.Serif),
            headlineMedium=it.headlineMedium.copy(fontFamily=FontFamily.Serif),titleLarge=it.titleLarge.copy(fontFamily=FontFamily.Serif))}) {
        val lessons by model.lessons.collectAsStateWithLifecycle()
        val progress by model.progress.collectAsStateWithLifecycle()
        val cards by model.cards.collectAsStateWithLifecycle()
        val history by model.history.collectAsStateWithLifecycle()
        val prefs by model.preferences.collectAsStateWithLifecycle()
        val busy by model.busy.collectAsStateWithLifecycle()
        val ready by model.ready.collectAsStateWithLifecycle()
        var screen by rememberSaveable {mutableStateOf("library")}
        var lessonId by rememberSaveable {mutableStateOf<String?>(null)}
        var partId by rememberSaveable {mutableStateOf<String?>(null)}
        var fullscreen by rememberSaveable {mutableStateOf(false)}
        var restoreUri by remember {mutableStateOf<Uri?>(null)}
        val snack=remember {SnackbarHostState()}
        val import=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) {it?.let(model::importLesson)}
        val backup=rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) {it?.let(model::exportBackup)}
        val restore=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) {restoreUri=it}
        val roots=setOf("library","review","settings")
        val selected=lessons.find {it.row.id==lessonId}
        val selectedPart=selected?.lesson?.parts?.find {it.id==partId}
        val goBack: ()->Unit = {
            if(fullscreen)fullscreen=false
            else screen=when(screen){"player","explorer"->"lesson";"session"->"review";else->"library"}
        }
        BackHandler(enabled=screen !in roots || fullscreen,onBack=goBack)
        LaunchedEffect(Unit) {model.messages.collect {snack.showSnackbar(it)}}
        LaunchedEffect(screen) {if(screen!="player"){model.player.pause();fullscreen=false}}
        val activity=LocalContext.current as? Activity
        DisposableEffect(fullscreen,activity) {
            val controller=activity?.window?.let {WindowCompat.getInsetsController(it,it.decorView)}
            if(fullscreen){controller?.systemBarsBehavior=WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller?.hide(WindowInsetsCompat.Type.systemBars())}
            else controller?.show(WindowInsetsCompat.Type.systemBars())
            onDispose {controller?.show(WindowInsetsCompat.Type.systemBars())}
        }
        Scaffold(containerColor=MaterialTheme.colorScheme.background,
            topBar={if(!fullscreen)TopAppBar(title={Column {
                Text(when(screen){"library"->"Sketcy CTVS";"review","session"->"Review";"settings"->"Settings"
                    "explorer"->"Symbol Explorer";"player"->selectedPart?.title ?: "Player";else->"Lesson"},maxLines=1)
                if(screen=="library")Text("A place for memorable learning",style=MaterialTheme.typography.labelSmall)
            }},navigationIcon={if(screen !in roots)IconButton(onClick=goBack){Icon(Icons.AutoMirrored.Outlined.ArrowBack,"Back")}})},
            bottomBar={if(screen in roots)NavigationBar {
                listOf(Triple("library","Library",StudyIcons.AutoStories),Triple("review","Review",StudyIcons.Style),
                    Triple("settings","Settings",StudyIcons.Tune)).forEach {(route,label,icon)->
                    NavigationBarItem(selected=screen==route,onClick={screen=route},icon={Icon(icon,label)},label={Text(label)})
                }
            }},snackbarHost={SnackbarHost(snack)}) {padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
                if(!ready)Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator()}
                else when(screen) {
                    "library"->LibraryScreen(lessons,progress,busy,onImport={import.launch(arrayOf("application/zip","application/octet-stream"))},
                        onOpen={lessonId=it;screen="lesson"},onBookmark=model::bookmark)
                    "review"->ReviewHome(cards,history,lessons.size,onStart={model.startReview();screen="session"})
                    "settings"->SettingsScreen(prefs,busy,model::settings,
                        onExport={backup.launch("sketcy-backup.zip")},onRestore={restore.launch(arrayOf("application/zip","application/octet-stream"))})
                    "session"->ReviewSession(model,prefs,busy,onFinish={screen="review"})
                    "lesson"->if(selected!=null)LessonScreen(selected,progress,busy,
                        onPart={id,route->partId=id;screen=route},onBookmark={model.bookmark(selected.row.id,it)},
                        onDelete={model.deleteLesson(selected.row.id);screen="library"}) else MissingLesson {screen="library"}
                    "player"->if(selected!=null && selectedPart!=null)PlayerScreen(model,selected,selectedPart,prefs,fullscreen,
                        onFullscreen={fullscreen=!fullscreen},onExplorer={screen="explorer"}) else MissingLesson {screen="library"}
                    "explorer"->if(selected!=null && selectedPart!=null)ExplorerScreen(selected,selectedPart) else MissingLesson {screen="library"}
                }
            }
        }
        restoreUri?.let {uri->AlertDialog(onDismissRequest={restoreUri=null},title={Text("Restore this backup?")},
            text={Text("A valid backup replaces your current lessons, review history, progress, and settings. Export your current data first if you want to keep it.")},
            confirmButton={TextButton(onClick={restoreUri=null;model.restoreBackup(uri);screen="library"}){Text("Restore")}},
            dismissButton={TextButton(onClick={restoreUri=null}){Text("Cancel")}})}
    }
}

@Composable
private fun MissingLesson(onBack: ()->Unit) {Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
    Text("This lesson is no longer installed.");Button(onClick=onBack){Text("Back to library")}
}}

@Composable
fun SectionTitle(text: String) {Text(text,style=MaterialTheme.typography.titleLarge)}

@Composable
fun Notice(title: String,text: String,modifier: Modifier=Modifier) {
    Card(modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.secondaryContainer),shape=RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
            Text(title,style=MaterialTheme.typography.titleMedium);Text(text,style=MaterialTheme.typography.bodyMedium)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SettingsScreen(prefs: StudyPreferences,busy: Boolean,onChange: (StudyPreferences)->Unit,onExport: ()->Unit,onRestore: ()->Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        SectionTitle("Make yourself comfortable")
        SettingSwitch("Captions","Show the active narration passage.",prefs.captions){onChange(prefs.copy(captions=it))}
        SettingSwitch("Reduced motion","Keep the whole scene still while highlights advance.",prefs.reducedMotion){onChange(prefs.copy(reducedMotion=it))}
        Text("Narration speed",style=MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {listOf(.75f,1f,1.25f,1.5f,2f).forEach {speed->
            FilterChip(selected=prefs.playbackSpeed==speed,onClick={onChange(prefs.copy(playbackSpeed=speed))},label={Text("${speed}×")})
        }}
        HorizontalDivider()
        SectionTitle("Remember over time")
        Text("Desired retention · ${(prefs.retention*100).toInt()}%",style=MaterialTheme.typography.titleMedium)
        Text("A higher target schedules more frequent reviews. This changes future ratings; existing due dates stay as scheduled.",style=MaterialTheme.typography.bodyMedium)
        Slider(value=prefs.retention.toFloat(),onValueChange={onChange(prefs.copy(retention=kotlin.math.round(it*100).toInt()/100.0))},valueRange=.8f.. .97f,steps=16)
        Text("FSRS v6 · 90% default · ratings saved for each fact",style=MaterialTheme.typography.labelMedium)
        HorizontalDivider()
        SectionTitle("Keep a copy")
        Text("Your lessons, audio, bookmarks, progress, and review history live on this device. Export a backup before uninstalling or moving to another device.")
        Button(onClick=onExport,enabled=!busy){Icon(StudyIcons.FileUpload,null);Spacer(Modifier.width(8.dp));Text("Export backup")}
        OutlinedButton(onClick=onRestore,enabled=!busy){Text("Restore backup")}
        Notice("Your material is the source","Medical lessons must be made from your supplied PDFs or text. Each fact keeps an exact source passage. Technical demos are labelled separately.")
        Text("Sketcy CTVS 0.2.0 · Android 8+\nWorks offline after import. No accounts or analytics.",style=MaterialTheme.typography.bodySmall)
        var license by remember {mutableStateOf(false)}
        TextButton(onClick={license=!license}){Text(if(license)"Hide open-source notice" else "Open-source notice")}
        if(license)Text("FSRS scheduling is adapted from Open Spaced Repetition, copyright © 2022 Open Spaced Repetition, under the MIT License. The complete license is included in this app's assets and in the source repository. AndroidX libraries use the Apache License 2.0. See THIRD_PARTY.md in the repository for versions and notices.",style=MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun SettingSwitch(title: String,description: String,value: Boolean,onChange: (Boolean)->Unit) {
    Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
        Column(Modifier.weight(1f).padding(end=12.dp)){Text(title,style=MaterialTheme.typography.titleMedium);Text(description,style=MaterialTheme.typography.bodyMedium)}
        Switch(checked=value,onCheckedChange=onChange)
    }
}
