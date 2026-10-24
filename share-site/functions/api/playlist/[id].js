import { getPlaylist } from "../../_shared.js";

export async function onRequest({ env, params }) {
  const playlist = await getPlaylist(env, String(params.id || ""));
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });
  return Response.json({
    name: playlist.name,
    songCount: playlist.song_count,
    payload: playlist.payload,
  }, { headers: { "cache-control": "public, max-age=300" } });
}
