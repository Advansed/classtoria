export const MAX_VIDEO_DURATION_SEC = 60;

export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
};

export type ProcessedCollectionVideo = {
  video: File;
  preview: File;
  previewUrl: string;
  durationLabel: string;
  videoExtension: string;
};

const formatDurationLabel = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

export const videoFileExtension = (file: File): string => {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }
  const type = file.type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (type === 'quicktime') {
    return 'mov';
  }
  if (type && /^[a-z0-9]{2,5}$/.test(type)) {
    return type;
  }
  return 'mp4';
};

/** Проверка: только видео, длительность не больше 1 минуты. */
export const readVideoMetadata = (file: File): Promise<VideoMetadata> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i)) {
      reject(new Error('Можно загрузить только видео'));
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Не удалось определить длительность видео'));
        return;
      }
      if (duration > MAX_VIDEO_DURATION_SEC) {
        reject(new Error('Видео длиннее 1 минуты. Выберите более короткий ролик.'));
        return;
      }

      resolve({ duration, width, height });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Не удалось прочитать видео'));
    };

    video.src = url;
  });

const extractPreviewWithCanvas = async (file: File, atSec = 1): Promise<File> => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Не удалось извлечь кадр для превью'));
    });

    video.currentTime = Math.min(atSec, Math.max(0, (video.duration || atSec) - 0.1));

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const maxSide = 200;
    const vw = video.videoWidth || 100;
    const vh = video.videoHeight || 100;
    const ratio = Math.min(maxSide / vw, maxSide / vh, 1);
    const cw = Math.max(1, Math.round(vw * ratio));
    const ch = Math.max(1, Math.round(vh * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas недоступен');
    }
    ctx.drawImage(video, 0, 0, cw, ch);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Не удалось создать превью'))),
        'image/jpeg',
        0.72,
      );
    });

    return new File([blob], 'preview.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Без перекодирования: исходный файл + JPEG-превью для списка. */
export const prepareCollectionVideoUpload = async (file: File): Promise<ProcessedCollectionVideo> => {
  const meta = await readVideoMetadata(file);
  const preview = await extractPreviewWithCanvas(file);
  const videoExtension = videoFileExtension(file);

  return {
    video: file,
    preview,
    previewUrl: URL.createObjectURL(preview),
    durationLabel: formatDurationLabel(meta.duration),
    videoExtension,
  };
};

export const revokeVideoPreviewUrl = (url: string | undefined): void => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};
