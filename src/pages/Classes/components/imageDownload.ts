const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic)$/i;

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

export const guessImageFilename = (imageId?: string, storageKey?: string): string => {
  const fromKey = storageKey?.split('/').pop()?.split('?')[0]?.trim();
  if (fromKey && IMAGE_EXT.test(fromKey)) {
    return fromKey;
  }
  if (imageId?.trim()) {
    return `photo-${imageId.trim()}.jpg`;
  }
  return `photo-${Date.now()}.jpg`;
};

const mimeFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
};

async function fetchImageBlob(url: string): Promise<Blob> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error('Нет изображения для сохранения');
  }

  const response = await fetch(trimmedUrl);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки (${response.status})`);
  }

  return response.blob();
}

/** Прямое скачивание без диалога (запасной вариант). */
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Сохранить фото с диалогом «Сохранить как» (File System Access API).
 * Если API недоступен — системный диалог браузера через download.
 */
export async function saveImageWithDialog(
  url: string,
  suggestedName: string,
): Promise<'saved' | 'cancelled'> {
  const filename = suggestedName.trim() || 'photo.jpg';
  const blob = await fetchImageBlob(url);
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;

  if (picker) {
    try {
      const handle = await picker.call(window, {
        suggestedName: filename,
        types: [
          {
            description: 'Изображение',
            accept: {
              [mimeFromFilename(filename)]: [
                '.jpg',
                '.jpeg',
                '.png',
                '.webp',
                '.gif',
              ],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      throw err;
    }
  }

  await downloadBlob(blob, filename);
  return 'saved';
}
