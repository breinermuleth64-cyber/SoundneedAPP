import { jsonResponse, validId, getPlaylist } from "../_shared.js";

const MAX_REQUEST_BYTES = 1_300_000;
const validBase64 = (value) => Boolean(value && value.length <= 600_000 &&
  Math.floor(value.length * 3 / 4) <= 450_000 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value));

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: "Database unavailable." }, 503);
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Request too large." }, 413);
  }
  let body;
  try { body = await request.json(); } catch (_) {
    return jsonResponse({ error: "Invalid request." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  const id = String(body.id || "");
  const name = String(body.name || "").trim().slice(0, 120);
  const songCount = Number(body.songCount);
  const payload = String(body.payload || "");
  const previewType = String(body.previewType || "").toLowerCase();
  const previewBase64 = String(body.previewBase64 || "");
  if (!validId(id) || !name || !Number.isInteger(songCount) || songCount < 1 || songCount > 300) {
    return jsonResponse({ error: "Invalid playlist data." }, 400);
  }
  if (!payload || payload.length > 350_000 || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    return jsonResponse({ error: "Invalid playlist payload." }, 413);
  }
  if (previewType !== "image/jpeg" || !validBase64(previewBase64)) {
    return jsonResponse({ error: "Invalid preview image." }, 413);
  }
  await env.DB.prepare(
    "INSERT INTO shared_playlists (id, name, song_count, payload, preview_base64, preview_type, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(id) DO UPDATE SET name=excluded.name, song_count=excluded.song_count, " +
    "payload=excluded.payload, preview_base64=excluded.preview_base64, " +
    "preview_type=excluded.preview_type, created_at=CURRENT_TIMESTAMP",
  ).bind(id, name, songCount, payload, previewBase64, previewType).run();
  return jsonResponse({ url: new URL("/p/" + id, request.url).toString() }, 201);
}

export async function onRequest({ request, env, params }) {
  if (request.method === "POST") return onRequestPost({ request, env });
  if (request.method === "GET" && params?.id) {
    const playlist = await getPlaylist(env, String(params.id));
    if (!playlist) return jsonResponse({ error: "Playlist not found." }, 404);
    return jsonResponse({ name: playlist.name, songCount: playlist.song_count, payload: playlist.payload });
  }
  return new Response("Method not allowed", { status: 405 });
}
