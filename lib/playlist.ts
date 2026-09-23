// Huangguo playlists live under /videos5/<video id>/ and reference their
// segments by the same id, so a playlist naming a different id than the URL it
// was requested from is the CDN's anti-hotlinking decoy rather than the episode.
export function playlistVideo(urlOrManifest:string){return urlOrManifest.match(/\/videos5\/([^/]+)\//)?.[1]||'';}
export function decoyPlaylist(url:string,manifest:string){
  const requested=playlistVideo(url);const served=playlistVideo(manifest);
  return !!requested&&!!served&&requested!==served;
}
