package com.sketcy.ctvs.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import java.io.IOException

private val Context.studyDataStore by preferencesDataStore("study-preferences")

@Serializable
data class StudyPreferences(val captions: Boolean = true, val reducedMotion: Boolean = false,
    val playbackSpeed: Float = 1f, val retention: Double = 0.9) {
    fun validate() {
        require(playbackSpeed.isFinite() && playbackSpeed in 0.5f..2f)
        require(retention.isFinite() && retention in 0.8..0.97)
    }
}

class PreferenceStore(context: Context) {
    private val store = context.applicationContext.studyDataStore
    private val captions = booleanPreferencesKey("captions")
    private val reducedMotion = booleanPreferencesKey("reducedMotion")
    private val speed = floatPreferencesKey("playbackSpeed")
    private val retention = doublePreferencesKey("retention")
    val values = store.data.catch { if (it is IOException) emit(emptyPreferences()) else throw it }.map {
        StudyPreferences(it[captions] ?: true,it[reducedMotion] ?: false,it[speed] ?: 1f,it[retention] ?: 0.9)
    }
    suspend fun save(value: StudyPreferences) {
        value.validate()
        store.edit { it[captions]=value.captions;it[reducedMotion]=value.reducedMotion;it[speed]=value.playbackSpeed;it[retention]=value.retention }
    }
}
