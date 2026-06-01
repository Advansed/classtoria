import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { FolderPlus, Images } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import { CLASSES_COLLECTION_UPLOAD } from '../routes';
import type { CollectionUploadRouteState } from '../types';
import './EventUploadPage.css';

const FIELD_ICON_SIZE = 20;

const CreateCollectionPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<CollectionUploadRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const userId = useStore((s) => s.user_id);

  const addCollection = useClassesStore((s) => s.addCollection);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';
  const eventId = state.eventId?.trim() || '';
  const eventTitle = state.eventTitle?.trim() || '—';

  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const displayClassName = classDetail?.name || classNameFromRoute || '—';
  const event = useMemo(() => {
    const events = classDetail?.events ?? [];
    if (eventId) {
      const byId = events.find((ev) => ev.id === eventId);
      if (byId) {
        return byId;
      }
    }
    const normalizedTitle = eventTitle.trim();
    if (!normalizedTitle) {
      return undefined;
    }
    return events.find((ev) => ev.title.trim() === normalizedTitle);
  }, [classDetail?.events, eventId, eventTitle]);
  const canEdit = Boolean(event?.creator?.trim() && event.creator.trim() === userId.trim());

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const uploadState: CollectionUploadRouteState = {
    schoolId,
    schoolName,
    classId,
    className: displayClassName,
    eventTitle: state.eventTitle,
    eventDate: state.eventDate,
    eventDescription: state.eventDescription,
    eventId: state.eventId,
  };

  const save = async () => {
    if (!canEdit) {
      toast.warning('Редактировать можно только своё событие');
      return;
    }
    if (!classId || !token?.trim()) {
      toast.error('Не выбран класс');
      return;
    }
    if (!eventId) {
      toast.error('Нет id события — вернитесь и выберите событие снова');
      return;
    }

    const collectionName = name.trim();
    if (!collectionName) {
      toast.warning('Укажите название коллекции');
      return;
    }

    setSubmitting(true);
    const res = await addCollection({
      token,
      classId,
      eventId,
      name: collectionName,
      schoolId,
      className: classNameFromRoute,
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.message ?? 'Не удалось создать коллекцию');
      return;
    }

    toast.success(res.message ?? 'Коллекция создана');
    history.replace(CLASSES_COLLECTION_UPLOAD, {
      ...uploadState,
      selectCollectionName: collectionName,
    });
  };

  return (
    <IonPage>
      <IonHeader className="event-upload__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_COLLECTION_UPLOAD}
              text="Назад"
              className="event-upload__back"
            />
          </IonButtons>
          <IonTitle className="event-upload__toolbar-title">Новая коллекция</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-upload">
        <div className="event-upload__scroll">
          <div className="event-upload__top">
            <p className="event-upload__school">{schoolName}</p>
            <p className="event-upload__class">{displayClassName}</p>
          </div>

          <div className="event-upload__card">
            <div className="event-upload__field">
              <p className="event-upload__label">Событие</p>
              <div className="event-upload__select-wrap">
                <Images size={FIELD_ICON_SIZE} className="event-upload__field-icon" aria-hidden />
                <span className="event-upload__date-readonly" style={{ padding: '12px 0' }}>
                  {eventTitle}
                </span>
              </div>
            </div>

            <div className="event-upload__field">
              <label className="event-upload__label" htmlFor="create-collection-name">
                Коллекция
              </label>
              <div className="event-upload__select-wrap">
                <FolderPlus
                  size={FIELD_ICON_SIZE}
                  className="event-upload__field-icon"
                  aria-hidden
                />
                <IonInput
                  id="create-collection-name"
                  type="text"
                  className="event-upload__text-input"
                  placeholder="Например, Фото с линейки"
                  value={name}
                  onIonChange={(e) => setName(e.detail.value as string)}
                  aria-label="Название коллекции"
                />
              </div>
            </div>
          </div>

          <div className="event-upload__actions">
            <button
              type="button"
              className="event-upload__collection-btn"
              disabled={!canEdit || submitting || !classId || !eventId}
              onClick={() => void save()}
            >
              {submitting ? <IonSpinner name="crescent" /> : 'Создать коллекцию'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CreateCollectionPage;
