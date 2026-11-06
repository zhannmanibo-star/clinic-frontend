export const API_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
let tokens = null;
let refreshPromise = null;
const storageKey = 'clinic-session-v1';
export function restoreSession() {
  try { tokens = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { tokens = null; }
  return Boolean(tokens?.access_token);
}
export function saveTokens(value) {
  if (!value?.access_token || !value?.refresh_token) throw new Error('Invalid login response from the server.');
  tokens = value;
  sessionStorage.setItem(storageKey, JSON.stringify(value));
}
export function clearSession() { tokens = null; sessionStorage.removeItem(storageKey); }
async function send(path, method, body, token) {
  let response;
  try {
    response = await fetch(API_URL + path, {method, headers: {Accept: 'application/json', ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body !== undefined ? {body: JSON.stringify(body)} : {})});
  } catch { throw new Error('Cannot reach the clinic API. Check that the PHP server is running on port 3000.'); }
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`API returned an invalid response (HTTP ${response.status}). Check the PHP terminal for errors.`); }
  if (!response.ok) { const error = new Error(data.error || data.message || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}
export async function api(path, {method = 'GET', body, auth = true} = {}) {
  const usedToken = tokens?.access_token;
  try { return await send(path, method, body, auth ? usedToken : null); }
  catch (error) {
    if (!auth || error.status !== 401 || !tokens?.refresh_token) throw error;
    // A concurrent request may already have refreshed the access token.
    if (tokens.access_token === usedToken) {
      if (!refreshPromise) {
        refreshPromise = send('/auth/refresh', 'POST', {refresh_token: tokens.refresh_token}).then(data => saveTokens(data.tokens)).catch(err => {
          if ([401,403].includes(err.status)) { clearSession(); window.dispatchEvent(new Event('clinic-session-expired')); }
          throw err;
        }).finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
    }
    return send(path, method, body, tokens?.access_token);
  }
}
export async function login(body, register = false) {
  const result = await api(register ? '/auth/register' : '/auth/login', {method:'POST',body,auth:false});
  saveTokens(result.tokens);
  return result.user;
}
export async function logout() {
  try { if (tokens?.refresh_token) await api('/auth/logout', {method:'POST',body:{refresh_token:tokens.refresh_token},auth:false}); }
  finally { clearSession(); }
}
// "Sign in with Google": sends the Google ID token to the backend, which verifies it and returns our own tokens.
export async function googleLogin(credential) {
  const result = await api('/auth/google', {method:'POST',body:{credential},auth:false});
  saveTokens(result.tokens);
  return result.user;
}
