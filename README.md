# Office Quiz Arena v3

## Screens
- `/host.html` — host console
- `/tv.html?room=ABCD` — projector / TV display
- `/join.html?room=ABCD` — employee registration + player
- `/audience.html?room=ABCD` — audience polling
- `/admin.html` — question bank editor

## Features
- Employee name + employee code registration
- Duplicate employee-code prevention
- QR joining
- Random Fastest Finger selection (default 7)
- Non-winners in a selected Fastest Finger group are eliminated permanently
- Configurable prize ladder in server state
- Live leaderboard
- Audience Poll
- 50:50, Audience, Phone-a-Friend lifelines
- Dedicated TV/projector screen
- Admin question bank
- MySQL persistence when DB_* variables are configured
- In-memory fallback for local testing

## Hostinger
Recommended: Business or Cloud Node.js Web App hosting. Upload this ZIP or deploy from GitHub.
Start command: `node server.js`
Set environment variables from `.env.example`.
For production, configure MySQL so the question bank survives restarts.

IMPORTANT:
Do not put Hostinger passwords, database passwords, or admin passwords into chat. Enter them directly into Hostinger environment variables.
