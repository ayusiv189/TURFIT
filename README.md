# TruFit — Sports Turf Discovery & Booking Platform

TruFit is a complete sports turf management, discovery, booking, and payment dues tracking platform. It operates as a synchronized ecosystem comprising a high-fidelity Web client and a native Expo React Native Mobile application, both linked to a central Firebase Firestore and Authentication backend.

---

## Complete Core Features & Phase 1 Implementations

### 1. Unified Authentication & Role-Based Flow
- Role Persona Setup: Separate registration and tailored workflows for Players (Athletes) and Venue Owners (Partners).
- Email & Password Registration: Integrated secure user authentication.
- Real-Time Verification Flow: Mandatory email verification layer that prevents platform access until the user has successfully clicked their verification link.
- Security Fallbacks: Direct password reset workflows and verification status refresh actions to guarantee responsive session recovery.

### 2. Player Discovery & Athlete Workflow
- Geolocation Detection: Live coordinates acquisition and precise distance computations to nearby arenas.
- Sport Categorization Tabs: Instant filtering by sports (Football, Cricket, Badminton, Pool, PS5, VR, etc.).
- Interactive Map Canvas: A real-time visual map pinning all nearby sport facilities and grounds.
- Seamless Booking Engine: Real-time selection of grounds, arenas, playing dates, and hourly slots.
- Collision Protection: Transaction-safe reservation pipelines to prevent concurrent double-bookings.
- My Bookings Ledger: Full list of upcoming, past, and cancelled sessions, complete with entry receipts and visual summaries.
- Rewards and Gamification: Personal player stats trackers, loyalty point accumulations, and daily streaks.

### 3. Venue Owner & Partner Workflow
- Multi-Metric Dashboard: Live statistics covering daily revenue, occupied slots, upcoming bookings, total collections, and pending dues.
- Venue Configuration: Dynamic tools to manage ground parameters, city locations, amenities, photos, opening times, and GPS coordinates.
- Multi-Arena Pitch Setup: Support for multiple courts, turf sizes, and individual sports under a single venue profile.
- Automated Slot Generator: Bulk-generation of 1-hour slots throughout operational hours, with single-toggle block/unblock actions for pitch maintenance.
- Over-The-Desk Walk-Ins: Direct front-desk booking registrations for manual offline players.
- Counter Receivable Ledger: Dynamic tracking of players who selected "Pay Later" with one-click collection status logs.

---

## Phase 2 Implementation: Dynamic Tab Visibility & Admin Control

To give platform administrators total control over the user experience and feature releases, we implemented a Live Tab Visibility and Dynamic Navigation management layer.

### 1. Super Admin Navigation Panel
- An interactive, premium visibility console has been integrated directly into the Admin dashboard.
- Features are listed as modular switches under distinct Player and Owner sections.
- Supports instant toggling for 10 Player Navigation tabs: Home Dashboard, Turfs Discovery, Gaming Zone, Community Lobbies, Squads & Teams, Match Schedules, Rewards, Player Stats, My Bookings, and Player Dues.
- Supports instant toggling for 10 Owner Navigation tabs: Owner Overview, Analytics Console, My Turf, Slot Management, Live Bookings, Player Dues, Payment VPA Settings, Promos, Player Reviews, and Venue Profile.

### 2. Live Cloud Propagation
- Toggle selections are instantly pushed to Firestore settings documents.
- Features automatic auditing including the updater's name (e.g., Super Admin) and precise modification timestamps.
- Features an "Enable All" restore switch to immediately roll back any visibility overrides.

### 3. Real-Time UI Re-Rendering
- The main Web navigation wrapper acts on a real-time interval stream to pull configuration updates.
- If a feature tab is toggled OFF by an administrator, it is instantly filtered out and hidden from the bottom navigation tray for all active users without requiring any application reloads.

---

## Mobile Application Features (React Native / Expo)

The TruFit Mobile application represents a highly complete, native companion client mirroring all platform behaviors and supporting identical feature gates:

- Device Geolocation: Native GPS location capture to immediately identify nearby active turfs.
- QR-Code Gate Passes: Generation of active digital tickets for simple check-ins at ground counters.
- Push Notifications and SMS: Live updates on booking approvals, game invitations, and payment reminders.
- Split-Bill Calculators: Dynamic tools to let players split slot fees with teammates directly inside the payments tab.
- Pick-Up Lobbies: Social matchmaking enabling users to host open lobbies or click "I'm In" to join nearby games.
- Squad Management: Squad creation tools, Captain assignments, custom squad rosters, and win-rate trackers.
- Offline-First Optimization: Heavy caching of discovery details to ensure fast, low-data mobile performance.

---

## Verifications & Functional Tests

1. Authentication Check: Register a user, verify the mandatory email verification screen, and follow the link to gain access.
2. Owner Setup: Build a turf profile, generate arenas, and bulk-create slots.
3. Booking Execution: Search as a player, select a slot on the map, and purchase using counter billing.
4. Visibility Verification: As an Admin, toggle off a tab (such as Gaming Zone or Rewards) and observe that the tab immediately vanishes from the Player's bottom navigation bar.
