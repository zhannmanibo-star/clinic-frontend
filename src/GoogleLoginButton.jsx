import React, { useEffect, useRef, useState } from 'react';
import { googleLogin } from './api';

/* "Sign in with Google" button (Google Identity Services).
   Needs VITE_GOOGLE_CLIENT_ID in the frontend .env. The Google ID token is sent to the
   backend (POST /api/auth/google), which verifies it and returns our own login tokens. */

const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
let gsiPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        gsiPromise = null;
        script.remove();
        reject(new Error('Could not load Google sign-in. Check your internet connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

export default function GoogleLoginButton({ onSuccess, onError, text = 'continue_with' }) {
  const box = useRef(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const handlers = useRef({ onSuccess, onError });
  handlers.current = { onSuccess, onError };

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              handlers.current.onSuccess(await googleLogin(credential));
            } catch (e) {
              handlers.current.onError?.(e);
            }
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'left',
          width: Math.min(360, Math.max(200, box.current.offsetWidth || 320)),
        });
      })
      .catch(() => !cancelled && setLoadFailed(true));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) {
    return import.meta.env.DEV ? (
      <p className="google-missing">
        Google sign-in is hidden: add VITE_GOOGLE_CLIENT_ID to the frontend .env and restart Vite.
      </p>
    ) : null;
  }
  if (loadFailed) {
    return <p className="google-missing">Google sign-in could not load. Check your connection or ad-blocker, or use your email and password.</p>;
  }
  return <div className="google-login" ref={box} />;
}
