import { IonSpinner } from '@ionic/react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  MessageCircle,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { addFavorite } from '../classesApi';
import { imageIsInFavorites } from '../favoritesUtils';
import type { ClassImage } from '../types';
import { imageFullRaw, imageThumbRaw, isCollectionVideo } from './classViewUtils';
import { guessImageFilename, saveImageWithDialog } from './imageDownload';
import { useClassImageSrc } from './useClassImageSrc';
import './CollectionMediaModal.css';

export type CollectionMediaModalProps = {
  open: boolean;
  items: ClassImage[];
  index: number;
  token: string | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Кнопки избранного и комментариев (авторизованный просмотр). */
  showActions?: boolean;
};

type MediaStageProps = {
  image: ClassImage;
  token: string | null;
  active: boolean;
};

const MediaStage: React.FC<MediaStageProps> = ({ image, token, active }) => {
  const isVideo = isCollectionVideo(image);
  const mediaSrc = useClassImageSrc(token, imageFullRaw(image));
  const posterSrc = useClassImageSrc(token, imageThumbRaw(image));
  const videoRef = useRef<HTMLVideoElement>(null);
  const loading = !mediaSrc || mediaSrc.includes('/images/start-gallery');

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    if (!active) {
      el.pause();
      return;
    }
    if (!isVideo || loading) {
      return;
    }
    const play = () => {
      void el.play().catch(() => {});
    };
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
      return;
    }
    el.addEventListener('loadeddata', play, { once: true });
    return () => {
      el.removeEventListener('loadeddata', play);
    };
  }, [active, isVideo, loading, mediaSrc]);

  if (loading) {
    return (
      <div className="collection-media-modal__loading" role="status">
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        key={mediaSrc}
        className="collection-media-modal__media collection-media-modal__video"
        controls
        playsInline
        preload="auto"
        poster={posterSrc}
        src={mediaSrc}
      />
    );
  }

  return (
    <img
      key={mediaSrc}
      src={mediaSrc}
      alt=""
      className="collection-media-modal__media collection-media-modal__photo"
    />
  );
};

const CollectionMediaModal: React.FC<CollectionMediaModalProps> = ({
  open,
  items,
  index,
  token,
  onClose,
  onIndexChange,
  showActions = false,
}) => {
  const toast = useToast();
  const favorites = useStore((s) => s.favorites);
  const applyFavoritesFromApi = useStore((s) => s.applyFavoritesFromApi);
  const [downloading, setDownloading] = useState(false);
  const [addingFavorite, setAddingFavorite] = useState(false);

  const image = items[index];
  const isVideo = image ? isCollectionVideo(image) : false;
  const resolvedImageId = image?.imageId?.trim() ?? '';
  const mediaSrc = useClassImageSrc(token, image ? imageFullRaw(image) : '');
  const isFavorite =
    Boolean(image?.featured) || imageIsInFavorites(favorites, resolvedImageId);

  const canGoPrev = index > 0;
  const canGoNext = index < items.length - 1;

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && canGoPrev) {
        onIndexChange(index - 1);
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onIndexChange(index + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, onIndexChange, index, canGoPrev, canGoNext]);

  if (!open || !image) {
    return null;
  }

  const openComment = () => {
    toast.show('Комментарии к фото скоро будут доступны');
  };

  const openMenu = () => {
    toast.show('Меню фото скоро будет доступно');
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

  const handleDownload = async () => {
    if (!mediaSrc || mediaSrc.includes('/images/start-gallery') || downloading) {
      return;
    }
    setDownloading(true);
    try {
      const filename = guessImageFilename(resolvedImageId, imageFullRaw(image));
      const result = await saveImageWithDialog(mediaSrc, filename);
      if (result === 'saved') {
        toast.success(isVideo ? 'Видео сохранено' : 'Фото сохранено');
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isVideo
            ? 'Не удалось сохранить видео'
            : 'Не удалось сохранить фото';
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className={`collection-media-modal${isVideo ? ' collection-media-modal--video' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={isVideo ? 'Просмотр видео' : 'Просмотр фото'}
    >
      <button
        type="button"
        className="collection-media-modal__backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div className="collection-media-modal__topbar">
        <button
          type="button"
          className="collection-media-modal__icon-btn"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={26} strokeWidth={2} aria-hidden />
        </button>
        {items.length > 1 ? (
          <span className="collection-media-modal__counter">
            {index + 1} / {items.length}
          </span>
        ) : (
          <span />
        )}
        {showActions ? (
          <button
            type="button"
            className="collection-media-modal__icon-btn"
            onClick={openMenu}
            aria-label="Ещё"
          >
            <MoreHorizontal size={24} strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <span className="collection-media-modal__topbar-spacer" />
        )}
      </div>

      <div className="collection-media-modal__stage">
        {canGoPrev ? (
          <button
            type="button"
            className="collection-media-modal__nav collection-media-modal__nav--prev"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Предыдущее"
          >
            <ChevronLeft size={32} strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        <div className="collection-media-modal__media-wrap">
          <MediaStage
            key={resolvedImageId || `${index}-${imageFullRaw(image)}`}
            image={image}
            token={token}
            active={open}
          />
        </div>

        {canGoNext ? (
          <button
            type="button"
            className="collection-media-modal__nav collection-media-modal__nav--next"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Следующее"
          >
            <ChevronRight size={32} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="collection-media-modal__bottom">
        {showActions ? (
          <div className="collection-media-modal__actions">
            <button
              type="button"
              className="collection-media-modal__action-btn collection-media-modal__action-btn--comment"
              onClick={openComment}
              aria-label="Комментарий"
            >
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="collection-media-modal__action-btn collection-media-modal__action-btn--download"
              onClick={() => void handleDownload()}
              disabled={downloading || !mediaSrc || mediaSrc.includes('/images/start-gallery')}
              aria-label="Сохранить"
            >
              <Download size={24} strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`collection-media-modal__action-btn collection-media-modal__action-btn--like${
                isFavorite ? ' collection-media-modal__action-btn--like-active' : ''
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
        ) : (
          <button
            type="button"
            className="collection-media-modal__action-btn collection-media-modal__action-btn--download"
            onClick={() => void handleDownload()}
            disabled={downloading || !mediaSrc || mediaSrc.includes('/images/start-gallery')}
            aria-label="Сохранить"
          >
            <Download size={24} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CollectionMediaModal;
