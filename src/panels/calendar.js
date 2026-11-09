import { CLINIC_ADDRESS } from '../ClinicMap';

// A "Add to Google Calendar" link for a patient's ticket (works without any key or login on our side).
export function calendarLink(t) {
  const mins = (s) => {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + m;
  };
  const start = mins(t.estimated_time || t.start_time || '08:00');
  const slot = Math.max(
    10,
    Math.floor((mins(t.end_time) - mins(t.start_time)) / Math.max(1, Number(t.max_slots) || 1))
  );
  const stamp = (m) =>
    t.appointment_date.replaceAll('-', '') +
    'T' +
    String(Math.floor(m / 60) % 24).padStart(2, '0') +
    String(m % 60).padStart(2, '0') +
    '00';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Clinic visit: ${t.doctor_name} (Queue #${t.queue_number})`,
    dates: `${stamp(start)}/${stamp(start + slot)}`,
    ctz: 'Asia/Manila',
    details: `Calapan City Health Clinic. Queue number ${t.queue_number}. Bring your QR ticket.`,
    location: CLINIC_ADDRESS,
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

