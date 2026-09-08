plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "vn.com.bluestar.his.patient_app"
    // androidx.core 1.18.0 (do cac plugin keo vao) yeu cau compile voi API 36.
    // compileSdk chi anh huong API duoc phep goi, KHONG doi minSdk = 25.
    compileSdk = 36
    // Nhieu plugin (firebase, pdfrx, secure_storage...) doi NDK 27; ban mac dinh
    // cua Flutter 3.32.8 la 26.3 nen phai ghim tay. NDK tuong thich nguoc.
    ndkVersion = "27.0.12077973"

    compileOptions {
        // Bat buoc voi minSdk = 25: flutter_local_notifications dung java.time,
        // von chi co san tu API 26. Desugaring dich nguoc cac API do xuong bytecode
        // chay duoc tren Android 7.1 - chinh la thu cho phep giu minSdk 25 theo HSMT.
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "vn.com.bluestar.his.patient_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // HSMT: ho tro Android 7.1.1 tro len (API 25). Flutter mac dinh thap hon
        // nen ghi de len 25 de khop dong "Android 7.2 tro len" cua ho so moi thau.
        minSdk = 25
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Thu vien di kem cho isCoreLibraryDesugaringEnabled o tren.
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
