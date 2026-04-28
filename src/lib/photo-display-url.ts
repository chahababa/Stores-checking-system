export function normalizePhotoDisplayUrl(photoUrl: string) {
  try {
    const parsedUrl = new URL(photoUrl);
    parsedUrl.pathname = parsedUrl.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return parsedUrl.toString();
  } catch {
    return photoUrl;
  }
}
