/**
 * Resolves the backend base URL at build time. Set NEXT_PUBLIC_API_URL in the
 * deployment environment (Vercel) to your Render-hosted backend, e.g.
 *   NEXT_PUBLIC_API_URL=https://causal-tutor-api.onrender.com
 *
 * The NEXT_PUBLIC_ prefix is required by Next.js to embed the value in the
 * client bundle. Defaults to localhost for local docker-compose dev.
 */
const RAW = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = RAW.replace(/\/+$/, ""); // strip trailing slashes

export function apiUrl(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : "/" + path}`;
}
