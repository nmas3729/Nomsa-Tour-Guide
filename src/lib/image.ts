export const DEFAULT_IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

export function imageAlt(alt: string | null | undefined, fallback = "Tour experience in South Africa") {
  return alt?.trim() || fallback;
}

export function cloudinaryImageUrl(
  source: string,
  { width, quality = "auto" }: { width?: number; quality?: number | "auto" } = {},
): string {
  if (!source.startsWith("https://res.cloudinary.com/")) {
    return source;
  }

  const parts = source.split("/upload/");
  if (parts.length !== 2) {
    return source;
  }

  const transforms = ["f_auto", `q_${quality}`, ...(width ? [`w_${Math.round(width)}`] : [])];
  return `${parts[0]}/upload/${transforms.join(",")}/${parts[1]}`;
}
