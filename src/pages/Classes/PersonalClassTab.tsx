import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import {
  businessOutline,
  chevronForwardOutline,
  locationOutline,
  mapOutline,
  peopleOutline,
  schoolOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore, type UserSchool } from '../../Store';
import { useClassesStore } from './classesStore';
import './PersonalClassTab.css';

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

const PersonalClassTab: React.FC = () => {
  const history = useHistory();
  const token = useStore((s) => s.token);
  const schools = useStore((s) => s.schools);
  const loadClasses = useStore((s) => s.loadClasses);
  const [loading, setLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

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

  const openClassCabinet = (school: UserSchool, classId: string, className: string) => {
    const token = useStore.getState().token;
    if (token?.trim()) {
      void useClassesStore.getState().loadClass({
        classId,
        schoolId: school.id,
        token,
        name: className,
      });
    }

    history.push('/class-cabinet', {
      schoolId: school.id,
      schoolName: school.name,
      classId,
      className,
    });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="personal-class">
        <div className="personal-class__scroll">
          <section className="personal-class__section" aria-labelledby="personal-class-schools-heading">
            <div className="personal-class__section-head">
              <span className="personal-class__section-icon" aria-hidden>
                <IonIcon icon={schoolOutline} />
              </span>
              <h2 id="personal-class-schools-heading" className="personal-class__h2">
                Школы
              </h2>
            </div>

            {loading && schools.length === 0 ? (
              <div className="personal-class__loading" role="status">
                <IonSpinner name="crescent" />
                <p>Загрузка школ…</p>
              </div>
            ) : schools.length === 0 ? (
              <div className="personal-class__empty">
                <IonIcon icon={businessOutline} aria-hidden />
                <p>Нет доступных школ</p>
              </div>
            ) : (
              <ul className="personal-class__schools-list">
                {schools.map((school) => {
                  const isSelected = school.id === selectedSchoolId;
                  return (
                    <li key={school.id}>
                      <button
                        type="button"
                        className={`personal-class__school-card${isSelected ? ' personal-class__school-card--selected' : ''}`}
                        aria-expanded={isSelected}
                        onClick={() => handleSchoolClick(school.id)}
                      >
                        <span className="personal-class__school-icon" aria-hidden>
                          <IonIcon icon={businessOutline} />
                        </span>
                        <span className="personal-class__school-body">
                          <span className="personal-class__school-name">{school.name}</span>
                          {school.region.trim() ? (
                            <span className="personal-class__school-meta">
                              <IonIcon icon={mapOutline} aria-hidden />
                              {school.region}
                            </span>
                          ) : null}
                          {school.location.trim() ? (
                            <span className="personal-class__school-meta">
                              <IonIcon icon={locationOutline} aria-hidden />
                              {school.location}
                            </span>
                          ) : null}
                          <span className="personal-class__school-count">
                            {classCountLabel(school.classes.length)}
                          </span>
                        </span>
                        <IonIcon
                          icon={chevronForwardOutline}
                          className="personal-class__school-chevron"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selectedSchool ? (
            <section className="personal-class__section" aria-labelledby="personal-class-classes-heading">
              <div className="personal-class__classes-head">
                <span className="personal-class__section-icon personal-class__section-icon--classes" aria-hidden>
                  <IonIcon icon={peopleOutline} />
                </span>
                <div>
                  <h2 id="personal-class-classes-heading" className="personal-class__h2">
                    Классы
                  </h2>
                  <p className="personal-class__classes-subtitle">{selectedSchool.name}</p>
                </div>
              </div>

              {selectedSchool.classes.length === 0 ? (
                <div className="personal-class__empty personal-class__empty--compact">
                  <p>В этой школе пока нет классов</p>
                </div>
              ) : (
                <div className="personal-class__classes-grid">
                  {selectedSchool.classes.map((cls) => (
                    <article key={cls.id} className="personal-class__class-card">
                      <div className="personal-class__class-top">
                        <span className="personal-class__class-badge" aria-hidden>
                          <IonIcon icon={peopleOutline} />
                        </span>
                        <div className="personal-class__class-info">
                          <p className="personal-class__class-name">{cls.name}</p>
                          <p className="personal-class__class-meta">{selectedSchool.name}</p>
                        </div>
                      </div>
                      <IonButton
                        expand="block"
                        className="personal-class__class-btn"
                        onClick={() => openClassCabinet(selectedSchool, cls.id, cls.name)}
                      >
                        Открыть ЛК класса
                        <IonIcon slot="end" icon={chevronForwardOutline} aria-hidden />
                      </IonButton>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <div className="personal-class__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonalClassTab;
