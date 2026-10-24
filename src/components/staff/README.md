# Staff panel

Files: StaffPanel.jsx, StaffPanel.css. This component also imports ../patient/PatientPanel.css for shared panel styles; keep both component folders when copying it.

```jsx
import StaffPanel from './components/staff/StaffPanel';
<StaffPanel onLogout={yourLogoutHandler} logoUrl="/images/your-logo.png" />
```

Props: onLogout, onOpenDoctorConsole, clinicPhone, logoUrl. There is no default logo or photo.

Screens: Dashboard; Queue; Schedules; Records; Email; Users.

Demo behavior: check in a sample queue number; issue walk-in numbers; complete/skip/call the next checked-in patient; return skipped patients; filter queue status; add/close/reopen schedules; search/open synthetic records; fill email templates; simulate email submission; create sample invitations; change mock roles. Dashboard counts and recent activity update from demo state.

All changes are held in memory and reset when reloaded or unmounted. The patient and staff panels have separate mock datasets, not a shared backend. Patient QR references are not accepted by the staff queue: staff manual entry uses the queue numbers shown in its own list. Camera QR scanning is not implemented. No emails or invitations are sent, no accounts are created, no real roles/access are changed. The doctor console is an integration hook only.

Connect the LavaLust API for persistence, authenticated access, secure QR validation, actual capacity, records and email delivery. Live role/invitation management must be restricted to administrators server-side. Frontend controls are not access enforcement.
