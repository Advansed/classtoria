import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { Camera, ChevronDown, ChevronLeft, School, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getDadataToken } from '../../../config/dadata';
import { useAvatarDisplayUrl } from '../../../hooks/useAvatarDisplayUrl';
import { useToast } from '../../../hooks/useToast';
import { useStore, type UserClass } from '../../../Store';
import type { DaDataFioSuggestion } from 'react-dadata';
import { addChild, childAvatarFilename, generateChildUserId } from '../addChildApi';
import { uploadChildAvatarFile } from './avatarUpload';
import AddChildFioField from './AddChildFioField';
import '../../Classes/components/EventUploadPage.css';
import './AddChildPage.css';

const ORANGE_BUTTON = '#e86a24';
const PICKER_ICON_SIZE = 20;
const MAX_CHILD_PHOTO_BYTES = 5 * 1024 * 1024;

const classOptionKey = (cls: UserClass): string => `${cls.schoolId}:${cls.id}`;

const formatClassLabel = (cls: UserClass): string =>
  `${cls.schoolName.trim()} · ${cls.name.trim()}`;

const resolveChildName = (
  fio: DaDataFioSuggestion | undefined,
  manualName: string,
): string => {
  if (fio?.data) {
    const parts = [fio.data.surname, fio.data.name, fio.data.patronymic]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  const fromSuggestion = fio?.value?.trim();
  if (fromSuggestion) {
    return fromSuggestion;
  }
  return manualName.trim();
};

const AddChildPage: React.FC = () => {
  const history = useHistory();
  const toast = useToast();
  const avatarSrc = useAvatarDisplayUrl();
  const dadataToken = getDadataToken();
  const token = useStore((s) => s.token);
  const parentId = useStore((s) => s.user_id);
  const classes = useStore((s) => s.classes);
  const loadClasses = useStore((s) => s.loadClasses);

  const [classesLoading, setClassesLoading] = useState(false);
  const [classListOpen, setClassListOpen] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
  const [childFio, setChildFio] = useState<DaDataFioSuggestion | undefined>();
  const [childNameManual, setChildNameManual] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [childUserId, setChildUserId] = useState<string | null>(null);
  const [childImagePath, setChildImagePath] = useState<string | null>(null);
  const [childPhotoFile, setChildPhotoFile] = useState<File | null>(null);
  const [childPhotoPreview, setChildPhotoPreview] = useState<string | null>(null);
  const classPickerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token?.trim()) {
      return;
    }
    if (classes.length > 0) {
      return;
    }

    let cancelled = false;
    setClassesLoading(true);
    void loadClasses().finally(() => {
      if (!cancelled) {
        setClassesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, classes.length, loadClasses]);

  useEffect(() => {
    if (!classListOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!classPickerRef.current?.contains(e.target as Node)) {
        setClassListOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [classListOpen]);

  useEffect(
    () => () => {
      if (childPhotoPreview) {
        URL.revokeObjectURL(childPhotoPreview);
      }
    },
    [childPhotoPreview],
  );

  const sortedClasses = useMemo(
    () =>
      [...classes].sort(
        (a, b) =>
          a.schoolName.localeCompare(b.schoolName, 'ru') ||
          a.name.localeCompare(b.name, 'ru'),
      ),
    [classes],
  );

  const selectedClass = useMemo(
    () => sortedClasses.find((cls) => classOptionKey(cls) === selectedClassKey) ?? null,
    [sortedClasses, selectedClassKey],
  );

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/personal/home');
  };

  const selectClass = (cls: UserClass) => {
    setSelectedClassKey(classOptionKey(cls));
    setClassListOpen(false);
  };

  const handlePhotoPick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.warning('Выберите изображение');
      return;
    }
    if (file.size > MAX_CHILD_PHOTO_BYTES) {
      toast.warning('Файл не больше 5 MB');
      return;
    }

    const userId = childUserId ?? generateChildUserId();
    const imagePath = childAvatarFilename(userId);

    setChildUserId(userId);
    setChildImagePath(imagePath);
    setChildPhotoFile(file);
    setChildPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleRegister = async () => {
    const trimmedToken = token?.trim() ?? '';
    const trimmedParentId = parentId.trim();

    if (!trimmedToken || !trimmedParentId) {
      toast.error('Войдите в аккаунт');
      return;
    }
    if (!selectedClass) {
      toast.warning('Выберите класс');
      return;
    }

    const name = resolveChildName(childFio, childNameManual);
    if (!name) {
      toast.warning('Укажите фамилию и имя ребёнка');
      return;
    }
    if (!phone.trim()) {
      toast.warning('Укажите телефон ребёнка');
      return;
    }
    if (!agreed) {
      toast.warning('Примите условия соглашения');
      return;
    }

    const userId = childUserId ?? generateChildUserId();
    const imagePath = childImagePath ?? childAvatarFilename(userId);

    setSubmitting(true);
    try {
      const res = await addChild({
        token: trimmedToken,
        classId: selectedClass.id,
        parentId: trimmedParentId,
        userId,
        name,
        phone,
      });

      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось зарегистрировать ребёнка');
        return;
      }

      if (childPhotoFile) {
        try {
          await uploadChildAvatarFile(trimmedToken, imagePath, childPhotoFile);
        } catch (uploadErr) {
          const msg =
            uploadErr instanceof Error ? uploadErr.message : 'Не удалось загрузить фото';
          toast.warning(`Ребёнок добавлен, но фото не загружено: ${msg}`);
          history.push('/personal/home');
          return;
        }
      }

      toast.success(res.message?.trim() || 'Ребёнок добавлен');
      history.push('/personal/home');
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="add-child">
        <div className="add-child__scroll">
          <div className="add-child__topbar">
            <button type="button" className="add-child__back" onClick={handleBack} aria-label="Назад">
              <ChevronLeft size={26} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="add-child__user-btn"
              onClick={() => history.push('/personal/profile')}
              aria-label="Профиль"
            >
              <img src={avatarSrc} alt="" className="add-child__avatar" width={42} height={42} />
            </button>
          </div>

          <h1 className="add-child__page-title">Регистрация ребёнка</h1>
          <p className="add-child__page-intro">
            Заполните информацию о ребёнке, чтобы добавить его в личный кабинет
          </p>

          <div className="add-child__form">
            <div className="add-child__group">
              <span id="lbl-city" className="add-child__lbl">
                Город
              </span>
              <div className="add-child__box add-child__box--muted" aria-labelledby="lbl-city">
                <span className="add-child__value">Якутск</span>
                <svg
                  className="add-child__lock-svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M7 11V8a5 5 0 0 1 10 0v3M6 21h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                </svg>
              </div>
            </div>

            <div className="add-child__group">
              <span id="lbl-class" className="add-child__lbl">
                Выберите класс
              </span>
              {classesLoading && sortedClasses.length === 0 ? (
                <div className="add-child__classes-loading" role="status">
                  <IonSpinner name="crescent" />
                  Загрузка классов…
                </div>
              ) : sortedClasses.length > 0 ? (
                <div
                  ref={classPickerRef}
                  className={`event-upload__event-picker add-child__class-picker${classListOpen ? ' event-upload__event-picker--open' : ''}`}
                >
                  <button
                    type="button"
                    id="add-child-class-picker-trigger"
                    className="event-upload__picker-btn"
                    aria-labelledby="lbl-class"
                    aria-expanded={classListOpen}
                    aria-haspopup="listbox"
                    onClick={() => setClassListOpen((open) => !open)}
                  >
                    <School size={PICKER_ICON_SIZE} aria-hidden />
                    <span className="event-upload__picker-btn-label">
                      {selectedClass ? formatClassLabel(selectedClass) : 'Выберите класс'}
                    </span>
                    <ChevronDown
                      size={PICKER_ICON_SIZE}
                      className="event-upload__picker-chevron"
                      aria-hidden
                    />
                  </button>
                  {classListOpen ? (
                    <ul
                      className="event-upload__picker-list"
                      role="listbox"
                      aria-label="Список классов"
                    >
                      {sortedClasses.map((cls) => {
                        const key = classOptionKey(cls);
                        const isSelected = key === selectedClassKey;
                        return (
                          <li key={key} role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`event-upload__picker-item${isSelected ? ' event-upload__picker-item--selected' : ''}`}
                              onClick={() => selectClass(cls)}
                            >
                              {formatClassLabel(cls)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="add-child__classes-empty">Нет доступных классов</p>
              )}
            </div>

            {dadataToken ? (
              <AddChildFioField
                id="child-fio"
                label="Фамилия и имя ребёнка"
                placeholder="Введите фамилию и имя"
                token={dadataToken}
                value={childFio}
                onChange={setChildFio}
              />
            ) : (
              <div className="add-child__group">
                <label htmlFor="child-fio" className="add-child__lbl">
                  Фамилия и имя ребёнка
                </label>
                <div className="add-child__box">
                  <input
                    id="child-fio"
                    className="add-child__input"
                    placeholder="Введите фамилию и имя"
                    autoComplete="name"
                    value={childNameManual}
                    onChange={(e) => setChildNameManual(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="add-child__group">
              <label htmlFor="child-phone" className="add-child__lbl">
                Телефон ребёнка
              </label>
              <div className="add-child__box">
                <input
                  id="child-phone"
                  className="add-child__input"
                  type="tel"
                  placeholder="Введите номер телефона"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <p className="add-child__hint">
                Этот номер будет использоваться для входа в ЛК ученика
              </p>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="add-child__photo-input"
              aria-hidden
              tabIndex={-1}
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              className={`add-child__photo-area${childPhotoPreview ? ' add-child__photo-area--has-preview' : ''}`}
              onClick={handlePhotoPick}
            >
              {childPhotoPreview ? (
                <img
                  src={childPhotoPreview}
                  alt=""
                  className="add-child__photo-preview"
                />
              ) : (
                <Camera size={28} strokeWidth={1.75} aria-hidden />
              )}
              <span className="add-child__photo-title">
                {childPhotoPreview ? 'Изменить фото' : 'Добавить фото'}
              </span>
              <span className="add-child__photo-meta">
                {childImagePath ? childImagePath : 'JPG, PNG до 5 MB'}
              </span>
            </button>

            <div className="add-child__notice" role="status">
              <span className="add-child__notice-icon" aria-hidden>
                <Shield size={22} strokeWidth={1.75} />
              </span>
              <p className="add-child__notice-body">
                Эти данные будут видеть только родитель и ребёнок. Никто другой не увидит имя,
                фамилию и номер телефона ребёнка.
              </p>
            </div>

            <label className="add-child__agree">
              <input
                type="checkbox"
                className="add-child__checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="add-child__agree-text">
                Нажимая кнопку «Зарегистрировать», вы принимаете условия{' '}
                <button type="button" className="add-child__link">
                  соглашения
                </button>{' '}
                и{' '}
                <button type="button" className="add-child__link">
                  политики конфиденциальности
                </button>
              </span>
            </label>

            <button
              type="button"
              className="add-child__submit"
              style={{ background: ORANGE_BUTTON }}
              disabled={submitting}
              onClick={() => void handleRegister()}
            >
              {submitting ? 'РЕГИСТРАЦИЯ…' : 'ЗАРЕГИСТРИРОВАТЬ'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AddChildPage;
