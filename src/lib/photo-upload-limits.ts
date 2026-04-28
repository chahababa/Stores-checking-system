export const MAX_COMPRESSED_IMAGE_BYTES = 350 * 1024;
export const MAX_PHOTOS_PER_ITEM = 3;
export const MAX_PHOTOS_PER_INSPECTION = 10;

export function getPhotoLimitMessage() {
  return `照片太多或太大時可能導致送出失敗；每個項目最多 ${MAX_PHOTOS_PER_ITEM} 張，單次巡店最多 ${MAX_PHOTOS_PER_INSPECTION} 張。`;
}

export function canAddInspectionPhotos(params: {
  existingItemPhotoCount: number;
  existingInspectionPhotoCount: number;
  incomingPhotoCount: number;
}) {
  const nextItemPhotoCount = params.existingItemPhotoCount + params.incomingPhotoCount;
  const nextInspectionPhotoCount = params.existingInspectionPhotoCount + params.incomingPhotoCount;

  return nextItemPhotoCount <= MAX_PHOTOS_PER_ITEM && nextInspectionPhotoCount <= MAX_PHOTOS_PER_INSPECTION;
}
