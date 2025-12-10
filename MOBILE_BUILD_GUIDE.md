# 📱 Building QorBooks for Android & iOS

## 🎯 Overview
Your app is built with Tauri v2 which supports mobile platforms. Here's how to build for Android and iOS.

---

## 📋 Prerequisites

### For Android:
- ✅ Rust (already installed)
- ✅ Node.js & pnpm (already installed)
- ⚠️ **Android Studio** (required)
- ⚠️ **Android NDK** (required)
- ⚠️ **Java JDK 17+** (required)

### For iOS:
- ✅ macOS (iOS builds only work on Mac)
- ✅ Xcode 14+ with iOS SDK
- ✅ CocoaPods (`sudo gem install cocoapods`)

---

## 🔧 Step 1: Install Tauri CLI (Mobile Support)

```bash
# Install Tauri CLI with mobile features
cargo install tauri-cli --version "^2.0.0" --locked

# Verify installation
cargo tauri --version
```

---

## 📱 Step 2: Initialize Mobile Support

```bash
# Add Android support
cargo tauri android init

# Add iOS support (macOS only)
cargo tauri ios init
```

This will create:
- `src-tauri/gen/android/` - Android project
- `src-tauri/gen/ios/` - iOS project

---

## 🤖 Android Setup

### 1. Install Android Studio
Download from: https://developer.android.com/studio

### 2. Install Android SDK & NDK
Open Android Studio → Tools → SDK Manager:
- SDK Platforms: Android 13 (API 33) or higher
- SDK Tools: 
  - Android SDK Build-Tools
  - NDK (Side by side) - version 25 or higher
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools

### 3. Set Environment Variables (Windows)
```bash
# Add to System Environment Variables:
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr

# Add to PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
%ANDROID_HOME%\ndk\25.2.9519653  # Your NDK version
%JAVA_HOME%\bin
```

### 4. Install Rust Android Targets
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### 5. Configure Android Build
Edit `src-tauri/tauri.conf.json`:
```json
{
  "identifier": "com.qorbooks.app",
  "bundle": {
    "android": {
      "minSdkVersion": 24
    }
  }
}
```

### 6. Build Android APK
```bash
# Development build
cargo tauri android dev

# Production build (APK)
cargo tauri android build

# Production build (AAB for Play Store)
cargo tauri android build --apk
cargo tauri android build --aab
```

**Output Location:**
`src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk`

---

## 🍎 iOS Setup (macOS Only)

### 1. Install Xcode
Download from Mac App Store

### 2. Install Command Line Tools
```bash
xcode-select --install
```

### 3. Install CocoaPods
```bash
sudo gem install cocoapods
```

### 4. Install iOS Simulator
Open Xcode → Preferences → Components → Install iOS Simulator

### 5. Add iOS Rust Targets
```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

### 6. Build iOS App
```bash
# Development (Simulator)
cargo tauri ios dev

# Production Build
cargo tauri ios build

# Open in Xcode for signing & distribution
cargo tauri ios open
```

**Output Location:**
`src-tauri/gen/ios/build/Release-iphoneos/`

---

## 🎨 Mobile UI Adjustments Needed

Your app is designed for desktop. For mobile, you'll need to adjust:

### 1. Responsive Design
```typescript
// Already done! Your app uses Tailwind responsive classes
// But test on mobile screens (375px - 428px width)
```

### 2. Navigation
- Sidebar won't work well on mobile
- Consider adding a bottom navigation bar
- Use hamburger menu for mobile

### 3. Touch Targets
- Buttons should be at least 44px × 44px
- Add more padding for touch
- Remove hover states (add active states)

### 4. Forms
- Larger input fields
- Mobile-friendly date pickers
- Virtual keyboard consideration

### 5. Database Storage
SQLite works on mobile! But file location changes:
- Android: `/data/data/com.qorbooks.app/databases/`
- iOS: App's Documents directory

---

## 🔒 Permissions Required

Add to `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "fs:read",
    "fs:write",
    "notification:default",
    "shell:allow-open",
    "sql:default"
  ]
}
```

For Android, edit `src-tauri/gen/android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

---

## 📦 App Store Distribution

### Google Play Store (Android)
1. Build AAB: `cargo tauri android build --aab`
2. Sign with keystore
3. Upload to Google Play Console
4. Fill app details, screenshots, privacy policy
5. Submit for review

### Apple App Store (iOS)
1. Open in Xcode: `cargo tauri ios open`
2. Configure signing & certificates
3. Archive app
4. Upload to App Store Connect
5. Fill app details, screenshots
6. Submit for review

---

## 🚀 Quick Start Commands

```bash
# Android Development
cargo tauri android dev

# Android Production APK
cargo tauri android build --apk

# iOS Development (Mac only)
cargo tauri ios dev

# iOS Production Build (Mac only)
cargo tauri ios build
```

---

## ⚠️ Important Notes

1. **SQLite Database:** Works on mobile but file paths are different
2. **File Storage:** Profile images need cloud storage for best results
3. **Permissions:** Request at runtime, not just manifest
4. **Testing:** Use real devices, not just emulators
5. **Performance:** Mobile has less RAM - optimize accordingly
6. **Network:** App works offline but sync might be needed

---

## 🐛 Troubleshooting

### Android Build Fails
```bash
# Check environment
echo $ANDROID_HOME
echo $JAVA_HOME

# Verify NDK
ls $ANDROID_HOME/ndk

# Clean build
cd src-tauri/gen/android
./gradlew clean
cd ../../..
cargo tauri android build
```

### iOS Build Fails (Mac)
```bash
# Update CocoaPods
cd src-tauri/gen/ios
pod install --repo-update
cd ../../..
cargo tauri ios build
```

### App Crashes on Mobile
- Check logs: `cargo tauri android dev` shows console logs
- Test database paths
- Verify permissions

---

## 📱 Recommended First Steps

1. **Install Android Studio** (easier to start with Android)
2. **Run:** `cargo tauri android init`
3. **Set environment variables**
4. **Test:** `cargo tauri android dev`
5. **Adjust UI for mobile screens**
6. **Build APK:** `cargo tauri android build --apk`
7. **Test on real device**

---

## 🎯 Next Steps After This Guide

1. Test on real devices (not just emulators)
2. Adjust UI components for mobile
3. Add bottom navigation for mobile
4. Test all features (camera, file picker, etc.)
5. Optimize performance for mobile
6. Add app icons and splash screens
7. Prepare store listings

---

## 📚 Resources

- Tauri Mobile Docs: https://v2.tauri.app/start/prerequisites/
- Android Studio: https://developer.android.com/studio
- Xcode: https://developer.apple.com/xcode/

---

## ✅ Checklist Before Building

- [ ] Android Studio installed
- [ ] Android SDK & NDK installed
- [ ] Environment variables set
- [ ] Rust Android targets added
- [ ] Tauri mobile initialized
- [ ] App tested in dev mode
- [ ] UI adjusted for mobile
- [ ] Permissions configured
- [ ] Icons & splash screen ready
- [ ] Privacy policy prepared (required for stores)
