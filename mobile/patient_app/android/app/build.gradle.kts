import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Khoa ky ban phat hanh. File nay KHONG nam trong repo (xem android/key.properties.example).
//
// Vi sao phai co: truoc day ban release duoc ky bang khoa DEBUG. Google Play tu choi thang
// ("You uploaded an APK signed with a debug certificate"), va neu bang cach nao do lot ra thi
// khoa debug la khoa ai cung co - bat ky ai cung ky duoc mot ban cap nhat gia mao cho app y te.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasReleaseKeystore = keystoreProperties.getProperty("storeFile") != null

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
        // Da chot: dinh danh ung dung tren ca hai kho. Doi gia tri nay sau khi phat hanh la
        // TAO MOT APP KHAC - nguoi dung cu khong nhan duoc ban cap nhat nao nua.
        applicationId = "vn.com.bluestar.his.patient_app"
        // HSMT: ho tro Android 7.1.1 tro len (API 25). Flutter mac dinh thap hon
        // nen ghi de len 25 de khop dong "Android 7.2 tro len" cua ho so moi thau.
        minSdk = 25
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        // Chi khai khi that su co khoa: khai san mot config tro vao file khong ton tai se lam
        // moi lenh gradle chet, ke ca `flutter build apk --debug`.
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                // KHONG roi ve khoa debug mot cach im lang. Mot ban release ky bang khoa debug
                // vua bi Google Play tu choi, vua la lo hong that neu no lot ra ngoai. Bao that
                // to o day de nguoi build biet ngay, thay vi phat hien luc nop len kho.
                logger.warn(
                    "\n" +
                    "===================================================================\n" +
                    "  CANH BAO: chua co android/key.properties nen BAN RELEASE KHONG\n" +
                    "  DUOC KY. File .apk/.aab tao ra chi dung de thu, KHONG nop len kho\n" +
                    "  ung dung duoc. Xem android/key.properties.example de tao khoa.\n" +
                    "==================================================================="
                )
                signingConfig = null
            }

            // Thu nho ban phat hanh. Bat cung luc voi shrinkResources - bat mot minh
            // shrinkResources se lam gradle bao loi.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
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
