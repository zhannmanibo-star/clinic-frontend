import React, { useEffect, useRef, useState } from 'react';

/* Camera QR scanner for the staff check-in. Calls onScan(text) once with the QR text.
   The camera only works on https:// or http://localhost. */

export default function QrScanner({ onScan }) {
  const [error, setError] = useState('');
  const handled = useRef(false);
  const callback = useRef(onScan);
  callback.current = onScan;

  useEffect(() => {
    let scanner = null;
    let started = false;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode'); // loaded only when the scanner opens
        if (cancelled) return;
        scanner = new Html5Qrcode('qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (handled.current) return;
            handled.current = true;
            callback.current(text.trim());
          },
          () => {}
        );
        started = true;
        if (cancelled) {
          await scanner.stop().catch(() => {});
          scanner.clear();
        }
      } catch (e) {
        if (cancelled) return;
        const denied = /permission|denied|notallowed/i.test(String(e?.name || e));
        setError(
          denied
            ? 'Camera access was blocked. Allow the camera in the browser, or type the QR text instead.'
            : 'Could not start the camera. Use https:// or localhost, or type the QR text instead.'
        );
      }
    })();

    return () => {
      cancelled = true;
      if (scanner && started) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, []);

  return (
    <>
      <div id="qr-reader" className="qr-reader" />
      {error && (
        <p className="live-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
