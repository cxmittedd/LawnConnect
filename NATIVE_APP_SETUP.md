# Native App Assets Setup

This guide explains how to set up splash screens and app icons for your native iOS and Android apps.

## App Icon

The app uses the LawnConnect logo (green gradient with lawn mower). The icon files are located in:
- `public/pwa-192x192.png` - PWA icon (192x192)
- `public/pwa-512x512.png` - PWA icon (512x512)
- `public/apple-touch-icon.png` - iOS home screen icon
- `src/assets/lawnconnect-logo.png` - Source logo

## Setting Up Native Icons

### iOS (after running `npx cap add ios`)

1. Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. Replace the icon files with your app icon at required sizes:
   - 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

### Android (after running `npx cap add android`)

1. Open `android/app/src/main/res/`
2. Replace icons in each `mipmap-*` folder:
   - `mipmap-mdpi/ic_launcher.png` (48x48)
   - `mipmap-hdpi/ic_launcher.png` (72x72)
   - `mipmap-xhdpi/ic_launcher.png` (96x96)
   - `mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `mipmap-xxxhdpi/ic_launcher.png` (192x192)

## Splash Screen Setup

The splash screen is configured in `capacitor.config.ts` with a green background (#22c55e) to match the app theme.

### iOS Splash Screen

1. Open `ios/App/App/Assets.xcassets/Splash.imageset/`
2. Add your splash image (recommended: simple logo on transparent background)
3. The image will be centered on the green background

### Android Splash Screen

1. Create `android/app/src/main/res/drawable/splash.png` with your splash image
2. For Android 12+, create `android/app/src/main/res/drawable-v31/` folder with appropriate assets

## Recommended Tools

Use one of these tools to generate all required icon sizes from a single source image:
- [App Icon Generator](https://appicon.co/)
- [Capacitor Assets](https://github.com/ionic-team/capacitor-assets) - CLI tool

### Using Capacitor Assets (Recommended)

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#22c55e' --splashBackgroundColor '#22c55e'
```

Place your source files:
- `assets/icon-only.png` (1024x1024, transparent background)
- `assets/icon-foreground.png` (1024x1024, for Android adaptive icons)
- `assets/icon-background.png` (1024x1024, solid color or gradient)
- `assets/splash.png` (2732x2732, centered logo)
- `assets/splash-dark.png` (optional, for dark mode)

## Push Notification Icons (Android)

For push notifications on Android, create:
- `android/app/src/main/res/drawable/ic_stat_notification.png` (24x24, white on transparent)
- Include in different densities for best results

## Quick Start Commands

After exporting to GitHub:

```bash
# Clone and install
git clone <your-repo>
cd <your-repo>
npm install

# Add platforms
npx cap add ios
npx cap add android

# Generate assets (after placing source images in assets/ folder)
npx capacitor-assets generate

# Build and sync
npm run build
npx cap sync

# Run on device
npx cap run ios      # Requires Mac + Xcode
npx cap run android  # Requires Android Studio
```
