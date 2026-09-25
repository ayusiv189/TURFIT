# TruFit landing page update

This folder was based on the uploaded TruFit landing-page source.

## What changed
- Replaced the dark landing experience with a light, 3D dynamic landing page.
- Reused the existing TruFit concepts from the uploaded code: players, owners, bookings, lobbies, teams, verification/trust, pricing direction, admin access.
- Added pre-registration with "1 year free access".
- Added player/owner feature suggestion flow.
- Added Google Forms submission hooks for two separate forms.
- Added separate datasets by design: one Google Form/Sheet for registrations and one for suggestions.
- Added interactive 3D phone hero and mouse parallax.
- Kept `onOpenAdmin`, `onGoToApp`, `isLoggedIn`, `isAdmin`, and `activeRole` props so the page can remain compatible with the existing app integration.

## Google Forms setup

Create TWO forms:

### Form 1 — TruFit Pre-registration
Fields:
1. role
2. name
3. phone
4. email
5. city
6. sport
7. turf

Link this form to its own Google Sheet, e.g. `TruFit_Pre_Registrations`.

### Form 2 — TruFit Feature Suggestions
Fields:
1. role
2. name
3. email
4. city
5. suggestion
6. priority

Link this form to a separate Google Sheet, e.g. `TruFit_Suggestions`.

You can later download each sheet independently:
Google Sheets -> File -> Download -> Microsoft Excel (.xlsx)

## Emailing every submission

Use the Google Apps Script in `google-apps-script/Code.gs` from the previous landing-page package, or attach a simple `onFormSubmit` trigger to each response spreadsheet.

Set the destination admin email to the email address you want to receive:
- every pre-registration
- every feature suggestion

## Configure the React component

At the top of `landing/TruFitLandingPage.tsx`, replace:

- `CONFIG.phone`
- `CONFIG.email`
- `CONFIG.registrationEndpoint`
- `CONFIG.suggestionEndpoint`
- the `entry.*` IDs

with your real values.

The page intentionally saves to localStorage when the Google Form endpoint still contains `YOUR_`, so you can preview the UI before connecting the forms.

## GitHub Pages

Keep the existing Vite base path used by the main project. This landing component does not hard-code `/TURFIT/` asset paths, so it should not introduce the previous GitHub Pages `src/main.tsx` / asset-path problem.

After replacing the component:
1. Run the project's normal build.
2. Confirm the output uses the repository's existing `/TURFIT/` base.
3. Deploy as you normally do.

## Note

The actual phone number and email were not present in the uploaded source. They are placeholders in `CONFIG` rather than invented values.


## Configured TruFit contact details
- Phone / WhatsApp: +91 8435871121
- Email: jaypathak622@gmail.com
- Use the same email as the notification/admin destination for pre-registration and feature-suggestion Google Forms.
