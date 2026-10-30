plugins {
    kotlin("jvm")
    application
    id("org.jetbrains.kotlin.plugin.serialization")
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    testImplementation(kotlin("test-junit"))
}

application { mainClass.set("com.sketcy.ctvs.lesson.PackageToolKt") }
