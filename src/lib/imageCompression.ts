/**
 * Compresses an image file in the browser before upload so large phone photos
 * (often 6–12 MB) fit within storage bucket limits.
 * Returns the original file untouched if it's small enough, not compressible,
 * or if compression fails for any reason.
 */
export async function compressImage(
  file: File,
  maxBytes = 4 * 1024 * 1024,
  maxDimension = 3000,
  quality = 0.85
): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    if (file.type === "image/gif" || file.size <= maxBytes) return file;

    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
