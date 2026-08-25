# TruFit Mobile Application (iOS & Android)

A complete, native mobile client built with **React Native**, **Expo**, **TypeScript**, and **React Navigation**, sharing the same **Firebase Firestore & Authentication backend** with the TruFit web platform.

---

## 📱 Features Included

### 1. Authentication & Role-Based Navigation
- **Email & Password Authentication**: Powered by Firebase Auth with persistent AsyncStorage sessions.
- **Mandatory Email Verification**: Guarded screen preventing unverified accounts from entering.
- **Dual Personas**: Dynamic routing for **Athletes / Players** vs **Turf Owners / Partners**.

### 2. Player Features
- **Home Dashboard**: Location detection, upcoming match pass, active lobbies, rewards summary.
- **Explore & Filter Arenas**: Filter by sport, maximum price, ratings, and live distance calculations.
- **Turf Pitch Details**: Photo carousel, amenities, sports supported, arena list, native GPS map directions.
- **Atomic Booking Flow**: Select Ground -> Select Date -> Choose Slot -> Select Payment (Online vs Counter) with concurrency collision protection via Firestore transactions.
- **My Bookings & QR Entry Pass**: View upcoming/completed matches, open QR gate pass, rate played turfs.
- **Payments & Split Dues**: Track paid receipts vs pending walk-in dues.
- **Community Lobbies & Pick-up Games**: "I'm In" / "I'm Out" player roster participation and lobby hosting.
- **Squads & Clubs**: Create teams, invite players, track captain status and win rates.
- **Friendly Matchmaking**: Challenge local squads and track competitive match scores.
- **Athlete Performance Stats**: Hours played, milestone badges, sports breakdown.
- **Reward Wallet**: Earn reward points redeemable on pitch bookings.

### 3. Owner Features
- **Arena Control Center**: Live today's revenue, occupied slots, pending desk dues.
- **Turf & Ground Configuration**: Add and edit sports facilities, hourly rates, and opening hours.
- **Auto Slot Generator**: Batch-generate full-day 1-hour slots (06:00 to 23:00) and block/unblock maintenance hours.
- **Desk Booking & Walk-in Manager**: Register on-site offline bookings, update cash payments.
- **Player Dues Tracker**: One-tap phone calls to players with outstanding balances and settlement status.
- **Promo Codes & Flash Sales**: Launch percentage discount coupons.
- **Occupancy & Revenue Analytics**: Day-of-week occupancy histograms and gross turnover.

---

## 🚀 How to Run the Mobile App

### Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli eas-cli`)
- [Expo Go app](https://expo.dev/client) installed on your iOS (App Store) or Android (Google Play) device, OR Xcode / Android Studio simulators.

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Start Expo Development Server
```bash
npm start
```
or
```bash
npx expo start
```

### 3. Run on Device / Simulator
- **iOS Device**: Scan the QR code with your iPhone camera (opens Expo Go).
- **Android Device**: Scan the QR code inside the Expo Go app.
- **iOS Simulator**: Press `i` in the terminal.
- **Android Emulator**: Press `a` in the terminal.

---

## 📦 Building Native Binaries (APK / AAB / IPA) with EAS

To generate standalone production installable binaries:

```bash
# Login to EAS
npx eas login

# Build Android APK / AAB
npx eas build --platform android --profile preview

# Build iOS IPA
npx eas build --platform ios --profile preview
```
