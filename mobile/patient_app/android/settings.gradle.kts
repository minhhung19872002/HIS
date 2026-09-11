pluginManagement {
    val flutterSdkPath = run {
        val properties = java.util.Properties()
        file("local.properties").inputStream().use { properties.load(it) }
        val flutterSdkPath = properties.getProperty("flutter.sdk")
        require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
        flutterSdkPath
    }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    // AGP 8.7.3 (mac dinh cua Flutter 3.32.8) khong bien dich duoc voi
    // androidx.core 1.18.0 ma cac plugin keo vao: no doi AGP >= 8.9.1 va
    // compileSdk 36. Gradle 8.12 trong wrapper da du cho AGP 8.9.x.
    id("com.android.application") version "8.9.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    // Bat buoc de firebase_messaging doc duoc google-services.json. Thieu plugin nay thi file cau
    // hinh Firebase co nam dung cho cung khong duoc doc: Gradle khong sinh ra values.xml chua
    // google_app_id, Firebase.initializeApp() nem loi, va app tat thong bao day trong im lang.
    // Apply that su o app/build.gradle.kts, va chi khi co google-services.json.
    id("com.google.gms.google-services") version "4.4.2" apply false
}

include(":app")
