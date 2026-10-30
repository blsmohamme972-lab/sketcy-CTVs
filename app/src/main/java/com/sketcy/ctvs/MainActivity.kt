package com.sketcy.ctvs

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import com.sketcy.ctvs.ui.StudyApp

class MainActivity : ComponentActivity() {
    internal val model by lazy { ViewModelProvider(this)[AppViewModel::class.java] }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { StudyApp(model) }
    }
    override fun onStop() {
        if (!isChangingConfigurations) model.player.pause()
        super.onStop()
    }
}
