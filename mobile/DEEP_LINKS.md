# Deep Linking Configuration

This document describes the native configuration required for deep linking support in the Poo App.

## Overview

The app supports two types of deep links:
- **Custom URL scheme:** `pooapp://` - Opens the app directly
- **Universal links (iOS) / App Links (Android):** `https://trypoo.app/list/*` - Seamless web-to-app transitions

## iOS Configuration

### 1. URL Scheme (`pooapp://`)

Add the following to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.trypoo</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>pooapp</string>
    </array>
  </dict>
</array>
```

### 2. Universal Links (`https://trypoo.app/*`)

1. Add Associated Domains capability to `ios/App/App.entitlements`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:trypoo.app</string>
</array>
```

2. Host an Apple App Site Association (AASA) file at `https://trypoo.app/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.app.trypoo",
        "paths": ["/list/*", "/join/*", "/public/*"]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

## Android Configuration

### 1. Intent Filters for URL Scheme and App Links

Add the following intent filters to `android/app/src/main/AndroidManifest.xml` inside the `<activity>` tag:

```xml
<!-- Custom URL scheme -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="pooapp" />
</intent-filter>

<!-- App Links (verified) -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data
    android:scheme="https"
    android:host="trypoo.app"
    android:pathPrefix="/list" />
  <data
    android:scheme="https"
    android:host="trypoo.app"
    android:pathPrefix="/join" />
  <data
    android:scheme="https"
    android:host="trypoo.app"
    android:pathPrefix="/public" />
</intent-filter>
```

### 2. Digital Asset Links

Host an `assetlinks.json` file at `https://trypoo.app/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.trypoo",
      "sha256_cert_fingerprints": [
        "CERTIFICATE_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Get your certificate fingerprint by running:
```bash
keytool -list -v -keystore my-release-key.keystore
```

## Applying Changes

These native configurations will be applied when:
1. You regenerate the Capacitor native projects: `npx cap sync`
2. You manually update the native project files

After making changes to native files, rebuild the app:
```bash
npx cap sync
npx cap open ios   # or npx cap open android
# Then build from Xcode or Android Studio
```

## Testing Deep Links

### Custom scheme (`pooapp://`)
```bash
# iOS Simulator
xcrun simctl openurl booted pooapp://list/123

# Android
adb shell am start -W -a android.intent.action.VIEW -d "pooapp://list/123" app.trypoo
```

### Universal/App Links
```bash
# iOS Simulator
xcrun simctl openurl booted https://trypoo.app/list/123

# Android
adb shell am start -W -a android.intent.action.VIEW -d "https://trypoo.app/list/123" app.trypoo
```

## Notes

- Universal Links (iOS) and App Links (Android) require the domain verification files to be hosted at the specified URLs
- The app will gracefully fall back to web browser if the app is not installed
- Deep linking only works on native platforms (iOS/Android), not in web builds
