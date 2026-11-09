# Calapan Clinic — connected React frontend

## Start locally (Windows / PowerShell)

1. Keep your existing PHP backend and Aiven settings. No backend files need replacing.
2. In the backend folder, run `php lava serve --port=3000`.
3. Extract this frontend ZIP into a separate folder. Open the folder containing package.json.
4. Run `npm install`, then `npm run dev`.
5. Open http://localhost:5173. Choose Login and use an account created by your backend seed, or register a new patient.
6. For admin: email `admin@clinic.test`, password = the SEED_PASSWORD used when that account was created.

Requires a Vite-compatible Node version (22.12+ recommended). The ZIP excludes node_modules; npm install restores dependencies. The supplied frontend .env contains public connection settings only. Do not copy the backend .env into this folder.

## Connection

The development server forwards `/api` to `http://127.0.0.1:3000` using vite.config.js. This avoids cross-origin browser requests during local development. Change BACKEND_URL in the frontend .env if PHP runs on another port, then restart Vite. Use localhost:5173 consistently. Port 5173 is fixed; stop another process using it instead of silently switching ports.

For production, configure VITE_API_URL to your HTTPS API base URL ending in /api before building, and allow the exact frontend origin in the backend CORS_ORIGINS. Alternatively, configure your host to proxy /api. Vite's development proxy is not included in static production files. Do not expose development setup routes on a public deployment.

## What is connected

- One login form, patient registration, server-returned role selection, bearer authentication, automatic refresh-token rotation, session restore, and logout.
- Patient: dashboard, available schedules, booking, appointment cancellation, real QR code text from the API, own records, profile editing.
- Staff/admin: dashboard, appointments, confirmation/cancellation, queue check-in by QR text, call-next/complete/skip, schedule creation/open/close, patients and doctors creation/editing, records creation/editing, email to a selected doctor, email delivery log.
- Admin: staff/admin account creation and editing; users list.
- Doctor: dashboard, own appointments and queue, schedules, patient record reading and permitted writing. Server permissions remain authoritative.

The landing layout is retained. `src/LivePanel.jsx` is the active API-backed workspace after login, using the landing page's navy/coral palette. Original PatientPanel and StaffPanel components and preview entries are retained only as design references. `src/main.jsx` now starts App, not PatientPreview. Their sample data is never used by the live workspace.

Password reset, certificate generation and a deletion UI are not implemented. Manual QR text check-in is still available next to the camera scanner. Email delivery requires backend mail configuration; a queued response does not mean delivered. Landing-page marketing details and public sample schedule remain illustrative and labelled; signed-in schedules come from the API.

## The 5 integrations (frontend side)

| Integration | Where | Needs in this folder's `.env` |
|---|---|---|
| Google login | "Sign in with Google" button under the login/register form (`GoogleLoginButton.jsx`) | `VITE_GOOGLE_CLIENT_ID` |
| Email (Brevo) | Staff > Email log: "Appointment reminders" and "Email a doctor" | nothing (keys live in the backend) |
| QR code | Patient ticket (drawn with `qrcode.react`); staff Queue > "Scan with camera" (`QrScanner.jsx`, `html5-qrcode`) | nothing. The camera needs https:// or localhost |
| Google Maps | Landing page "Find the clinic" and a "Clinic map" tab after login (`ClinicMap.jsx`) | `VITE_GOOGLE_MAPS_API_KEY` (optional: without it a plain Google embed is used) |
| Google Calendar | Staff > Schedules > "Sync with Google Calendar"; patient ticket > "Add to Google Calendar"; optional staff "Calendar" tab | `VITE_GOOGLE_CALENDAR_ID` (optional, only for the in-portal calendar tab) |

After editing `.env`, restart `npm run dev`. On Vercel, add the same `VITE_...` variables under Project Settings > Environment Variables and redeploy.

## Verification

`npm run build` — production compilation.
`npm test` — nine mocked HTTP tests: login payload, rejected credentials, concurrent refresh, expired refresh, logout, non-JSON error handling, booking payload, and Google login (accepted and rejected).

Backend endpoint/field contracts were inspected in the supplied PHP source. An end-to-end connection to your running WAMP/Aiven database was not available in the editing environment. Browser visual testing was not completed here. Test locally in this order:

1. Wrong password should show an error without entering the portal.
2. Login with the seeded admin, staff, patient and doctor accounts; each sees its appropriate menu.
3. Admin/staff creates a future schedule; patient books it and receives a queue number and QR ticket.
4. Refresh the browser; the account is revalidated using /auth/me and saved data reloads.
5. Check /setup/status locally to confirm appointment and queue rows were saved.
6. Check in on the appointment date, call/complete the ticket, and verify the patient status updates after Refresh.
7. Logout, then refresh: the login/landing page should return.

## Troubleshooting

- Cannot reach API: keep PHP running on 127.0.0.1:3000.
- Invalid email/password: use the original seeded password; changing SEED_PASSWORD later does not reset existing users.
- Invalid response: inspect PHP's terminal for the underlying error; HTML error pages are not shown as successful API data.
- 403: the signed-in role may not have permission.
- Missing tables: use the existing local /setup/migrate flow before login.
- Empty schedules: create one in the staff/admin portal.

Tokens are stored in sessionStorage for this browser tab; passwords are not saved. Sign out on shared computers. No Aiven password, JWT signing secret or CA certificate belongs in the frontend.

## Workspace design (all roles)

`src/LivePanel.jsx` loads data and runs actions; the screens live in `src/panels/`:

- `PatientViews.jsx` — dashboard, book a visit (doctor, date, session), my appointments, QR ticket with visit progress, visit records, profile.
- `DoctorViews.jsx` — My patients (today's patients / patient records), visit history and notes. `DocumentPrint.jsx` — medical certificate, referral letter and prescription with a saved e-signature and browser print / Save as PDF.
- `StaffViews.jsx` — staff and admin dashboard, appointments, queue management, public queue display (self-refreshing), schedules, email and users.
- Only admins can create doctor and staff accounts (Users > Create account). Staff can still add patients.
- Vitals, lab results and a recent-activity feed from the design mock-ups are not shown because the backend has no endpoints for them.
