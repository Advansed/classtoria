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
import { Calendar, ChevronDown, Images, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import {
  CLASSES_CABINET,
  CLASSES_COLLECTION_UPLOAD,
  CLASSES_EVENT_CREATE,
} from '../routes';
import type { ClassEvent, ClassRouteState, CollectionUploadRouteState } from '../types';
import {
  eventSelectValue,
  normalizeEventDate,
  parseEventSelectValue,
} from './eventFormUtils';
import './EventUploadPage.css';

const FIELD_ICON_SIZE = 20;

const EventUploadPage: React.FC = () => {
  const history             = useHistory();
  const location            = useLocation<ClassRouteState>();
  const toast               = useToast();
  const state               = location.state ?? {};
  const token = useStore((s) => s.token);

  const activeClassId       = useClassesStore((s) => s.activeClassId);
  const loadClass           = useClassesStore((s) => s.loadClass);
  const loading             = useClassesStore((s) => s.loading);

  const classId             = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName          = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute  = state.className?.trim() || '';

  const classDetail         = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const events              = classDetail?.events ?? [];

  const [selectedEventKey, setSelectedEventKey] = useState('');
  const [eventListOpen, setEventListOpen] = useState(false);
  const eventPickerRef = useRef<HTMLDivElement>(null);

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
    if (selectedEventKey || events.length === 0) {
      return;
    }
    setSelectedEventKey(eventSelectValue(0));
  }, [events.length, selectedEventKey]);

  useEffect(() => {
    const title = state.selectEventTitle?.trim();
    if (!title || events.length === 0) {
      return;
    }
    const index = events.findIndex((ev) => ev.title.trim() === title);
    if (index >= 0) {
      setSelectedEventKey(eventSelectValue(index));
    }
  }, [events, state.selectEventTitle]);

  useEffect(() => {
    if (!eventListOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!eventPickerRef.current?.contains(e.target as Node)) {
        setEventListOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [eventListOpen]);

  const selectedIndex = parseEventSelectValue(selectedEventKey, events.length);
  const selectedEvent: ClassEvent | null =
    selectedIndex != null ? (events[selectedIndex] ?? null) : null;

  const eventDateDisplay = useMemo(
    () => (selectedEvent ? normalizeEventDate(selectedEvent.date) : ''),
    [selectedEvent],
  );

  const eventDescriptionDisplay = useMemo(
    () => selectedEvent?.description?.trim() ?? '',
    [selectedEvent],
  );

  const displayClassName = classDetail?.name || classNameFromRoute || '—';

  const routePayload = useMemo(
    () => ({
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
    }),
    [schoolId, schoolName, classId, displayClassName],
  );

  const openCreateEvent = () => {
    setEventListOpen(false);
    history.push(CLASSES_EVENT_CREATE, routePayload);
  };

  const selectEvent = (index: number) => {
    setSelectedEventKey(eventSelectValue(index));
    setEventListOpen(false);
  };

  const openCollections = useCallback(() => {
    if (!classId || !token?.trim()) {
      toast.error('Не выбран класс');
      return;
    }

    if (!selectedEvent) {
      toast.warning('Выберите событие из списка');
      return;
    }

    const title = selectedEvent.title.trim();
    const date = eventDateDisplay || normalizeEventDate(selectedEvent.date);
    const desc = eventDescriptionDisplay;

    if (!title) {
      toast.warning('У события нет названия');
      return;
    }

    const nextState: CollectionUploadRouteState = {
      ...routePayload,
      eventTitle: title,
      eventDate: date,
      eventDescription: desc,
      ...(selectedEvent.id ? { eventId: selectedEvent.id } : {}),
    };

    history.push(CLASSES_COLLECTION_UPLOAD, nextState);
  }, [classId, eventDateDisplay, eventDescriptionDisplay, history, routePayload, selectedEvent, toast, token]);

  return (
    <IonPage>
      <IonHeader className="event-upload__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_CABINET}
              text="Назад"
              className="event-upload__back"
            />
          </IonButtons>
          <IonTitle className="event-upload__toolbar-title">Загрузка</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-upload">
        <div className="event-upload__scroll">
          <div className="event-upload__top">
            <p className="event-upload__school">{schoolName}</p>
            <p className="event-upload__class">{displayClassName}</p>
          </div>

          {loading && !classDetail ? (
            <div className="event-upload__loading" aria-busy="true">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <div className="event-upload__card">
              <div className="event-upload__field">
                <p className="event-upload__label">Событие</p>
                {events.length > 0 ? (
                  <div
                    ref={eventPickerRef}
                    className={`event-upload__event-picker${eventListOpen ? ' event-upload__event-picker--open' : ''}`}
                  >
                    <button
                      type="button"
                      id="event-upload-picker-trigger"
                      className="event-upload__picker-btn"
                      aria-expanded={eventListOpen}
                      aria-haspopup="listbox"
                      onClick={() => setEventListOpen((open) => !open)}
                    >
                      <Calendar size={FIELD_ICON_SIZE} aria-hidden />
                      <span className="event-upload__picker-btn-label">
                        {selectedEvent?.title.trim() || 'Выберите событие'}
                      </span>
                      <ChevronDown
                        size={FIELD_ICON_SIZE}
                        className="event-upload__picker-chevron"
                        aria-hidden
                      />
                    </button>
                    {eventListOpen ? (
                      <ul className="event-upload__picker-list" role="listbox" aria-label="Список событий">
                        {events.map((ev, index) => {
                          const isSelected = eventSelectValue(index) === selectedEventKey;
                          return (
                            <li key={ev.id ? `event-${ev.id}` : `event-${index}-${ev.title}`} role="none">
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`event-upload__picker-item${isSelected ? ' event-upload__picker-item--selected' : ''}`}
                                onClick={() => selectEvent(index)}
                              >
                                {ev.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="event-upload__empty">Пока нет событий — создайте первое.</p>
                )}

                <button
                  type="button"
                  className="event-upload__new-event-btn"
                  onClick={openCreateEvent}
                >
                  <Plus size={FIELD_ICON_SIZE} aria-hidden />
                  Новое событие
                </button>
              </div>

              {selectedEvent ? (
                <>
                  <div className="event-upload__field">
                    <p className="event-upload__label">Дата</p>
                    <div className="event-upload__date-wrap event-upload__date-wrap--readonly">
                      <Calendar
                        size={FIELD_ICON_SIZE}
                        className="event-upload__field-icon"
                        aria-hidden
                      />
                      <span className="event-upload__date-readonly">
                        {eventDateDisplay || '—'}
                      </span>
                      <Calendar
                        size={FIELD_ICON_SIZE}
                        className="event-upload__field-icon event-upload__field-icon--accent"
                        aria-hidden
                      />
                    </div>
                  </div>

                  <div className="event-upload__field">
                    <p className="event-upload__label">Описание события</p>
                    <div className="event-upload__description-box">
                      <p className="event-upload__description-text">
                        {eventDescriptionDisplay || '—'}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div className="event-upload__actions">
            <button
              type="button"
              className="event-upload__collection-btn"
              disabled={!classId || !selectedEvent}
              onClick={openCollections}
            >
              <Images size={20} className="event-upload__btn-icon" aria-hidden />
              Добавить коллекцию в событие
            </button>
            <p className="event-upload__hint">
              Выберите событие из списка класса или создайте новое на отдельной странице.
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EventUploadPage;
