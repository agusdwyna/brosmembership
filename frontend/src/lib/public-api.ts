import axios from 'axios';

/**
 * Bare client for the unauthenticated public endpoints.
 *
 * Deliberately separate from `lib/api`: that instance attaches the operator's
 * token and, on any 401, wipes the session and redirects to /login. A visitor
 * opening a shared card must never be bounced there because a stale token was
 * still sitting in localStorage.
 */
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
