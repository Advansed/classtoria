import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { ChevronLeft, Download, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useChildAvatarUrl } from '../../../hooks/useChildAvatarUrl';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import type { ChildRecord } from '../../PersonalPage/childrenTypes';
import { childRecordKey } from '../../PersonalPage/childrenUtils';
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

type ChildAvatarPickProps = {
  child: ChildRecord;
  selected: boolean;
  onToggle: () => void;
};

const ChildAvatarPick: React.FC<ChildAvatarPickProps> = ({ child, selected, onToggle }) => {
  const avatarSrc = useChildAvatarUrl(child.image);
  const label = child.name.trim() || 'Ребёнок';

  return (
    <button
      type="button"
      className={`image-view__child-avatar${selected ? ' image-view__child-avatar--selected' : ''}`}
      onClick={onToggle}
      aria-label={label}
      aria-pressed={selected}
    >
      <img src={avatarSrc} alt="" width={44} height={44} />
    </button>
  );
};

const ImageViewPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ImageViewRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const childrens = useStore((s) => s.childrens);

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

  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [taggedChildKeys, setTaggedChildKeys] = useState<Set<string>>(() => new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!childPickerOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!bottomRef.current?.contains(e.target as Node)) {
        setChildPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [childPickerOpen]);

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

  const toggleChildPicker = () => {
    if (childrens.length === 0) {
      toast.warning('Сначала добавьте ребёнка в личном кабинете');
      return;
    }
    setChildPickerOpen((open) => !open);
  };

  const toggleTaggedChild = (child: ChildRecord) => {
    const key = childRecordKey(child);
    setTaggedChildKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    toast.show('Фото сохранится в личный кабинет ребёнка');
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
      const filename = guessImageFilename(
        image?.imageId,
        image ? imageFullRaw(image) : undefined,
      );
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

              <div ref={bottomRef} className="image-view__bottom">
                {childPickerOpen && childrens.length > 0 ? (
                  <div className="image-view__child-picker" role="listbox" aria-label="Выберите ребёнка">
                    {childrens.map((child) => {
                      const key = childRecordKey(child);
                      return (
                        <ChildAvatarPick
                          key={key}
                          child={child}
                          selected={taggedChildKeys.has(key)}
                          onToggle={() => toggleTaggedChild(child)}
                        />
                      );
                    })}
                  </div>
                ) : null}

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
                      childPickerOpen ? ' image-view__action-btn--like-active' : ''
                    }`}
                    onClick={toggleChildPicker}
                    aria-label="Отметить ребёнка"
                    aria-expanded={childPickerOpen}
                  >
                    <Heart
                      size={24}
                      strokeWidth={1.75}
                      fill={childPickerOpen ? 'currentColor' : 'none'}
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
