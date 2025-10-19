# 🚀 Quick Start: Build for Android

## ⚡ 5-Minute Android Setup

### 1️⃣ Install Android Studio (10 minutes)
Download: https://developer.android.com/studio
- Install with default settings
- Wait for initial setup to complete

### 2️⃣ Install Required Components
Open Android Studio → More Actions → SDK Manager:

**SDK Platforms Tab:**
- ✅ Check: Android 13.0 (API 33)

**SDK Tools Tab:**
- ✅ Android SDK Build-Tools
- ✅ NDK (Side by side) - latest version
- ✅ Android SDK Platform-Tools  
- ✅ Android SDK Command-line Tools

Click "Apply" and wait for downloads.

### 3️⃣ Set Environment Variables (Windows)

Press `Win + R`, type `sysdm.cpl`, press Enter.
Go to: Advanced → Environment Variables

**Add New System Variables:**
```
ANDROID_HOME = C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

**Edit PATH, add:**
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
%JAVA_HOME%\bin
```

**Important:** Replace `YOUR_USERNAME` with your actual Windows username!

### 4️⃣ Install Tauri CLI & Android Targets

Open a **NEW** terminal (to load new environment variables):

```bash
# Install Tauri CLI with mobile support
cargo install tauri-cli --version "^2.0.0" --locked

# Add Android Rust targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### 5️⃣ Initialize Android Project

```bash
# In your project root
cargo tauri android init
```

Answer the prompts:
- App name: `Premium POS`
- App ID: `com.premiumpos.app` (already in config)

### 6️⃣ Build Your First APK! 🎉

```bash
# Development build (to test)
cargo tauri android dev

# Production APK (to install on phone)
cargo tauri android build --apk
```

**Your APK will be at:**
```
src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk
```

### 7️⃣ Install on Android Phone

**Method 1: USB Cable**
1. Enable Developer Options on phone (Google it for your phone model)
2. Enable USB Debugging
3. Connect phone to PC
4. Run: `cargo tauri android dev` (app opens automatically)

**Method 2: Share APK**
1. Copy APK file to phone
2. Tap to install
3. Enable "Install from Unknown Sources" if asked

---

## 📱 iOS Build (Mac Only)

### Quick iOS Setup:

```bash
# Install Xcode from Mac App Store (takes ~1 hour)
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods

# Add iOS targets
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim

# Initialize iOS project
cargo tauri ios init

# Run in simulator
cargo tauri ios dev

# Build for device
cargo tauri ios build
```

---

## ⚠️ Common Issues

### "ANDROID_HOME not found"
- Restart terminal after setting environment variables
- Check spelling of paths
- Make sure Android Studio is fully installed

### "NDK not found"  
- Open Android Studio → SDK Manager → SDK Tools
- Check "NDK (Side by side)"
- Click Apply

### "Build failed"
- Run: `cd src-tauri/gen/android && ./gradlew clean`
- Then try again: `cargo tauri android build`

### "App crashes on startup"
- Check database path (different on mobile)
- Verify permissions in AndroidManifest.xml

---

## 🎯 What's Next?

1. **Test Everything:** Try all features on real device
2. **UI Tweaks:** Adjust layouts for mobile screens
3. **Icons:** Add app icons (different sizes needed)
4. **Splash Screen:** Add loading screen
5. **Store Listing:** Prepare screenshots and description
6. **Publish:** Upload to Google Play Store

---

## 📞 Need Help?

- Tauri Discord: https://discord.gg/tauri
- Tauri Docs: https://v2.tauri.app/
- Android Docs: https://developer.android.com/

---

## ✅ Success Checklist

- [ ] Android Studio installed
- [ ] SDK & NDK installed  
- [ ] Environment variables set
- [ ] Terminal restarted
- [ ] `cargo tauri android init` completed
- [ ] `cargo tauri android dev` works
- [ ] App opens on phone/emulator
- [ ] All features tested on mobile
- [ ] APK built successfully

**You're ready to build for mobile! 🚀**
