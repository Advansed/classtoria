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
import { Calendar, ChevronDown, FolderOpen, ImagePlus, Info, Plus, Video, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { addImage, addVideo, delVideo } from '../classesApi';
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
  prepareCollectionVideoUpload,
  revokeVideoPreviewUrl,
} from './collectionVideoProcessing';
import {
  logUploadAction,
  logUploadError,
  logUploadOk,
} from './collectionUploadLog';
import {
  buildCollectionImageBasePath,
  buildCollectionVideoPaths,
  deleteCollectionImage,
  deleteCollectionVideoFiles,
  resolveCollectionVideoImageId,
  resolveImagePublicUrl,
  resolveCollectionImageId,
  uploadFileToStorage,
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

type VideoUploadPhase = 'idle' | 'validating' | 'uploading' | 'deleting';

const collectionVideoThumbRaw = (col: ClassCollection): string => {
  const preview = col.videoPreview?.trim();
  if (preview) {
    return preview;
  }
  return col.videoUrl?.trim() || '';
};

const hasCollectionVideo = (col: ClassCollection | null): boolean =>
  Boolean(col && (col.videoUrl?.trim() || col.videoPreview?.trim()));

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
  previewRaw: string;
  token: string | null;
  deleting: boolean;
  disabled: boolean;
  onDelete: () => void;
};

const ExistingPreviewTile: React.FC<ExistingPreviewTileProps> = ({
  previewRaw,
  token,
  deleting,
  disabled,
  onDelete,
}) => {
  const src = useClassImageSrc(token, previewRaw);

  return (
    <div className="collection-upload__preview-item collection-upload__preview-item--existing">
      <img src={src} alt="" loading="lazy" />
      <button
        type="button"
        className="collection-upload__preview-remove"
        aria-label="Удалить фото"
        disabled={disabled || deleting}
        onClick={() => void onDelete()}
      >
        {deleting ? <IonSpinner name="crescent" /> : <X size={14} aria-hidden />}
      </button>
      <span className="collection-upload__preview-status collection-upload__preview-status--saved">
        {deleting ? 'Удаление…' : 'В коллекции'}
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
  const userId = useStore((s) => s.user_id);

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
  const canEditEvent = Boolean(event?.creator?.trim() && event.creator.trim() === userId.trim());
  const collections = event?.collections ?? [];

  const [selectedCollectionKey, setSelectedCollectionKey] = useState('');
  const [collectionListOpen, setCollectionListOpen] = useState(false);
  const [pendingByCollection, setPendingByCollection] = useState<Record<string, PendingImage[]>>(
    {},
  );
  const [processing, setProcessing] = useState(false);
  const [videoPhase, setVideoPhase] = useState<VideoUploadPhase>('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatusText, setVideoStatusText] = useState('');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(() => new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    setRemovedImageIds(new Set());
  }, [selectedCollectionId]);

  const existingImages = useMemo(() => {
    const list = selectedCollection?.images.filter((img) => existingPreviewRaw(img)) ?? [];
    return list.filter((img) => {
      const id = resolveCollectionImageId(img);
      return !id || !removedImageIds.has(id);
    });
  }, [selectedCollection?.images, removedImageIds]);

  const hasPreviewContent = existingImages.length > 0 || pendingItems.length > 0;
  const collectionHasVideo = hasCollectionVideo(selectedCollection);
  const existingVideoThumbRaw = selectedCollection
    ? collectionVideoThumbRaw(selectedCollection)
    : '';
  const existingVideoThumbSrc = useClassImageSrc(token, existingVideoThumbRaw);
  const videoBusy = videoPhase !== 'idle';
  const busy = processing || videoBusy || Boolean(deletingKey);

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
    if (!canEditEvent) {
      toast.warning('Редактировать можно только своё событие');
      return;
    }
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
    const publicFileUrl = await uploadFileToStorage(token!, filePath, item.file);
    logUploadOk('фото: file.jpg', { path: filePath, fileurl: publicFileUrl || '(пусто)' });

    logUploadAction('фото: preview.jpg — upload_url + PUT', { path: previewPath });
    const publicPreviewUrl = await uploadFileToStorage(token!, previewPath, item.preview);
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

  const processAndUploadVideo = async (raw: File) => {
    if (!token?.trim() || !classId || !eventId || !selectedCollectionId) {
      toast.error('Нет данных для загрузки видео');
      return;
    }

    setVideoPhase('validating');
    setVideoProgress(0);
    setVideoStatusText('Проверка видео…');
    setProcessing(true);

    let localPreview = '';

    try {
      const processed = await prepareCollectionVideoUpload(raw);

      localPreview = processed.previewUrl;
      setVideoPhase('uploading');
      setVideoStatusText('Загрузка в облако…');
      setVideoProgress(40);

      const videoImageId = newImageId();
      const paths = buildCollectionVideoPaths(
        classId,
        eventId,
        selectedCollectionId,
        videoImageId,
        processed.videoExtension,
      );
      const fileurl = await uploadFileToStorage(token, paths.video, processed.video);
      setVideoProgress(88);
      const previewurl = await uploadFileToStorage(token, paths.preview, processed.preview);
      setVideoProgress(95);

      const res = await addVideo({
        token,
        collectionId: selectedCollectionId,
        imageId: paths.imageId,
        file: paths.video,
        preview: paths.preview,
        fileurl,
        previewurl,
        duration: processed.durationLabel,
      });

      if (!res.success) {
        throw new Error(res.message?.trim() || 'Не удалось сохранить видео');
      }

      setVideoProgress(100);
      setVideoStatusText('Видео загружено');
      toast.success(res.message?.trim() || 'Видео загружено');
      await reloadClass();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить видео';
      logUploadError('видео', message);
      toast.error(message);
      setVideoStatusText(message);
    } finally {
      revokeVideoPreviewUrl(localPreview);
      setVideoPhase('idle');
      setVideoProgress(0);
      setVideoStatusText('');
      setProcessing(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const onVideoSelected = async (fileList: FileList | null) => {
    if (!canEditEvent) {
      toast.warning('Событие открыто только для просмотра');
      return;
    }
    const raw = fileList?.[0];
    if (!raw) {
      return;
    }
    if (!selectedCollection || !selectedCollectionId) {
      toast.warning('Выберите коллекцию из списка');
      return;
    }
    if (busy) {
      return;
    }
    await processAndUploadVideo(raw);
  };

  const deleteCollectionVideo = async () => {
    if (!canEditEvent || !token?.trim() || !selectedCollectionId || !classId || !eventId) {
      return;
    }
    if (busy) {
      return;
    }

    setVideoPhase('deleting');
    setProcessing(true);
    setVideoStatusText('Удаление видео…');

    try {
      const videoImageId = selectedCollection
        ? resolveCollectionVideoImageId(selectedCollection)
        : '';
      const paths = videoImageId
        ? buildCollectionVideoPaths(classId, eventId, selectedCollectionId, videoImageId)
        : null;
      const res = await delVideo({
        token,
        collectionId: selectedCollectionId,
        ...(videoImageId ? { imageId: videoImageId } : {}),
      });
      if (!res.success) {
        throw new Error(res.message?.trim() || 'Не удалось удалить видео');
      }
      if (paths) {
        try {
          await deleteCollectionVideoFiles(token, paths);
        } catch {
          // файлы могли быть уже удалены на сервере
        }
      }
      toast.success('Видео удалено');
      await reloadClass();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить видео';
      toast.error(message);
    } finally {
      setVideoPhase('idle');
      setVideoStatusText('');
      setProcessing(false);
    }
  };

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!canEditEvent) {
      toast.warning('Событие открыто только для просмотра');
      return;
    }
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

    if (videoBusy) {
      toast.warning('Дождитесь завершения загрузки видео');
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

  const deleteCtx = useMemo(
    () =>
      classId && eventId && selectedCollectionId
        ? { classId, eventId, collectionId: selectedCollectionId }
        : null,
    [classId, eventId, selectedCollectionId],
  );

  const hideImageFromPreview = (imageId: string) => {
    setRemovedImageIds((prev) => new Set(prev).add(imageId));
  };

  const deleteExistingImage = async (img: ClassImage, index: number) => {
    const deleteKey = `${selectedCollectionId}-existing-${index}`;
    if (!canEditEvent) {
      toast.warning('Удаление доступно только создателю события');
      return;
    }
    if (!token?.trim() || processing || deletingKey || !deleteCtx) {
      return;
    }

    const imageId = resolveCollectionImageId(img);
    if (!imageId) {
      toast.error('Нет image_id — нельзя удалить это фото');
      return;
    }

    setDeletingKey(deleteKey);
    hideImageFromPreview(imageId);

    try {
      logUploadAction('удаление фото из коллекции', {
        collectionId: selectedCollectionId,
        imageId,
      });
      await deleteCollectionImage(token, img, deleteCtx, imageId);
      await reloadClass();
      toast.success('Фото удалено');
    } catch (err) {
      setRemovedImageIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
      const message = err instanceof Error ? err.message : 'Не удалось удалить фото';
      logUploadError('удаление фото', message);
      toast.error(message);
    } finally {
      setDeletingKey(null);
    }
  };

  const removePendingItem = async (localId: string) => {
    if (!canEditEvent) {
      return;
    }
    if (!selectedCollectionId) {
      return;
    }

    const target = pendingItems.find((i) => i.localId === localId);
    if (!target) {
      return;
    }

    if (target.status === 'error' && token?.trim() && deleteCtx) {
      setDeletingKey(localId);
      try {
        await deleteCollectionImage(
          token,
          { file: '', preview: '', date: '', imageId: target.imageId },
          deleteCtx,
          target.imageId,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось удалить фото';
        logUploadError('удаление черновика', message);
        toast.warning(message);
      } finally {
        setDeletingKey(null);
      }
    }

    patchPending(selectedCollectionId, (list) => {
      const row = list.find((i) => i.localId === localId);
      if (row) {
        revokeLocalPreview(row.localPreviewUrl);
      }
      return list.filter((i) => i.localId !== localId);
    });
  };

  const canAddFiles = Boolean(
    classId &&
      eventId &&
      selectedCollection &&
      selectedCollectionId &&
      canEditEvent &&
      !busy,
  );

  const canManageVideo = Boolean(
    classId && eventId && selectedCollection && selectedCollectionId && canEditEvent && !busy,
  );

  const previewBusy = busy;

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
          <IonTitle className="event-upload__toolbar-title">Загрузка материалов</IonTitle>
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
                  disabled={!canEditEvent || !eventId || processing}
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
                        : videoBusy
                          ? 'Дождитесь завершения обработки видео.'
                          : ''}
                </p>
              ) : (
                <p className="event-upload__hint" style={{ marginTop: 8 }}>
                  Фото загружаются в выбранную коллекцию сразу после выбора файлов.
                </p>
              )}

              <div className="collection-upload__video-section">
                <p className="event-upload__label">Видеоролик фотосессии</p>
                <p className="collection-upload__video-hint">
                  До 1 минуты. Файл загружается без сжатия в исходном формате.
                </p>

                {collectionHasVideo && existingVideoThumbRaw ? (
                  <div className="collection-upload__video-existing">
                    <img src={existingVideoThumbSrc} alt="" loading="lazy" />
                    {selectedCollection?.videoDuration?.trim() ? (
                      <span className="collection-upload__video-duration">
                        {selectedCollection.videoDuration.trim()}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {videoBusy ? (
                  <div className="collection-upload__video-progress" role="status">
                    <div className="collection-upload__video-progress-bar">
                      <span
                        className="collection-upload__video-progress-fill"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <p className="collection-upload__video-progress-text">
                      {videoStatusText || 'Обработка…'}
                      {videoProgress > 0 ? ` (${videoProgress}%)` : ''}
                    </p>
                  </div>
                ) : null}

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="collection-upload__file-input"
                  onChange={(e) => void onVideoSelected(e.target.files)}
                />

                <div className="collection-upload__video-actions">
                  <button
                    type="button"
                    className="collection-upload__add-video-btn"
                    disabled={!canManageVideo}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video size={FIELD_ICON_SIZE} aria-hidden />
                    {collectionHasVideo ? 'Заменить видео' : 'Добавить видео'}
                  </button>
                  {collectionHasVideo ? (
                    <button
                      type="button"
                      className="collection-upload__delete-video-btn"
                      disabled={!canManageVideo}
                      onClick={() => void deleteCollectionVideo()}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </div>

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
                      const isDeleting = deletingKey === `${selectedCollectionId}-existing-${index}`;
                      return (
                        <ExistingPreviewTile
                          key={imageKey}
                          previewRaw={raw}
                          token={token}
                          deleting={isDeleting}
                          disabled={!canEditEvent || (previewBusy && !isDeleting)}
                          onDelete={() => void deleteExistingImage(img, index)}
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
                            disabled={!canEditEvent || previewBusy}
                            onClick={() => void removePendingItem(item.localId)}
                          >
                            {deletingKey === item.localId ? (
                              <IonSpinner name="crescent" />
                            ) : (
                              <X size={14} aria-hidden />
                            )}
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
