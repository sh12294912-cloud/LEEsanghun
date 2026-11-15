export interface PreparedImage {
  base64: string; // data: 접두어 없는 base64
  mediaType: 'image/jpeg';
  dataUrl: string; // 미리보기용
}

/**
 * 사진을 Claude에 보내기 좋은 크기로 줄여 JPEG로 변환.
 * 긴 변 1568px 이하면 품질 손실 없이 처리되고, 업로드도 빨라짐.
 */
export async function prepareImage(file: File, maxEdge = 1568, quality = 0.85): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리할 수 없습니다.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg', dataUrl };
}
