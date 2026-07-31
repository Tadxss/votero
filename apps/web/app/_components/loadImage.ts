// Shared by downloadResults.ts (branded PDF report) and downloadPoster.ts (QR poster) — both need
// to draw a creator-uploaded brand logo onto a <canvas>, which requires crossOrigin="anonymous" to
// avoid tainting the canvas (Supabase's public-bucket storage responses already send permissive
// CORS headers, same bucket the <img> tags on vote/present already load from without issue).
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    img.src = url;
  });
}
