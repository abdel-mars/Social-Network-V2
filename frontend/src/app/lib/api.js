// The API is served under /api so it can share an origin with the Next.js
// pages without colliding with them. Uploaded files stay at the root, because
// the database stores paths like "uploads/photo.jpeg".
//
// API_URL already carries the /api prefix, so call sites read
// `${API_URL}/login` and never repeat it.
//
// Resolution order for the backend origin:
//   1. NEXT_PUBLIC_API_URL, set during local development by run.sh.
//   2. The page's own origin, so a production build works on any domain
//      without being rebuilt. Caddy proxies /api to the backend, making this
//      correct behind https.
//   3. localhost:8080, the last resort.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "") ||
  "http://localhost:8080";

export const API_URL = `${API_ORIGIN}/api`;

// WebSocket origin, e.g. wss://example.com. Not derived from API_URL, which
// would carry the /api prefix into the socket path.
export const WS_URL = API_ORIGIN.replace(/^http/, "ws");

// Uploaded files live at the root, outside the /api prefix.
export const UPLOAD_URL = API_ORIGIN;
