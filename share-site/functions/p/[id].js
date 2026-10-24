import { getPlaylist, escapeHtml } from "../_shared.js";

export async function onRequest({ env, params, request }) {
  const playlist = await getPlaylist(env, String(params.id || ""));
  if (!playlist) return new Response("Playlist not found.", { status: 404 });
  const origin = new URL(request.url).origin;
  const title = escapeHtml(playlist.name);
  const pageUrl = escapeHtml(origin + "/p/" + encodeURIComponent(playlist.id));
  const description = escapeHtml(String(playlist.song_count) + " songs shared from SoundNeed");
  const html = "<!doctype html><html lang=\"en\"><head>" +
    "<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<meta property=\"og:type\" content=\"website\"><meta property=\"og:site_name\" content=\"SoundNeed\">" +
    "<meta property=\"og:title\" content=\"" + title + "\"><meta property=\"og:description\" content=\"" + description + "\">" +
    "<meta property=\"og:url\" content=\"" + pageUrl + "\"><meta name=\"twitter:card\" content=\"summary\">" +
    "<title>" + title + " - SoundNeed</title></head><body><main><h1>" + title +
    "</h1><p>" + description + "</p><p>Open this link in SoundNeed to import the playlist.</p>" +
    "</main></body></html>";
  return new Response(html, { headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300, s-maxage=300",
    "x-content-type-options": "nosniff",
  }});
}
