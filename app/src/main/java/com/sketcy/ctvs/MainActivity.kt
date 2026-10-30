package com.sketcy.ctvs

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { SketcyApp() }
    }
}

private val LightColors = lightColorScheme(
    primary = Color(0xFF176B5B),
    background = Color(0xFFFFF8ED),
    surface = Color(0xFFFFF8ED),
    secondaryContainer = Color(0xFFE6EEDD),
)

@Composable
fun SketcyApp() {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else LightColors) {
        var selectedTab by rememberSaveable { mutableIntStateOf(0) }
        val tabs = listOf(R.string.library, R.string.review, R.string.settings)
        Scaffold { insets ->
            Column(Modifier.fillMaxSize().padding(insets)) {
                Text(
                    stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(24.dp),
                )
                TabRow(selectedTabIndex = selectedTab) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = { Text(stringResource(title)) },
                        )
                    }
                }
                when (selectedTab) {
                    0 -> EmptyScreen(R.string.library_title, R.string.library_body,
                        R.string.library_empty_title, R.string.library_empty_body)
                    1 -> EmptyScreen(R.string.review_title, R.string.review_body,
                        R.string.review_empty_title, R.string.review_empty_body)
                    2 -> EmptyScreen(R.string.settings_title, R.string.settings_body,
                        R.string.settings_empty_title, R.string.settings_empty_body)
                }
            }
        }
    }
}

@Composable
private fun EmptyScreen(title: Int, description: Int, cardTitle: Int, cardBody: Int) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(stringResource(title), style = MaterialTheme.typography.headlineMedium)
        Text(stringResource(description), style = MaterialTheme.typography.bodyLarge)
        Card(Modifier.fillMaxWidth().padding(top = 16.dp)) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(cardTitle), style = MaterialTheme.typography.titleLarge)
                Text(stringResource(cardBody), style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun AppPreview() { SketcyApp() }
