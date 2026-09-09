# Quy tac rut gon cho ban phat hanh.
#
# Flutter engine giu lai cac lop duoc goi qua JNI. Khong co dong nay thi R8 cat mat chung va app
# ra ban release se crash ngay luc khoi dong — mot loi CHI xuat hien o ban release, tuc la khong
# bao gio thay khi chay debug.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# BiometricPrompt cua Android duoc goi qua reflection tu plugin sinh trac.
-keep class androidx.biometric.** { *; }

# Firebase Messaging: service duoc he dieu hanh dung ten trong manifest de goi.
-keep class com.google.firebase.** { *; }

# Bo log cua ban phat hanh: log cua app y te co the chua ma benh nhan, ten thuoc.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Flutter co san ma goi Play Core de tai "deferred component". App nay khong dung tinh nang do
# nen thu vien Play Core khong co trong ban build, va R8 dung han vi thay tham chieu treo.
# Bao R8 bo qua: day la nhanh chet, khong bao gio chay.
-dontwarn com.google.android.play.core.**
