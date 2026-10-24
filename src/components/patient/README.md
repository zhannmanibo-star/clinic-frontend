# Patient panel — drop-in React component

Copy PatientPanel.jsx and PatientPanel.css into the same folder, for example src/components/patient/.

Install dependencies inside your existing React project:

```sh
npm install lucide-react qrcode.react
```

Import and render it from the page/route you choose:

```jsx
import PatientPanel from './components/patient/PatientPanel';

export default function PatientPage() {
  return <PatientPanel onLogout={() => { window.location.hash = 'login'; }} />;
}
```

IMPORTANT: The parent app must actually stop rendering PatientPanel when onLogout is called. If your app uses React Router, navigate to your login route instead. The callback is a navigation hook, not server-side logout. This panel does not implement authentication.

Included: Dashboard, doctor/date/time selection, local demo booking, appointment status filters, cancellation confirmation, QR tickets, print layout, Google Calendar draft link, editable profile with reset, contact panel, responsive layout.

All state is in memory and resets on reload/unmount. QR codes contain only a DEMO_ONLY marker and demo reference; they are not valid clinic credentials. Capacity, queue numbers, profiles and appointments are samples. Calendar opens a draft for the user to review; no calendar event is created automatically. Names/clinic details follow the screenshots, but the dates are generated relative to the day the component opens. Sunday dates and the 10:00 sample slot are disabled.

Props:
- onLogout: callback for your existing sign-out/navigation flow.
- onContactClinic: optional callback replacing the built-in contact panel.
- clinicPhone: optional display/contact number.

No default photos or logo image are included. Pass logoUrl="/images/your-logo.png" when your logo is ready. CSS is scoped under .patient-panel with pp- class names to reduce conflicts with your landing page.

Backend work: replace mock arrays with LavaLust API data; validate capacity and profile changes on the server; enforce authentication/roles; generate and validate secure ticket tokens server-side. Do not treat client-side navigation as access control.

- logoUrl: optional URL for your own logo; empty shows a placeholder.
