# TruFit App — Sports Turf Discovery & Booking Platform (Phase 1)

TruFit is a sports turf and arena management, discovery, slot booking, and payment dues tracking platform built with React, TypeScript, Tailwind CSS, Firebase Authentication, and Firestore database.

---

## Features Implemented in Phase 1

### 1. Firebase Authentication & Mandatory Email Verification
- **Email/Password Signup & Login** with secure role assignment (`PLAYER` vs `OWNER`).
- **Real Firebase Verification Flow**: Sends real verification email upon signup and prevents access until `emailVerified == true`.
- **Verification Screen** with *Refresh Verification Status* and *Resend Verification Email*.
- **Password Reset**: Forgot password workflow via Firebase Auth.
- **Session Persistence**: Automatically restores verified sessions on app restart.

### 2. Owner Workflow
- **Dashboard**: Real-time business metrics (Today's Bookings, Upcoming Bookings, Available Slots, Total Collections, Pending Receivables, Total Turfs, and Total Arenas).
- **Turf Management**: Create sports turfs with name, description, address, locality, city, phone, opening/closing hours, pricing, sports, amenities, photos, and interactive map geolocation.
- **Arena Management**: Multiple courts/arenas per turf (Football, Cricket, Badminton, etc.) with custom capacity and pricing.
- **Slot Management**:
  - Manual single slot creation.
  - Bulk slot generation across operating hours (e.g. 5:00 PM to 10:00 PM).
  - Weekly date selector and calendar view.
  - Slot visibility toggle (`visibleToPlayers: true / false`).
  - Slot blocking/unblocking.
  - Direct Owner reservation (`BOOKED BY OWNER`).
- **Bookings & Players**: Real-time list of all player bookings, contact details, and slot timings.
- **Payments & Dues**: Live receivable ledger of players who chose *Pay Later at Turf* with instant counter collection recording.

### 3. Player Workflow
- **Home Dashboard**: Quick glance at upcoming match, pending dues, and quick booking access.
- **Live Geolocation & Turf Discovery**:
  - Real geolocation coordinate tracking and distance calculation (Haversine formula).
  - Search by turf name, area, or city.
  - Sport filter tabs (Football, Cricket, Badminton, etc.).
  - Interactive map with active venue pins.
- **Booking Flow**: Select Turf → Select Arena → Select Date → Select Slot → Review Booking Summary → Choose Payment Option (Pay Now vs Pay Later at Turf) → Confirm Booking.
- **Double Booking Prevention**: Atomic database transactions ensuring two players can never book the same slot simultaneously.
- **Booking & Payment History**: Dedicated history of bookings, paid amounts, and counter dues.
- **Profile Management**: Update name, phone, city, preferred sports, and player bio.

---

## Architecture & Database Collections

Firestore Collections:
- `users/{uid}`: User profile, role (`PLAYER` | `OWNER`), verification state, contact info.
- `turfs/{turfId}`: Owner's sports turfs, geolocation, pricing, hours, photos, and amenities.
- `arenas/{arenaId}`: Arena courts and pitches under each turf.
- `slots/{slotId}`: Date, start/end time, price, status (`AVAILABLE`, `BOOKED_BY_PLAYER`, `BOOKED_BY_OWNER`, `BLOCKED`), and visibility.
- `bookings/{bookingId}`: Confirmed bookings, player ID, owner ID, slot info, total amount, paid amount, due amount, and payment status.
- `paymentTransactions/{transactionId}`: Immutable transaction records for payments and counter settlements.

---

## Configuration & Environment Setup

Firebase configuration is automatically linked via `firebase-applet-config.json` in the AI Studio environment.

### Adding Google Maps API Key (Optional)
If you wish to use Google Maps JS SDK directly:
1. Open `.env.example` and set `GOOGLE_MAPS_API_KEY`.
2. Add your API key in the AI Studio Settings / Secrets panel.

---

## Testing & Verification Steps

1. **Owner Signup**:
   - Select **Turf Owner** role, register with your email.
   - Verify email link and click **Refresh Verification Status**.
   - Create your first Turf (e.g. *TruFit Sports Hub*) and configure coordinates and arenas.
   - Use **Bulk Generate** in the Slots tab to generate slots for today.
2. **Player Booking**:
   - Open in an incognito window or log out and create a **Player** account.
   - Discover your newly created turf on the map.
   - Pick an arena, choose an available slot, and confirm booking with *Pay Later at Turf*.
3. **Owner Ledger Update**:
   - Log back into the Owner account.
   - Note the real-time booking update and pending receivable.
   - Open **Payments** and click **Collect** to record the cash/UPI settlement.
