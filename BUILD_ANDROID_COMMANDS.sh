#!/bin/bash
# Android Build Commands for Premium POS
# Run these commands in order

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 PREMIUM POS - ANDROID BUILD GUIDE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# STEP 1: Initialize Android (First Time Only)
echo "📱 STEP 1: Initialize Android Project (First Time Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run this command:"
echo ""
echo "cargo tauri android init"
echo ""
echo "Press Enter when done..."
read

# STEP 2: Development Build (Test on Device/Emulator)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 STEP 2: Development Build (Test First)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Connect your Android device via USB or start an emulator"
echo "Then run:"
echo ""
echo "cargo tauri android dev"
echo ""
echo "This will:"
echo "  • Build the app"
echo "  • Install on your device/emulator"
echo "  • Enable hot-reload for testing"
echo ""
echo "Press Enter when you're ready to see production build commands..."
read

# STEP 3: Production APK
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 3: Production APK Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For a production APK (to share/install):"
echo ""
echo "cargo tauri android build --apk"
echo ""
echo "APK location: src-tauri/gen/android/app/build/outputs/apk/universal/release/"
echo ""

# STEP 4: Production AAB (Play Store)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 4: Production AAB (For Google Play Store)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For Google Play Store submission:"
echo ""
echo "cargo tauri android build --aab"
echo ""
echo "AAB location: src-tauri/gen/android/app/build/outputs/bundle/universalRelease/"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COMMANDS READY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
