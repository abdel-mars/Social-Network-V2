// The API is served under /api so it can share an origin with the Next.js
// pages without colliding with them. Uploaded files stay at the root, because
// the database stores paths like "uploads/photo.jpeg".
//
// NEXT_PUBLIC_API_URL is the backend's scheme and host. It is inlined at build
// time, so leave it unset for local development, where the backend runs on
// :8080. API_URL already carries the /api prefix, so call sites read
// `${API_URL}/login` and never repeat it.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const API_URL = `${API_ORIGIN}/api`;

// WebSocket origin, e.g. wss://example.com. Not derived from API_URL, which
// would carry the /api prefix into the socket path.
export const WS_URL = API_ORIGIN.replace(/^http/, "ws");

// Uploaded files live at the root, outside the /api prefix.
export const UPLOAD_URL = API_ORIGIN;
