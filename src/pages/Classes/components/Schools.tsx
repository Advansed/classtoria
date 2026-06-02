import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import {
  addOutline,
  businessOutline,
  chevronForwardOutline,
  createOutline,
  locationOutline,
  mapOutline,
  peopleOutline,
  schoolOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore, type SchoolClass, type UserSchool } from '../../../Store';
import { addClass, addSchool, editClass, editSchool } from '../classesApi';
import { useClassesStore } from '../classesStore';
import { canManageSchool } from '../utils';
import { CLASSES_CABINET } from '../routes';
import AddSchoolModal from './AddSchoolModal';
import './Schools.css';

const classCountLabel = (count: number): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) {
    return `${count} классов`;
  }
  if (n1 === 1) {
    return `${count} класс`;
  }
  if (n1 >= 2 && n1 <= 4) {
    return `${count} класса`;
  }
  return `${count} классов`;
};

const Schools: React.FC = () => {
  const history = useHistory();
  const toast = useToast();
  const token = useStore((s) => s.token);
  const profileRole = useStore((s) => s.profile?.role ?? '');
  const schools = useStore((s) => s.schools);
  const loadClasses = useStore((s) => s.loadClasses);
  const [loading, setLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [editSchoolTarget, setEditSchoolTarget] = useState<UserSchool | null>(null);
  const [editClassTarget, setEditClassTarget] = useState<SchoolClass | null>(null);
  const [submittingSchool, setSubmittingSchool] = useState(false);
  const [submittingClass, setSubmittingClass] = useState(false);
  const [submittingEditSchool, setSubmittingEditSchool] = useState(false);
  const [submittingEditClass, setSubmittingEditClass] = useState(false);

  useEffect(() => {
    if (!token?.trim()) {
      return;
    }
    if (schools.length > 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadClasses().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, schools.length, loadClasses]);

  useEffect(() => {
    if (schools.length === 0) {
      setSelectedSchoolId(null);
      return;
    }
    setSelectedSchoolId((prev) => {
      if (prev && !schools.some((s) => s.id === prev)) {
        return null;
      }
      return prev;
    });
  }, [schools]);

  const handleSchoolClick = (schoolId: string) => {
    setSelectedSchoolId((prev) => (prev === schoolId ? null : schoolId));
  };

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );

  const refreshSchools = async () => {
    setLoading(true);
    try {
      await loadClasses();
    } finally {
      setLoading(false);
    }
  };

  const submitAddSchool = async (name: string, region: string, location: string) => {
    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!name) {
      toast.warning('Укажите название школы');
      return;
    }
    if (!location) {
      toast.warning('Выберите населённый пункт из подсказок');
      return;
    }

    setSubmittingSchool(true);
    try {
      const res = await addSchool({ token: trimmedToken, name, region, location });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось добавить школу');
        return;
      }
      toast.success(res.message?.trim() || 'Школа добавлена');
      setAddSchoolOpen(false);
      await refreshSchools();
      const added = useStore
        .getState()
        .schools.find((s) => s.name.trim() === name.trim());
      if (added) {
        setSelectedSchoolId(added.id);
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingSchool(false);
    }
  };

  const submitEditSchool = async (schoolId: string, name: string) => {
    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!name) {
      toast.warning('Укажите название школы');
      return;
    }

    setSubmittingEditSchool(true);
    try {
      const res = await editSchool({ token: trimmedToken, schoolId, name });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось изменить название школы');
        return;
      }
      toast.success(res.message?.trim() || 'Название школы обновлено');
      setEditSchoolTarget(null);
      await refreshSchools();
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingEditSchool(false);
    }
  };

  const submitEditClass = async (classId: string, name: string) => {
    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!name) {
      toast.warning('Укажите название класса');
      return;
    }

    setSubmittingEditClass(true);
    try {
      const res = await editClass({ token: trimmedToken, classId, name });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось изменить название класса');
        return;
      }
      toast.success(res.message?.trim() || 'Название класса обновлено');
      setEditClassTarget(null);
      await refreshSchools();
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingEditClass(false);
    }
  };

  const submitAddClass = async (name: string) => {
    const trimmedToken = token?.trim() ?? '';
    const schoolId = selectedSchoolId?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!schoolId) {
      toast.warning('Сначала выберите школу');
      return;
    }

    setSubmittingClass(true);
    try {
      const res = await addClass({ token: trimmedToken, name, schoolId });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось добавить класс');
        return;
      }
      toast.success(res.message?.trim() || 'Класс добавлен');
      setAddClassOpen(false);
      await refreshSchools();
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingClass(false);
    }
  };

  const openClassCabinet = (school: UserSchool, classId: string, className: string) => {
    const currentToken = useStore.getState().token;
    if (currentToken?.trim()) {
      void useClassesStore.getState().loadClass({
        classId,
        schoolId: school.id,
        token: currentToken,
        name: className,
      });
    }

    history.push(CLASSES_CABINET, {
      schoolId: school.id,
      schoolName: school.name,
      classId,
      className,
    });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="classes-schools">
        <div className="classes-schools__scroll">
          <section className="classes-schools__section" aria-labelledby="classes-schools-heading">
            <div className="classes-schools__section-head classes-schools__section-head--row">
              <div className="classes-schools__section-title-wrap">
                <span className="classes-schools__section-icon" aria-hidden>
                  <IonIcon icon={schoolOutline} />
                </span>
                <h2 id="classes-schools-heading" className="classes-schools__h2">
                  Школы
                </h2>
              </div>
              <button
                type="button"
                className="classes-schools__add-btn"
                disabled={!token?.trim() || submittingSchool}
                onClick={() => setAddSchoolOpen(true)}
              >
                <IonIcon icon={addOutline} aria-hidden />
                Добавить школу
              </button>
            </div>

            {loading && schools.length === 0 ? (
              <div className="classes-schools__loading" role="status">
                <IonSpinner name="crescent" />
                <p>Загрузка школ…</p>
              </div>
            ) : schools.length === 0 ? (
              <div className="classes-schools__empty">
                <IonIcon icon={businessOutline} aria-hidden />
                <p>Нет доступных школ</p>
              </div>
            ) : (
              <ul className="classes-schools__schools-list">
                {schools.map((school) => {
                  const isSelected = school.id === selectedSchoolId;
                  const schoolAdmin = canManageSchool(profileRole, school);
                  const classesHeadingId = `classes-schools-classes-${school.id}`;
                  return (
                    <li key={school.id} className="classes-schools__school-item">
                      <div
                        className={`classes-schools__school-row${isSelected ? ' classes-schools__school-row--selected' : ''}`}
                      >
                        <button
                          type="button"
                          className={`classes-schools__school-card${isSelected ? ' classes-schools__school-card--selected' : ''}`}
                          aria-expanded={isSelected}
                          onClick={() => handleSchoolClick(school.id)}
                        >
                          <span className="classes-schools__school-icon" aria-hidden>
                            <IonIcon icon={businessOutline} />
                          </span>
                          <span className="classes-schools__school-body">
                            <span className="classes-schools__school-name">{school.name}</span>
                            {school.region.trim() ? (
                              <span className="classes-schools__school-meta">
                                <IonIcon icon={mapOutline} aria-hidden />
                                {school.region}
                              </span>
                            ) : null}
                            {school.location.trim() ? (
                              <span className="classes-schools__school-meta">
                                <IonIcon icon={locationOutline} aria-hidden />
                                {school.location}
                              </span>
                            ) : null}
                            <span className="classes-schools__school-count">
                              {classCountLabel(school.classes.length)}
                            </span>
                          </span>
                        </button>
                        <div className="classes-schools__school-rail" aria-hidden>
                          {schoolAdmin ? (
                            <button
                              type="button"
                              className="classes-schools__edit-btn classes-schools__edit-btn--school"
                              aria-label={`Редактировать школу «${school.name}»`}
                              disabled={submittingEditSchool}
                              onClick={() => setEditSchoolTarget(school)}
                            >
                              <IonIcon icon={createOutline} aria-hidden />
                            </button>
                          ) : (
                            <span className="classes-schools__school-rail-spacer" />
                          )}
                          <IonIcon
                            icon={chevronForwardOutline}
                            className="classes-schools__school-chevron"
                          />
                        </div>
                      </div>

                      {isSelected ? (
                        <div
                          className="classes-schools__classes-panel"
                          role="region"
                          aria-labelledby={classesHeadingId}
                        >
                          <div className="classes-schools__classes-head classes-schools__classes-head--row">
                            <div className="classes-schools__classes-head-main">
                              <span
                                className="classes-schools__section-icon classes-schools__section-icon--classes"
                                aria-hidden
                              >
                                <IonIcon icon={peopleOutline} />
                              </span>
                              <div>
                                <h3 id={classesHeadingId} className="classes-schools__h2">
                                  Классы
                                </h3>
                                <p className="classes-schools__classes-subtitle">{school.name}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="classes-schools__add-btn classes-schools__add-btn--class"
                              disabled={!token?.trim() || submittingClass}
                              onClick={() => setAddClassOpen(true)}
                            >
                              <IonIcon icon={addOutline} aria-hidden />
                              Добавить класс
                            </button>
                          </div>

                          {school.classes.length === 0 ? (
                            <div className="classes-schools__empty classes-schools__empty--compact">
                              <p>В этой школе пока нет классов</p>
                            </div>
                          ) : (
                            <div className="classes-schools__classes-grid">
                              {school.classes.map((cls) => {
                                return (
                                  <article key={cls.id} className="classes-schools__class-card">
                                    <div className="classes-schools__class-top">
                                      <span className="classes-schools__class-badge" aria-hidden>
                                        <IonIcon icon={peopleOutline} />
                                      </span>
                                      <div className="classes-schools__class-info">
                                        <p className="classes-schools__class-name">{cls.name}</p>
                                        <p className="classes-schools__class-meta">{school.name}</p>
                                      </div>
                                    </div>
                                    <IonButton
                                      expand="block"
                                      className="classes-schools__class-btn"
                                      onClick={() => openClassCabinet(school, cls.id, cls.name)}
                                    >
                                      Открыть ЛК класса
                                      <IonIcon slot="end" icon={chevronForwardOutline} aria-hidden />
                                    </IonButton>
                                  </article>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="classes-schools__bottom-spacer" aria-hidden />
        </div>

        <AddSchoolModal
          open={addSchoolOpen}
          submitting={submittingSchool}
          onClose={() => setAddSchoolOpen(false)}
          onSubmit={(name, region, location) => void submitAddSchool(name, region, location)}
        />

        <AddSchoolModal
          open={editSchoolTarget != null}
          submitting={submittingEditSchool}
          onClose={() => setEditSchoolTarget(null)}
          title="Редактировать школу"
          submitLabel="Сохранить"
          initialName={editSchoolTarget?.name ?? ''}
          initialRegion={editSchoolTarget?.region ?? ''}
          initialLocation={editSchoolTarget?.location ?? ''}
          onSubmit={(name) => {
            const school = editSchoolTarget;
            if (!school) {
              return;
            }
            void submitEditSchool(school.id, name);
          }}
        />

        <IonAlert
          isOpen={editClassTarget != null}
          onDidDismiss={() => setEditClassTarget(null)}
          header="Название класса"
          message={selectedSchool ? `Школа: ${selectedSchool.name}` : undefined}
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Например, 5 «А»',
              value: editClassTarget?.name ?? '',
            },
          ]}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: submittingEditClass ? '…' : 'Сохранить',
              handler: (data) => {
                const cls = editClassTarget;
                if (!cls) {
                  return;
                }
                const name = String(data?.name ?? '').trim();
                if (!name) {
                  toast.warning('Укажите название класса');
                  return false;
                }
                void submitEditClass(cls.id, name);
              },
            },
          ]}
        />

        <IonAlert
          isOpen={addClassOpen}
          onDidDismiss={() => setAddClassOpen(false)}
          header="Новый класс"
          message={selectedSchool ? `Школа: ${selectedSchool.name}` : undefined}
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Например, 5 «А»',
            },
          ]}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: submittingClass ? '…' : 'Добавить',
              handler: (data) => {
                const name = String(data?.name ?? '').trim();
                if (!name) {
                  toast.warning('Укажите название класса');
                  return false;
                }
                void submitAddClass(name);
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Schools;
