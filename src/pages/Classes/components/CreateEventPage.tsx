import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { Calendar, Images } from 'lucide-react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import { CLASSES_UPLOAD } from '../routes';
import type { ClassRouteState } from '../types';
import {
  defaultDescriptionPlaceholder,
  DESCRIPTION_MAX,
  todayInputDate,
  toDisplayDate,
} from './eventFormUtils';
import './EventUploadPage.css';

const FIELD_ICON_SIZE = 20;

const CreateEventPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ClassRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);

  const addEvent = useClassesStore((s) => s.addEvent);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';
  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const displayClassName = classDetail?.name || classNameFromRoute || '—';

  const [title, setTitle] = useState('');
  const [dateIso, setDateIso] = useState(todayInputDate);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const charCount = description.length;

  const save = async () => {
    if (!classId || !token?.trim()) {
      toast.error('Не выбран класс');
      return;
    }

    const eventTitle = title.trim();
    const date = toDisplayDate(dateIso);
    const desc = description.trim();

    if (!eventTitle) {
      toast.warning('Укажите название события');
      return;
    }
    if (!dateIso) {
      toast.warning('Укажите дату');
      return;
    }
    if (desc.length > DESCRIPTION_MAX) {
      toast.warning(`Описание не длиннее ${DESCRIPTION_MAX} символов`);
      return;
    }

    setSubmitting(true);
    const res = await addEvent({
      token,
      classId,
      name: eventTitle,
      date,
      description: desc || undefined,
      schoolId,
      className: classNameFromRoute,
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.message ?? 'Не удалось создать событие');
      return;
    }

    toast.success(res.message ?? 'Событие создано');
    history.replace(CLASSES_UPLOAD, {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
      selectEventTitle: eventTitle,
    });
  };

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
          <IonTitle className="event-upload__toolbar-title">Новое событие</IonTitle>
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
              <label className="event-upload__label" htmlFor="create-event-title">
                Событие
              </label>
              <div className="event-upload__select-wrap">
                <Images
                  size={FIELD_ICON_SIZE}
                  className="event-upload__field-icon"
                  aria-hidden
                />
                <IonInput
                  id="create-event-title"
                  type="text"
                  className="event-upload__text-input"
                  placeholder="Например, Открытый урок"
                  value={title}
                  onIonChange={(e) => setTitle(e.detail.value as string)}
                  aria-label="Название события"
                />
              </div>
            </div>

            <div className="event-upload__field">
              <label className="event-upload__label" htmlFor="create-event-date">
                Дата
              </label>
              <div className="event-upload__date-wrap">
                <Calendar
                  size={FIELD_ICON_SIZE}
                  className="event-upload__field-icon"
                  aria-hidden
                />
                <input
                  id="create-event-date"
                  type="date"
                  className="event-upload__date-input"
                  value={dateIso}
                  onChange={(e) => setDateIso(e.target.value)}
                  aria-label="Дата события"
                />
              </div>
            </div>

            <div className="event-upload__field">
              <label className="event-upload__label" htmlFor="create-event-description">
                Описание события
              </label>
              <div className="event-upload__textarea-wrap">
                <IonTextarea
                  id="create-event-description"
                  className="event-upload__textarea"
                  placeholder={defaultDescriptionPlaceholder}
                  value={description}
                  maxlength={DESCRIPTION_MAX}
                  autoGrow
                  onIonInput={(e) => setDescription(String(e.detail.value ?? ''))}
                  aria-label="Описание события"
                />
                <span className="event-upload__counter" aria-live="polite">
                  {charCount} / {DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          </div>

          <div className="event-upload__actions">
            <button
              type="button"
              className="event-upload__collection-btn"
              disabled={submitting || !classId}
              onClick={() => void save()}
            >
              {submitting ? <IonSpinner name="crescent" /> : 'Создать событие'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CreateEventPage;
