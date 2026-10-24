export const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export const validId = (id) => /^[A-Za-z0-9_-]{12,24}$/.test(id || "");

export async function getSong(env, id) {
  if (!validId(id) || !env.DB) return null;
  return env.DB.prepare(
    "SELECT id, title, artist, album, cover_base64, cover_type, preview_base64, preview_type, preview_width, preview_height, deep_link FROM shared_songs WHERE id = ?",
  ).bind(id).first();
}

export async function getPlaylist(env, id) {
  if (!validId(id) || !env.DB) return null;
  return env.DB.prepare(
    "SELECT id, name, song_count, payload, preview_base64, preview_type FROM shared_playlists WHERE id = ?",
  ).bind(id).first();
}
