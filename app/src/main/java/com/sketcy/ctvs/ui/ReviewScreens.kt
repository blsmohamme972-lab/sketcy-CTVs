package com.sketcy.ctvs.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sketcy.ctvs.AppViewModel
import com.sketcy.ctvs.data.*
import com.sketcy.ctvs.lesson.*
import kotlinx.coroutines.delay
import kotlinx.serialization.decodeFromString
import java.io.File
import java.text.DateFormat
import java.util.Date

@Composable
fun ReviewHome(cards: List<CardRow>,history: List<ReviewLogRow>,lessonCount: Int,onStart: ()->Unit) {
    var now by remember {mutableLongStateOf(System.currentTimeMillis())}
    LaunchedEffect(Unit){while(true){now=System.currentTimeMillis();delay(15_000)}}
    val due=cards.count {it.dueMs<=now}
    val learned=cards.count {PackageJson.decodeFromString<MemoryState>(it.memoryJson).phase==MemoryPhase.REVIEW}
    val today=history.count {it.reviewedAt>=now-86_400_000}
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(20.dp)) {
        Text("Small moments.\nLasting memories.",style=MaterialTheme.typography.headlineLarge)
        Card(shape=RoundedCornerShape(24.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.primaryContainer)) {
            Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                Text("$due",style=MaterialTheme.typography.displayLarge)
                Text("facts ready to review",style=MaterialTheme.typography.titleMedium)
                Text("Start with an image cue. As you learn, reviews mix hidden symbols, scene taps, and source-based questions.")
                Button(onClick=onStart,enabled=due>0){Text("Start review")}
            }
        }
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
            Column {Text("$learned / ${cards.size}",style=MaterialTheme.typography.headlineSmall);Text("facts in review",style=MaterialTheme.typography.labelMedium)}
            Column {Text("$today",style=MaterialTheme.typography.headlineSmall);Text("ratings in the last 24 h",style=MaterialTheme.typography.labelMedium)}
        }
        if(lessonCount==0)Notice("A scene comes first","Import a lesson from the Library to add its facts to your review queue.")
        else if(due==0) {
            val next=cards.minOfOrNull {it.dueMs}
            Notice("You are up to date",if(next!=null)"Next review: ${DateFormat.getDateTimeInstance(DateFormat.MEDIUM,DateFormat.SHORT).format(Date(next))}" else "Your next imported lesson will appear here.")
        }
        if(history.isNotEmpty()) {
            SectionTitle("Recent practice")
            history.take(10).forEach {row->
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)){Text(questionLabel(QuestionType.valueOf(row.questionType)),style=MaterialTheme.typography.titleSmall)
                        Text(DateFormat.getDateTimeInstance(DateFormat.SHORT,DateFormat.SHORT).format(Date(row.reviewedAt)),style=MaterialTheme.typography.labelSmall)}
                    Text(Rating.valueOf(row.rating).name.lowercase().replaceFirstChar {it.uppercase()},color=MaterialTheme.colorScheme.primary)
                }
            }
        }
        Text("An incorrect tap or choice is always saved as Again. Self-assessed image recall uses the rating you choose.",style=MaterialTheme.typography.bodySmall)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReviewSession(model: AppViewModel,prefs: StudyPreferences,busy: Boolean,onFinish: ()->Unit) {
    val prompt by model.review.collectAsStateWithLifecycle()
    val loading by model.reviewLoading.collectAsStateWithLifecycle()
    val p=prompt
    if(loading && p==null){Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator()};return}
    if(p==null){Column(Modifier.fillMaxSize().padding(28.dp),verticalArrangement=Arrangement.spacedBy(18.dp),horizontalAlignment=Alignment.CenterHorizontally) {
        Icon(StudyIcons.CheckCircleOutline,null,Modifier.size(56.dp),tint=MaterialTheme.colorScheme.primary)
        Text("All caught up",style=MaterialTheme.typography.headlineMedium)
        Text("Your ratings are saved. Come back when more facts are due.")
        Button(onClick=onFinish){Text("Back to reviews")}
    };return}
    val lesson=p.installed.lesson
    val q=p.question
    val part=lesson.parts.first {it.id==q.partId}
    val symbols=lesson.symbols.filter {it.partId==part.id}
    val symbol=symbols.find {it.id==q.symbolId}
    val masked=q.type==QuestionType.IMAGE_OCCLUSION && !p.revealed
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        Text(questionLabel(q.type).uppercase(),color=MaterialTheme.colorScheme.primary,style=MaterialTheme.typography.labelMedium)
        Text(q.prompt,style=MaterialTheme.typography.headlineSmall)
        Illustration(File(p.installed.directory,part.illustrationPath),symbols,
            Modifier.fillMaxWidth().aspectRatio(1.4f).clip(RoundedCornerShape(20.dp)),
            highlighted=if(p.revealed)setOfNotNull(q.symbolId) else if(q.type==QuestionType.IMAGE_RECALL)setOfNotNull(q.symbolId) else emptySet(),
            mask=if(masked)q.symbolId else null,gestures=q.type!=QuestionType.TAP_SYMBOL,resetKey="${q.id}/${p.card.memoryJson}",
            marker=if(q.type==QuestionType.TAP_SYMBOL && p.tapX!=null && p.tapY!=null)Offset(p.tapX!!,p.tapY!!) else null,
            onTap=if(q.type==QuestionType.TAP_SYMBOL && !p.revealed)model::tapAnswer else null)
        if(q.type==QuestionType.MULTIPLE_CHOICE)q.choices.forEach {choice->
            OutlinedCard(onClick={model.chooseAnswer(choice.id)},enabled=!p.revealed,modifier=Modifier.fillMaxWidth(),
                colors=CardDefaults.outlinedCardColors(containerColor=if(p.choice==choice.id)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                Row(Modifier.padding(12.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(selected=p.choice==choice.id,onClick=null,enabled=!p.revealed)
                    Text(choice.text,Modifier.padding(start=8.dp))}
            }
        }
        if(q.type==QuestionType.TAP_SYMBOL && !p.revealed) {
            Text(if(p.tapX==null)"Tap the scene, then check your answer." else "Your point is marked. Check when you are ready.")
            // Alternative descriptions name objects only, without their fact meanings.
            FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {symbols.forEach {candidate->
                OutlinedButton(onClick={model.tapAnswer(candidate.region.x+candidate.region.width/2,candidate.region.y+candidate.region.height/2)}) {Text(candidate.label)}
            }}
        }
        if(!p.revealed)Button(onClick=model::reveal,enabled=when(q.type){
            QuestionType.MULTIPLE_CHOICE->p.choice!=null;QuestionType.TAP_SYMBOL->p.tapX!=null;else->true}) {
            Text(if(q.type in listOf(QuestionType.TAP_SYMBOL,QuestionType.MULTIPLE_CHOICE))"Check answer" else "Reveal answer")
        } else {
            val title=when(p.objectivelyCorrect){true->"Correct";false->"Let's learn it again";null->"Check your recall"}
            Notice(title,q.answer)
            Text(q.explanation,style=MaterialTheme.typography.bodyLarge)
            if(symbol!=null)Text("${symbol.label} · ${symbol.meaning}",style=MaterialTheme.typography.bodyMedium)
            SourceEvidence(lesson,lesson.facts.first {it.id==q.factId})
            Text("How well did you remember?",style=MaterialTheme.typography.titleMedium)
            val memory=PackageJson.decodeFromString<MemoryState>(p.card.memoryJson)
            val previewTime=maxOf(System.currentTimeMillis(),memory.lastReviewMs ?: 0L)
            val previews=FsrsScheduler(prefs.retention).previews(memory,previewTime)
            FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                Rating.entries.filter {p.objectivelyCorrect!=false || it==Rating.AGAIN}.forEach {rating->
                    FilledTonalButton(onClick={model.rate(rating)},enabled=!busy) {
                        Column(horizontalAlignment=Alignment.CenterHorizontally){Text(rating.name.lowercase().replaceFirstChar {it.uppercase()})
                            Text(intervalLabel(requireNotNull(previews[rating]).dueMs-previewTime),style=MaterialTheme.typography.labelSmall)}
                    }
                }
            }
            if(p.objectivelyCorrect==false)Text("Incorrect answers are scheduled as Again.",style=MaterialTheme.typography.bodySmall)
        }
    }
}

fun questionLabel(type: QuestionType)=when(type){QuestionType.IMAGE_RECALL->"Image recall";QuestionType.IMAGE_OCCLUSION->"Hidden symbol"
    QuestionType.TAP_SYMBOL->"Tap the symbol";QuestionType.MULTIPLE_CHOICE->"Choose an answer"}
private fun intervalLabel(ms: Long): String=when{ms<3_600_000->"${ms/60_000} min";ms<86_400_000->"${ms/3_600_000} h";else->"${ms/86_400_000} d"}
