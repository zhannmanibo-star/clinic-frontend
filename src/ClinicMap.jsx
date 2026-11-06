import React from 'react';

/* Clinic location map.
   - With VITE_GOOGLE_MAPS_API_KEY it uses the official Maps Embed API.
   - Without a key it falls back to Google's plain embed, so the map still shows. */

const KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '';
const QUERY =
  import.meta.env?.VITE_CLINIC_MAP_QUERY ||
  'City Health and Sanitation Department, Calapan City, Oriental Mindoro';

export const MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(QUERY);
export const CLINIC_ADDRESS = QUERY;

export default function ClinicMap({ height = 360 }) {
  const src = KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(KEY)}&q=${encodeURIComponent(QUERY)}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(QUERY)}&output=embed`;

  return (
    <div className="clinic-map">
      <iframe
        title="Map showing the clinic location"
        src={src}
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a href={MAP_LINK} target="_blank" rel="noreferrer">
        Open in Google Maps ↗
      </a>
    </div>
  );
}
