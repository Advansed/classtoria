import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { ChevronLeft, Download, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { addFavorite } from '../classesApi';
import { imageIsInFavorites } from '../favoritesUtils';
import { useClassesStore } from '../classesStore';
import { CLASSES_COLLECTION_VIEW } from '../routes';
import type { CollectionViewRouteState, ImageViewRouteState } from '../types';
import {
  findCollectionInEvent,
  findEventInList,
  findImageInCollection,
  imageFullRaw,
} from './classViewUtils';
import { guessImageFilename, saveImageWithDialog } from './imageDownload';
import { useClassImageSrc } from './useClassImageSrc';
import './ImageViewPage.css';

const ImageViewPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ImageViewRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const favorites = useStore((s) => s.favorites);
  const applyFavoritesFromApi = useStore((s) => s.applyFavoritesFromApi);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);

  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const classNameFromRoute = state.className?.trim() || '';
  const eventId = state.eventId?.trim() || '';
  const eventIndex = state.eventIndex;
  const collectionId = state.collectionId?.trim() || '';
  const collectionIndex = state.collectionIndex;
  const imageId = state.imageId?.trim() || '';
  const imageIndex = state.imageIndex;

  const [downloading, setDownloading] = useState(false);
  const [addingFavorite, setAddingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));

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

  const event = useMemo(
    () => findEventInList(classDetail?.events ?? [], eventId, eventIndex),
    [classDetail?.events, eventId, eventIndex],
  );
  const collection = useMemo(
    () => findCollectionInEvent(event, collectionId, collectionIndex),
    [event, collectionId, collectionIndex],
  );
  const image = useMemo(
    () => findImageInCollection(collection, imageId, imageIndex),
    [collection, imageId, imageIndex],
  );

  const resolvedImageId = image?.imageId?.trim() || imageId;

  useEffect(() => {
    setIsFavorite(
      Boolean(image?.featured) || imageIsInFavorites(favorites, resolvedImageId),
    );
  }, [image?.featured, favorites, resolvedImageId]);

  const photoSrc = useClassImageSrc(token, image ? imageFullRaw(image) : '');

  const collectionBackState = useMemo(
    (): CollectionViewRouteState => ({
      schoolId: state.schoolId,
      schoolName: state.schoolName,
      classId: state.classId,
      className: state.className,
      eventId: state.eventId,
      eventIndex: state.eventIndex,
      eventTitle: state.eventTitle,
      eventDate: state.eventDate,
      collectionId: state.collectionId,
      collectionIndex: state.collectionIndex,
    }),
    [state],
  );

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push(CLASSES_COLLECTION_VIEW, collectionBackState);
  };

  const openComment = () => {
    toast.show('Комментарии к фото скоро будут доступны');
  };

  const handleAddFavorite = async () => {
    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!resolvedImageId) {
      toast.error('Нет image_id — нельзя добавить в избранное');
      return;
    }
    if (isFavorite || addingFavorite) {
      return;
    }

    setAddingFavorite(true);
    try {
      const res = await addFavorite({
        token: trimmedToken,
        imageId: resolvedImageId,
      });
      if (res.success) {
        applyFavoritesFromApi(res);
        setIsFavorite(true);
        toast.success(res.message?.trim() || 'Добавлено в избранное');
      } else {
        toast.error(res.message?.trim() || 'Не удалось добавить в избранное');
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setAddingFavorite(false);
    }
  };

  const openMenu = () => {
    toast.show('Меню фото скоро будет доступно');
  };

  const handleDownload = async () => {
    if (!photoSrc || downloading) {
      return;
    }
    setDownloading(true);
    try {
      const filename = guessImageFilename(resolvedImageId, image ? imageFullRaw(image) : undefined);
      const result = await saveImageWithDialog(photoSrc, filename);
      if (result === 'saved') {
        toast.success('Фото сохранено');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить фото';
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <IonPage className="image-view">
      <IonContent fullscreen className="image-view__content">
        <div className="image-view__wrap">
          {loading && !classDetail ? (
            <div className="image-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && !image ? (
            <p className="image-view__error" role="alert">
              Фотография не найдена.
            </p>
          ) : null}

          {image ? (
            <>
              <div className="image-view__stage">
                <img src={photoSrc} alt="" className="image-view__photo" />
              </div>

              <div className="image-view__topbar">
                <button
                  type="button"
                  className="image-view__icon-btn"
                  onClick={handleBack}
                  aria-label="Назад"
                >
                  <ChevronLeft size={28} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  className="image-view__icon-btn"
                  onClick={openMenu}
                  aria-label="Ещё"
                >
                  <MoreHorizontal size={24} strokeWidth={2} aria-hidden />
                </button>
              </div>

              <div className="image-view__bottom">
                <div className="image-view__actions">
                  <button
                    type="button"
                    className="image-view__action-btn image-view__action-btn--comment"
                    onClick={openComment}
                    aria-label="Комментарий"
                  >
                    <MessageCircle size={24} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="image-view__action-btn image-view__action-btn--download"
                    onClick={() => void handleDownload()}
                    disabled={downloading || !photoSrc}
                    aria-label="Сохранить как"
                  >
                    <Download size={24} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`image-view__action-btn image-view__action-btn--like${
                      isFavorite ? ' image-view__action-btn--like-active' : ''
                    }`}
                    onClick={() => void handleAddFavorite()}
                    disabled={addingFavorite || isFavorite || !resolvedImageId}
                    aria-label={isFavorite ? 'В избранном' : 'В избранное'}
                    aria-pressed={isFavorite}
                  >
                    <Heart
                      size={24}
                      strokeWidth={1.75}
                      fill={isFavorite ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ImageViewPage;
