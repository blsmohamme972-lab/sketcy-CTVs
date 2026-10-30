package com.sketcy.ctvs.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sketcy.ctvs.data.*
import com.sketcy.ctvs.lesson.*
import java.io.File

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LibraryScreen(lessons: List<InstalledLesson>,progress: List<ProgressRow>,busy: Boolean,
    onImport: ()->Unit,onOpen: (String)->Unit,onBookmark: (String,Boolean)->Unit) {
    var query by rememberSaveable {mutableStateOf("")}
    var specialty by rememberSaveable {mutableStateOf<String?>(null)}
    var bookmarked by rememberSaveable {mutableStateOf(false)}
    val filtered=lessons.filter {(!bookmarked || it.row.bookmarked) && (specialty==null || it.row.specialty==specialty) &&
        (query.isBlank() || it.row.title.contains(query,true) || it.row.specialty.contains(query,true) || it.lesson.facts.any {f->f.text.contains(query,true)})}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        item {Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
            Column(Modifier.weight(1f)){Text("Your study shelf",style=MaterialTheme.typography.headlineMedium)
                Text("${lessons.size} ${if(lessons.size==1)"lesson" else "lessons"} · available offline",style=MaterialTheme.typography.bodyMedium)}
            FilledTonalButton(onClick=onImport,enabled=!busy){Icon(Icons.Outlined.Add,"Import lesson");Text("Import")}
        }}
        if(lessons.isEmpty())item {
            Notice("Begin with a scene","Import a Sketcy lesson ZIP to listen, explore its symbols, and practise what you remember. A technical library-tour demo is supplied separately for trying the app.")
            Spacer(Modifier.height(20.dp))
            Column(Modifier.fillMaxWidth().padding(12.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
                listOf("01" to "Listen to the explanation, then follow the story.","02" to "Explore the picture and connect each symbol to its source.",
                    "03" to "Recall the facts in short, spaced reviews.").forEach {(number,text)->Row(horizontalArrangement=Arrangement.spacedBy(14.dp)) {
                    Text(number,color=MaterialTheme.colorScheme.primary,style=MaterialTheme.typography.headlineSmall)
                    Text(text,Modifier.weight(1f),style=MaterialTheme.typography.bodyLarge)
                }}
            }
        } else {
            item {OutlinedTextField(value=query,onValueChange={query=it},modifier=Modifier.fillMaxWidth(),singleLine=true,
                label={Text("Search lessons or facts")},leadingIcon={Icon(Icons.Outlined.Search,null)},shape=RoundedCornerShape(16.dp))
                FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected=bookmarked,onClick={bookmarked=!bookmarked},label={Text("Bookmarked")})
                    FilterChip(selected=specialty==null,onClick={specialty=null},label={Text("All topics")})
                    lessons.map {it.row.specialty}.distinct().sorted().forEach {topic->FilterChip(selected=specialty==topic,onClick={specialty=topic},label={Text(topic)})}
                }
            }
            if(filtered.isEmpty())item {Text("No lessons match these filters.")}
            items(filtered,key={it.row.id}) {installed->
                val lesson=installed.lesson
                val rows=progress.filter {it.lessonId==lesson.lessonId}
                val completed=rows.count {it.completed}
                Card(onClick={onOpen(lesson.lessonId)},enabled=!busy,shape=RoundedCornerShape(24.dp)) {
                    Illustration(File(installed.directory,lesson.parts.first().illustrationPath),emptyList(),
                        Modifier.fillMaxWidth().aspectRatio(1.5f),gestures=false)
                    Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment=Alignment.CenterVertically){Text(lesson.title,Modifier.weight(1f),style=MaterialTheme.typography.titleLarge,maxLines=2,overflow=TextOverflow.Ellipsis)
                            IconButton(onClick={onBookmark(lesson.lessonId,!installed.row.bookmarked)},enabled=!busy){Icon(if(installed.row.bookmarked)Icons.Outlined.Bookmark else Icons.Outlined.BookmarkBorder,
                                if(installed.row.bookmarked)"Remove bookmark" else "Bookmark lesson")}}
                        Text("${lesson.specialty} · ${lesson.parts.size} ${if(lesson.parts.size==1)"part" else "parts"} · ${lesson.facts.size} facts",style=MaterialTheme.typography.bodyMedium)
                        if(lesson.contentType==ContentType.TECHNICAL_DEMO)Text("TECHNICAL DEMO · NONMEDICAL",color=MaterialTheme.colorScheme.secondary,style=MaterialTheme.typography.labelSmall)
                        LinearProgressIndicator(progress={completed.toFloat()/(lesson.parts.size*2)},modifier=Modifier.fillMaxWidth())
                        Text(if(rows.isEmpty())"Ready to begin" else "$completed of ${lesson.parts.size*2} tracks complete · continue where you left off",style=MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LessonScreen(installed: InstalledLesson,progress: List<ProgressRow>,busy: Boolean,onPart: (String,String)->Unit,
    onBookmark: (Boolean)->Unit,onDelete: ()->Unit) {
    val lesson=installed.lesson
    var delete by remember {mutableStateOf(false)}
    var sources by rememberSaveable(lesson.lessonId) {mutableStateOf(false)}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        Text(lesson.title,style=MaterialTheme.typography.headlineLarge)
        Text("${lesson.specialty} · ${lesson.facts.size} facts · revision ${lesson.revision}",style=MaterialTheme.typography.bodyMedium)
        if(lesson.contentType==ContentType.TECHNICAL_DEMO)Notice("A nonmedical technical demo",
            "This original scene demonstrates playback and review. " +
                (if(lesson.quality.audioReviewed) "An audio review is recorded for this package. " else "Its narration has not received a human listening review. ") +
                "It is not a medical lesson.")
        FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            FilterChip(selected=installed.row.bookmarked,onClick={onBookmark(!installed.row.bookmarked)},label={Text("Bookmark")},leadingIcon={Icon(Icons.Outlined.BookmarkBorder,null)})
            AssistChip(onClick={sources=!sources},label={Text(if(sources)"Hide sources" else "Source passages")})
        }
        if(sources)lesson.facts.forEach {SourceEvidence(lesson,it)}
        SectionTitle("The lesson, one scene at a time")
        lesson.parts.forEachIndexed {index,part->
            val rows=progress.filter {it.lessonId==lesson.lessonId && it.partId==part.id}
            Card(shape=RoundedCornerShape(22.dp)) {Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                Text("PART ${index+1}",style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)
                Text(part.title,style=MaterialTheme.typography.titleLarge)
                part.objectives.forEach {Text("• $it",style=MaterialTheme.typography.bodyMedium)}
                Text("Explanation ${clock(part.explanation.durationMs)} · Story ${clock(part.story.durationMs)}",style=MaterialTheme.typography.labelMedium)
                if(rows.any {it.completed})Text("${rows.count {it.completed}} of 2 tracks complete",style=MaterialTheme.typography.labelSmall)
                FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                    Button(onClick={onPart(part.id,"player")},enabled=!busy){Icon(Icons.Outlined.PlayArrow,null);Text(if(rows.isEmpty())"Start lesson" else "Resume lesson")}
                    OutlinedButton(onClick={onPart(part.id,"explorer")},enabled=!busy){Text("Explore symbols")}
                }
            }}
        }
        TextButton(onClick={delete=true},enabled=!busy){Icon(Icons.Outlined.DeleteOutline,null);Text("Remove lesson and its history")}
    }
    if(delete)AlertDialog(onDismissRequest={delete=false},title={Text("Remove this lesson?")},
        text={Text("Its media, progress, and review history will be deleted from this device. Export a backup first if you need to keep them.")},
        confirmButton={TextButton(onClick={delete=false;onDelete()}){Text("Remove")}},dismissButton={TextButton(onClick={delete=false}){Text("Cancel")}})
}

@Composable
fun SourceEvidence(lesson: LessonPackage,fact: Fact) {
    Card(colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surfaceContainerHigh)) {
        SelectionContainer {Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            Text(fact.text,style=MaterialTheme.typography.titleSmall)
            fact.sources.forEach {reference->
                val source=lesson.sources.first {it.id==reference.sourceId}
                Text("${source.title} · ${reference.locator}",style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)
                Text("“${reference.quote}”",style=MaterialTheme.typography.bodyMedium)
            }
        }}
    }
}

fun clock(ms: Long): String {val seconds=ms.coerceAtLeast(0)/1000;return "${seconds/60}:${(seconds%60).toString().padStart(2,'0')}"}
