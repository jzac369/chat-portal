# Good old FreeChat

A lightweight, pastel-themed multi-room chat portal with admin moderation, built with plain HTML/CSS/JS and Firebase Firestore.

## Rooms
- **Echo** (blue)
- **Bloom** (pink)
- **Drift** (green)
- **Haven** (lavender)
- **Lumen** (peach)
- **Ember** (coral)

## Setup

1. Create a Firebase project (free Spark plan) at https://console.firebase.google.com
2. Enable **Firestore Database**.
3. Add a Web App in Project settings → copy the config object.
4. Paste the config values into `firebase-config.js`.
5. In Firestore → Rules, set the rules shown in the comment at the bottom of `firebase-config.js`.
6. Enable GitHub Pages for this repo (Settings → Pages → branch `main`, folder `/`).

## Admin access
Open the portal and click "Admin portal" in the footer. Default password: `olejomalba2026` (change it directly in `app.js`, `ADMIN_PASSWORD` constant).

## Features
- No registration — just a nickname to join a room
- Room access restriction via admin-managed allow-lists
- Keyword moderation (auto-censoring with asterisks), toggle on/off
- Kick/remove members per room
- Per-member name coloring
- Realtime updates via Firestore listeners
