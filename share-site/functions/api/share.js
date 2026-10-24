import { jsonResponse, validId } from "../_shared.js";

const MAX_BYTES = 450_000;
const MAX_REQUEST_BYTES = 1_300_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const validBase64 = (value, maxBytes) => Boolean(
  value && value.length <= 600_000 && Math.floor(value.length * 3 / 4) <= maxBytes &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value),
);

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: "Database unavailable." }, 503);
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Request too large." }, 413);
  }
  let payload;
  try { payload = await request.json(); } catch (_) {
    return jsonResponse({ error: "Invalid request." }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  const id = String(payload.id || "");
  const title = String(payload.title || "").trim().slice(0, 180);
  const artist = String(payload.artist || "").trim().slice(0, 180);
  const album = String(payload.album || "").trim().slice(0, 180);
  const deepLink = String(payload.deepLink || "");
  const coverType = String(payload.coverType || "").toLowerCase();
  const coverBase64 = String(payload.coverBase64 || "");
  const previewType = String(payload.previewType || "").toLowerCase();
  const previewBase64 = String(payload.previewBase64 || "");
  const previewWidth = Number(payload.previewWidth || 1200);
  const previewHeight = Number(payload.previewHeight || 630);

  let deepUri;
  try { deepUri = new URL(deepLink); } catch (_) { deepUri = null; }
  if (!validId(id) || !title || !artist || !deepUri ||
      deepUri.protocol !== "soundneed:" || deepUri.hostname !== "track") {
    return jsonResponse({ error: "Invalid song data." }, 400);
  }
  if (!IMAGE_TYPES.has(coverType) || !validBase64(coverBase64, MAX_BYTES)) {
    return jsonResponse({ error: "Invalid cover image." }, 413);
  }
  if (previewType !== "image/jpeg" || !validBase64(previewBase64, MAX_BYTES) ||
      !Number.isInteger(previewWidth) || !Number.isInteger(previewHeight) ||
      previewWidth < 120 || previewHeight < 120 || previewWidth > 4096 || previewHeight > 4096) {
    return jsonResponse({ error: "Invalid preview image." }, 413);
  }

  await env.DB.prepare(
    "INSERT INTO shared_songs " +
    "(id, title, artist, album, cover_base64, cover_type, preview_base64, preview_type, " +
    "preview_width, preview_height, deep_link, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist, " +
    "album=excluded.album, cover_base64=excluded.cover_base64, cover_type=excluded.cover_type, " +
    "preview_base64=excluded.preview_base64, preview_type=excluded.preview_type, " +
    "preview_width=excluded.preview_width, preview_height=excluded.preview_height, " +
    "deep_link=excluded.deep_link, created_at=CURRENT_TIMESTAMP",
  ).bind(id, title, artist, album, coverBase64, coverType, previewBase64, previewType,
    previewWidth, previewHeight, deepLink).run();
  return jsonResponse({ url: new URL("/s/" + id, request.url).toString() }, 201);
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return new Response(null, { headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  }});
  if (context.request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const response = await onRequestPost(context);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(response.body, { status: response.status, headers });
}
