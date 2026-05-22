# Production-grade optimization rules for ANU SJB DOCKET

# Capacitor Essentials
-keep class com.getcapacitor.** { *; }
-keep class **.R$* { *; }
-keep class **.BuildConfig { *; }

# Firebase & Google Play Services (Critical for Notifications & Auth)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.capgo.** { *; }

# Native UI & Web Compatibility
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# Prevent Obfuscation of native method names
-keepclasseswithmembernames class * {
    native <methods>;
}

# Handle Kotlin Coroutines & Async
-keep class kotlinx.coroutines.** { *; }

# Fix for Capacitor Firebase Auth (Ignore optional providers you aren't using)
-dontwarn com.facebook.**
-dontwarn com.google.android.gms.auth.api.signin.internal.SignInHubActivity
-dontwarn com.google.android.gms.games.Games
-dontwarn com.google.android.gms.common.api.GoogleApiClient
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.handlers.FacebookAuthProviderHandler
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.handlers.TwitterAuthProviderHandler
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.handlers.PlayGamesAuthProviderHandler
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.handlers.GameCenterAuthProviderHandler

# Added to fix R8 missing classes error
-dontwarn com.google.firebase.**
