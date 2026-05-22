import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { Calendar, ChevronDown, FolderOpen, ImagePlus, Info, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { addImage } from '../classesApi';
import { useClassesStore } from '../classesStore';
import { CLASSES_COLLECTION_CREATE, CLASSES_UPLOAD } from '../routes';
import type {
  ClassCollection,
  ClassEvent,
  ClassImage,
  CollectionUploadRouteState,
} from '../types';
import {
  collectionLabel,
  collectionSelectValue,
  parseCollectionSelectValue,
} from './collectionFormUtils';
import { processCollectionImage } from './collectionImageProcessing';
import {
  logUploadAction,
  logUploadError,
  logUploadOk,
} from './collectionUploadLog';
import {
  buildCollectionImageBasePath,
  resolveImagePublicUrl,
  uploadJpegToStorage,
} from './collectionUploadStorage';
import { useClassImageSrc } from './useClassImageSrc';
import './CollectionUploadPage.css';
import './EventUploadPage.css';

const FIELD_ICON_SIZE = 20;

type PendingImage = {
  localId: string;
  imageId: string;
  localPreviewUrl: string;
  file: File;
  preview: File;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  fileurl?: string;
  previewurl?: string;
};

const previewSrc = (item: PendingImage): string =>
  item.previewurl?.trim() || item.localPreviewUrl;

const newImageId = (): string => crypto.randomUUID();

const existingPreviewRaw = (img: ClassImage): string =>
  img.preview.trim() || img.file.trim();

const findEvent = (
  events: ClassEvent[],
  eventId: string,
  eventTitle: string,
): ClassEvent | undefined => {
  if (eventId) {
    const byId = events.find((ev) => ev.id === eventId);
    if (byId) {
      return byId;
    }
  }
  const title = eventTitle.trim();
  if (title) {
    return events.find((ev) => ev.title.trim() === title);
  }
  return undefined;
};

type ExistingPreviewTileProps = {
  imageKey: string;
  previewRaw: string;
  token: string | null;
};

const ExistingPreviewTile: React.FC<ExistingPreviewTileProps> = ({
  imageKey,
  previewRaw,
  token,
}) => {
  const src = useClassImageSrc(token, previewRaw);

  return (
    <div className="collection-upload__preview-item collection-upload__preview-item--existing">
      <img src={src} alt="" loading="lazy" />
      <span className="collection-upload__preview-status collection-upload__preview-status--saved">
        В коллекции
      </span>
    </div>
  );
};

const CollectionUploadPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<CollectionUploadRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);

  const eventTitle = state.eventTitle?.trim() || '—';
  const eventId = state.eventId?.trim() || '';
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';

  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const event = useMemo(
    () => findEvent(classDetail?.events ?? [], eventId, eventTitle),
    [classDetail?.events, eventId, eventTitle],
  );
  const collections = event?.collections ?? [];

  const [selectedCollectionKey, setSelectedCollectionKey] = useState('');
  const [collectionListOpen, setCollectionListOpen] = useState(false);
  const [pendingByCollection, setPendingByCollection] = useState<Record<string, PendingImage[]>>(
    {},
  );
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const collectionPickerRef = useRef<HTMLDivElement>(null);
  const pendingByCollectionRef = useRef(pendingByCollection);
  pendingByCollectionRef.current = pendingByCollection;

  useEffect(() => {
    if (!classId || !token?.trim()) {
      return;
    }
    void loadClass({
      classId,
      schoolId,
      token,
      name: classNameFromRoute,
    });
  }, [classId, schoolId, token, classNameFromRoute, loadClass]);

  useEffect(() => {
    if (selectedCollectionKey || collections.length === 0) {
      return;
    }
    setSelectedCollectionKey(collectionSelectValue(0));
  }, [collections.length, selectedCollectionKey]);

  useEffect(() => {
    const name = state.selectCollectionName?.trim();
    if (!name || collections.length === 0) {
      return;
    }
    const index = collections.findIndex((col) => collectionLabel(col).trim() === name);
    if (index >= 0) {
      setSelectedCollectionKey(collectionSelectValue(index));
    }
  }, [collections, state.selectCollectionName]);

  useEffect(() => {
    if (!collectionListOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!collectionPickerRef.current?.contains(e.target as Node)) {
        setCollectionListOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collectionListOpen]);

  useEffect(
    () => () => {
      Object.values(pendingByCollectionRef.current).forEach((list) => {
        list.forEach((item) => {
          if (item.localPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.localPreviewUrl);
          }
        });
      });
    },
    [],
  );

  const revokeLocalPreview = (localPreviewUrl: string) => {
    if (localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
  };

  const selectedIndex = parseCollectionSelectValue(selectedCollectionKey, collections.length);
  const selectedCollection: ClassCollection | null =
    selectedIndex != null ? (collections[selectedIndex] ?? null) : null;
  const selectedCollectionId = selectedCollection?.id?.trim() ?? '';

  const pendingItems = useMemo(
    () => (selectedCollectionId ? (pendingByCollection[selectedCollectionId] ?? []) : []),
    [pendingByCollection, selectedCollectionId],
  );

  const existingImages = useMemo(
    () => selectedCollection?.images.filter((img) => existingPreviewRaw(img)) ?? [],
    [selectedCollection?.images],
  );

  const hasPreviewContent = existingImages.length > 0 || pendingItems.length > 0;

  const patchPending = useCallback(
    (collectionId: string, updater: (list: PendingImage[]) => PendingImage[]) => {
      setPendingByCollection((prev) => ({
        ...prev,
        [collectionId]: updater(prev[collectionId] ?? []),
      }));
    },
    [],
  );

  const routePayload = useMemo(
    () => ({
      schoolId,
      schoolName,
      classId,
      className: classDetail?.name || classNameFromRoute || '—',
      eventTitle: state.eventTitle,
      eventDate: state.eventDate,
      eventDescription: state.eventDescription,
      eventId: state.eventId,
    }),
    [
      schoolId,
      schoolName,
      classId,
      classDetail?.name,
      classNameFromRoute,
      state.eventTitle,
      state.eventDate,
      state.eventDescription,
      state.eventId,
    ],
  );

  const reloadClass = useCallback(async () => {
    if (!classId || !token?.trim()) {
      return;
    }
    await loadClass({
      classId,
      schoolId,
      token,
      name: classNameFromRoute,
    });
  }, [classId, classNameFromRoute, loadClass, schoolId, token]);

  const openCreateCollection = () => {
    if (!eventId) {
      toast.error('Нет id события — вернитесь и выберите событие снова');
      return;
    }
    setCollectionListOpen(false);
    history.push(CLASSES_COLLECTION_CREATE, routePayload);
  };

  const selectCollection = (index: number) => {
    setSelectedCollectionKey(collectionSelectValue(index));
    setCollectionListOpen(false);
  };

  const uploadOne = async (
    collectionId: string,
    item: PendingImage,
  ): Promise<{ publicFileUrl: string; publicPreviewUrl: string }> => {
    const basePath = buildCollectionImageBasePath(classId, eventId, collectionId, item.imageId);
    const filePath = `${basePath}/file.jpg`;
    const previewPath = `${basePath}/preview.jpg`;

    logUploadAction('фото: старт загрузки', {
      imageId: item.imageId,
      basePath,
      fileSize: item.file.size,
      previewSize: item.preview.size,
    });

    logUploadAction('фото: file.jpg — upload_url + PUT', { path: filePath });
    const publicFileUrl = await uploadJpegToStorage(token!, filePath, item.file);
    logUploadOk('фото: file.jpg', { path: filePath, fileurl: publicFileUrl || '(пусто)' });

    logUploadAction('фото: preview.jpg — upload_url + PUT', { path: previewPath });
    const publicPreviewUrl = await uploadJpegToStorage(token!, previewPath, item.preview);
    logUploadOk('фото: preview.jpg', { path: previewPath, previewurl: publicPreviewUrl || '(пусто)' });

    logUploadAction('фото: add_image', {
      collectionId,
      imageId: item.imageId,
      file: filePath,
      preview: previewPath,
      fileurl: publicFileUrl,
      previewurl: publicPreviewUrl,
    });
    const res = await addImage({
      token: token!,
      collectionId,
      imageId: item.imageId,
      file: filePath,
      preview: previewPath,
      fileurl: publicFileUrl,
      previewurl: publicPreviewUrl,
    });

    if (!res.success) {
      const err = res.message?.trim() || 'Не удалось сохранить фото в БД';
      logUploadError('фото: add_image', err);
      throw new Error(err);
    }

    logUploadOk('фото: завершено', {
      imageId: item.imageId,
      fileurl: publicFileUrl,
      previewurl: publicPreviewUrl,
    });

    return { publicFileUrl, publicPreviewUrl };
  };

  const processAndUploadFile = async (raw: File, collectionId: string) => {
    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const imageId = newImageId();

    logUploadAction('сжатие: старт', { name: raw.name, sizeBytes: raw.size });
    const processed = await processCollectionImage(raw);
    logUploadOk('сжатие', { imageId, fileSize: processed.file.size, previewSize: processed.preview.size });

    const draft: PendingImage = {
      localId,
      imageId,
      localPreviewUrl: processed.previewUrl,
      file: processed.file,
      preview: processed.preview,
      status: 'uploading',
    };

    patchPending(collectionId, (list) => [...list, draft]);

    try {
      await uploadOne(collectionId, draft);
      revokeLocalPreview(draft.localPreviewUrl);
      patchPending(collectionId, (list) => list.filter((row) => row.localId !== localId));
      await reloadClass();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      logUploadError('фото', { imageId, message });
      patchPending(collectionId, (list) =>
        list.map((row) =>
          row.localId === localId ? { ...row, status: 'error', error: message } : row,
        ),
      );
      toast.error(message);
    }
  };

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    if (!selectedCollection) {
      toast.warning('Выберите коллекцию из списка');
      return;
    }

    if (!selectedCollectionId) {
      toast.warning(
        'У выбранной коллекции нет id. Создайте новую коллекцию или обновите данные класса.',
      );
      return;
    }

    if (!classId || !eventId) {
      toast.error('Нет class_id или event_id');
      return;
    }

    logUploadAction('выбор файлов: автозагрузка', {
      count: fileList.length,
      collectionId: selectedCollectionId,
    });
    setProcessing(true);

    for (const raw of Array.from(fileList)) {
      try {
        await processAndUploadFile(raw, selectedCollectionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось обработать фото';
        logUploadError('выбор файлов', { name: raw.name, message });
        toast.error(message);
      }
    }

    setProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingItem = (localId: string) => {
    if (!selectedCollectionId) {
      return;
    }
    patchPending(selectedCollectionId, (list) => {
      const target = list.find((i) => i.localId === localId);
      if (target) {
        revokeLocalPreview(target.localPreviewUrl);
      }
      return list.filter((i) => i.localId !== localId);
    });
  };

  const canAddFiles = Boolean(
    classId && eventId && selectedCollection && selectedCollectionId && !processing,
  );

  return (
    <IonPage>
      <IonHeader className="event-upload__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_UPLOAD}
              text="Назад"
              className="event-upload__back"
            />
          </IonButtons>
          <IonTitle className="event-upload__toolbar-title">Загрузка фото</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-upload">
        <div className="event-upload__scroll">
          {loading && !classDetail ? (
            <div className="event-upload__loading" aria-busy="true">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <div className="event-upload__card">
              <div className="event-upload__field">
                <p className="event-upload__label">Событие</p>
                <div className="event-upload__select-wrap">
                  <Calendar size={FIELD_ICON_SIZE} className="event-upload__field-icon" aria-hidden />
                  <span className="event-upload__date-readonly" style={{ padding: '12px 0' }}>
                    {eventTitle}
                  </span>
                </div>
              </div>

              <div className="event-upload__field">
                <p className="event-upload__label">Коллекция</p>
                {collections.length > 0 ? (
                  <div
                    ref={collectionPickerRef}
                    className={`event-upload__event-picker${collectionListOpen ? ' event-upload__event-picker--open' : ''}`}
                  >
                    <button
                      type="button"
                      id="collection-upload-picker-trigger"
                      className="event-upload__picker-btn"
                      aria-expanded={collectionListOpen}
                      aria-haspopup="listbox"
                      disabled={processing}
                      onClick={() => setCollectionListOpen((open) => !open)}
                    >
                      <FolderOpen size={FIELD_ICON_SIZE} aria-hidden />
                      <span className="event-upload__picker-btn-label">
                        {selectedCollection
                          ? collectionLabel(selectedCollection)
                          : 'Выберите коллекцию'}
                      </span>
                      <ChevronDown
                        size={FIELD_ICON_SIZE}
                        className="event-upload__picker-chevron"
                        aria-hidden
                      />
                    </button>
                    {collectionListOpen ? (
                      <ul
                        className="event-upload__picker-list"
                        role="listbox"
                        aria-label="Список коллекций"
                      >
                        {collections.map((col, index) => {
                          const isSelected =
                            collectionSelectValue(index) === selectedCollectionKey;
                          return (
                            <li
                              key={col.id ? `col-${col.id}` : `col-${index}-${collectionLabel(col)}`}
                              role="none"
                            >
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`event-upload__picker-item${isSelected ? ' event-upload__picker-item--selected' : ''}`}
                                onClick={() => selectCollection(index)}
                              >
                                {collectionLabel(col)}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="event-upload__empty">Пока нет коллекций — создайте первую.</p>
                )}

                <button
                  type="button"
                  className="event-upload__new-event-btn"
                  disabled={!eventId || processing}
                  onClick={openCreateCollection}
                >
                  <Plus size={FIELD_ICON_SIZE} aria-hidden />
                  Новая коллекция
                </button>

                {selectedCollection && !selectedCollectionId ? (
                  <p className="event-upload__hint" style={{ marginTop: 8 }}>
                    У этой коллекции нет id в данных класса. Создайте новую коллекцию или обновите
                    страницу после загрузки класса.
                  </p>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="collection-upload__file-input"
                onChange={(e) => void onFilesSelected(e.target.files)}
              />

              <button
                type="button"
                className="collection-upload__add-files-btn"
                disabled={!canAddFiles}
                onClick={() => fileInputRef.current?.click()}
              >
                {processing ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <>
                    <ImagePlus size={FIELD_ICON_SIZE} aria-hidden />
                    Добавить файлы
                  </>
                )}
              </button>

              {!canAddFiles ? (
                <p className="event-upload__hint" style={{ marginTop: 8 }}>
                  {!selectedCollection
                    ? 'Выберите коллекцию из списка или создайте новую.'
                    : !selectedCollectionId
                      ? 'Нужен id коллекции для загрузки фото.'
                      : !classId || !eventId
                        ? 'Нет id класса или события — вернитесь и выберите событие снова.'
                        : ''}
                </p>
              ) : (
                <p className="event-upload__hint" style={{ marginTop: 8 }}>
                  Фото загружаются в выбранную коллекцию сразу после выбора файлов.
                </p>
              )}

              <div className="collection-upload__preview-section">
                <p className="event-upload__label">Предпросмотр</p>
                {!selectedCollection ? (
                  <p className="collection-upload__preview-empty">Выберите коллекцию.</p>
                ) : !hasPreviewContent ? (
                  <p className="collection-upload__preview-empty">
                    В коллекции пока нет фото. Добавьте первое.
                  </p>
                ) : (
                  <div className="collection-upload__preview-grid">
                    {existingImages.map((img, index) => {
                      const raw = existingPreviewRaw(img);
                      const imageKey = `${selectedCollectionId}-${raw}-${index}`;
                      return (
                        <ExistingPreviewTile
                          key={imageKey}
                          imageKey={imageKey}
                          previewRaw={raw}
                          token={token}
                        />
                      );
                    })}
                    {pendingItems.map((item) => (
                      <div key={item.localId} className="collection-upload__preview-item">
                        <img
                          key={previewSrc(item)}
                          src={previewSrc(item)}
                          alt=""
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (
                              item.localPreviewUrl.startsWith('blob:') &&
                              img.src !== item.localPreviewUrl
                            ) {
                              img.src = item.localPreviewUrl;
                            }
                          }}
                        />
                        {item.status !== 'uploading' ? (
                          <button
                            type="button"
                            className="collection-upload__preview-remove"
                            aria-label="Удалить"
                            disabled={processing}
                            onClick={() => removePendingItem(item.localId)}
                          >
                            <X size={14} aria-hidden />
                          </button>
                        ) : null}
                        <span
                          className={`collection-upload__preview-status${
                            item.status === 'error'
                              ? ' collection-upload__preview-status--error'
                              : item.status === 'done'
                                ? ' collection-upload__preview-status--done'
                                : ''
                          }`}
                        >
                          {item.status === 'uploading'
                            ? 'Загрузка…'
                            : item.status === 'done'
                              ? 'Готово'
                              : item.error ?? 'Ошибка'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="collection-upload__moderation">
                <Info size={18} aria-hidden />
                <p>
                  Все загружаемые материалы проходят модерацию и будут доступны участникам события
                  после проверки.
                </p>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CollectionUploadPage;
