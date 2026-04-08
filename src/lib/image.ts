export type CompressedImage = {
  base64: string;
  contentType: string;
  fileName: string;
};

const MAX_BYTES = 500 * 1024;
const MAX_DIMENSION = 1920;

export async function compressImage(file: File): Promise<CompressedImage> {
  const imageBitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.max(1, Math.round(imageBitmap.width * ratio));
  const height = Math.max(1, Math.round(imageBitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("無法建立圖片壓縮畫布。");
  }

  context.drawImage(imageBitmap, 0, 0, width, height);

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > MAX_BYTES && quality > 0.2) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  const base64 = await blobToBase64(blob);
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";

  return {
    base64,
    contentType: blob.type || "image/jpeg",
    fileName: `${crypto.randomUUID()}.${extension}`,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("圖片壓縮失敗。"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("圖片讀取失敗。"));
        return;
      }
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("圖片讀取失敗。"));
    reader.readAsDataURL(blob);
  });
}
