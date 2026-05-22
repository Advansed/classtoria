const MAIN_MAX_WIDTH = 400;
const MAIN_MAX_HEIGHT = 800;
const PREVIEW_MAX_WIDTH = 100;
const PREVIEW_MAX_HEIGHT = 200;
const MAIN_JPEG_QUALITY = 0.85;
const PREVIEW_JPEG_QUALITY = 0.72;

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });

const fitSize = (
  width: number,
  height: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } => {
  const ratio = Math.min(maxW / width, maxH / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Сжатие не удалось'))),
      'image/jpeg',
      quality,
    );
  });

const renderJpeg = async (
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
  quality: number,
): Promise<Blob> => {
  const { width, height } = fitSize(srcW, srcH, maxW, maxH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas недоступен');
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToJpegBlob(canvas, quality);
};

export type ProcessedCollectionImage = {
  file: File;
  preview: File;
  previewUrl: string;
};

/** file.jpg до 400×800, preview.jpg до 100×200 (пропорции сохраняются). */
export const processCollectionImage = async (file: File): Promise<ProcessedCollectionImage> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Можно добавить только изображения');
  }

  const img = await loadImageElement(file);
  const mainBlob = await renderJpeg(
    img,
    img.naturalWidth,
    img.naturalHeight,
    MAIN_MAX_WIDTH,
    MAIN_MAX_HEIGHT,
    MAIN_JPEG_QUALITY,
  );

  const mainFile = new File([mainBlob], 'file.jpg', { type: 'image/jpeg' });

  const previewBlob = await renderJpeg(
    img,
    img.naturalWidth,
    img.naturalHeight,
    PREVIEW_MAX_WIDTH,
    PREVIEW_MAX_HEIGHT,
    PREVIEW_JPEG_QUALITY,
  );

  const previewFile = new File([previewBlob], 'preview.jpg', { type: 'image/jpeg' });

  return {
    file: mainFile,
    preview: previewFile,
    previewUrl: URL.createObjectURL(previewFile),
  };
};
