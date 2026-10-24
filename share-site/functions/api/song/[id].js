import { getSong } from "../../_shared.js";

export async function onRequest({ env, params }) {
  const song = await getSong(env, String(params.id || ""));
  if (!song) return Response.json({ error: "Song not found." }, { status: 404 });
  return Response.json({
    title: song.title,
    artist: song.artist,
    album: song.album,
    deepLink: song.deep_link,
  }, { headers: { "cache-control": "public, max-age=300" } });
}
