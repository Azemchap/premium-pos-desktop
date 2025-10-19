# 📱 Android Build - Quick Command Reference

## 🚀 **All Commands You Need**

### **Step 1: Initialize Android (First Time Only)** ⚙️
```bash
cargo tauri android init
```
**What it does:**
- Creates `src-tauri/gen/android` folder
- Sets up Android project structure
- Configures AndroidManifest.xml
- Sets up Gradle build files

**Only run this ONCE!**

---

### **Step 2: Development Build (Test on Device)** 🧪
```bash
# Make sure Android device is connected via USB
# OR Android emulator is running
# Then:

cargo tauri android dev
```

**What it does:**
- Builds debug version
- Installs on your device/emulator
- Enables hot-reload
- Shows logs in terminal
- Perfect for testing!

**Prerequisites:**
- Android device connected via USB with USB debugging enabled
- OR Android emulator running
- Enable "Developer Options" and "USB Debugging" on device

---

### **Step 3: Production APK (Share/Install)** 📦
```bash
cargo tauri android build --apk
```

**What it does:**
- Builds optimized release APK
- Signs the APK
- Creates universal APK (works on all devices)

**APK Location:**
```
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

**Use this APK to:**
- Install directly on devices
- Share with beta testers
- Side-load on any Android device

---

### **Step 4: Production AAB (Play Store)** 🏪
```bash
cargo tauri android build --aab
```

**What it does:**
- Builds Android App Bundle
- Optimized for Play Store
- Smaller download sizes

**AAB Location:**
```
src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab
```

**Upload this to Google Play Console**

---

## 🎯 **Recommended Build Sequence**

### **For First-Time Setup:**
```bash
# 1. Initialize (once)
cargo tauri android init

# 2. Test on device first
cargo tauri android dev

# 3. If everything works, build production
cargo tauri android build --apk
```

### **For Regular Development:**
```bash
# Always test with dev build first
cargo tauri android dev

# When ready for release
cargo tauri android build --apk
```

---

## 📱 **Device Setup (Important!)**

### **Enable USB Debugging:**
1. Open Settings on Android device
2. Go to "About Phone"
3. Tap "Build Number" 7 times (enables Developer Mode)
4. Go back to Settings → "Developer Options"
5. Enable "USB Debugging"
6. Connect device to computer via USB
7. Accept debugging permission on device

### **Verify Device is Connected:**
```bash
adb devices
```

You should see your device listed.

---

## 🔧 **Troubleshooting**

### **If `cargo tauri android` command not found:**
```bash
# Make sure Tauri CLI is installed
cargo install tauri-cli
```

### **If Android SDK not found:**
Set environment variables:
```bash
# Windows (PowerShell)
$env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Linux/Mac (Bash)
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### **If build fails:**
```bash
# Clean and rebuild
cd src-tauri/gen/android
./gradlew clean
cd ../../..
cargo tauri android build --apk
```

---

## ⚡ **Quick Reference**

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `cargo tauri android init` | Setup project | Once, first time only |
| `cargo tauri android dev` | Test/debug | During development |
| `cargo tauri android build --apk` | Release APK | For distribution/testing |
| `cargo tauri android build --aab` | Play Store | For Play Store upload |

---

## 🎉 **You're Ready!**

**Start with:**
```bash
cargo tauri android init
```

**Then test with:**
```bash
cargo tauri android dev
```

**Finally build with:**
```bash
cargo tauri android build --apk
```

**Your Android POS app will be ready to install! 📱✨**
