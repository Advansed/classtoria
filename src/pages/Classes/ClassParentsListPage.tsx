import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, peopleOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from '../../Store';
import type { ClassMember, ClassRouteState } from './types';
import { useClassesStore } from './classesStore';
import { formatPhoneDisplay } from './utils';
import './ClassParentsListPage.css';

const parentCountLabel = (count: number): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) {
    return `${count} родителей`;
  }
  if (n1 === 1) {
    return `${count} родитель`;
  }
  if (n1 >= 2 && n1 <= 4) {
    return `${count} родителя`;
  }
  return `${count} родителей`;
};

const ClassParentsListPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ClassRouteState>();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);

  const classId = state.classId?.trim() ?? '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || '—';
  const classNameFromRoute = state.className?.trim() || '—';

  const loadClass = useClassesStore((s) => s.loadClass);
  const parents = useClassesStore((s) => (classId ? s.getParents(classId) : []));
  const updateMember = useClassesStore((s) => s.updateMember);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  const cabinetState: ClassRouteState = {
    schoolId,
    schoolName,
    classId,
    className: classNameFromRoute,
  };

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

  const startEdit = (member: ClassMember) => {
    setEditingId(member.id);
    setDraftName(member.name);
    setDraftPhone(formatPhoneDisplay(member.phone) || member.phone);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftPhone('');
  };

  const saveEdit = (memberId: string) => {
    if (!classId) {
      return;
    }
    const name = draftName.trim();
    if (!name) {
      return;
    }
    updateMember(classId, memberId, {
      name,
      phone: draftPhone.trim(),
    });
    cancelEdit();
  };

  const toggleAuthorized = (member: ClassMember) => {
    if (!classId) {
      return;
    }
    updateMember(classId, member.id, { authorized: !member.authorized });
  };

  return (
    <IonPage>
      <IonHeader className="class-members-list__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              className="class-members-list__back"
              onClick={() => history.push('/class-cabinet', cabinetState)}
            >
              <IonIcon slot="start" icon={chevronBackOutline} aria-hidden />
              Назад
            </IonButton>
          </IonButtons>
          <IonTitle className="class-members-list__toolbar-title">Белый список</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="class-members-list">
        <div className="class-members-list__scroll">
          <div className="class-members-list__top">
            <div>
              <h1 className="class-members-list__school">{schoolName}</h1>
              <p className="class-members-list__class">{classNameFromRoute}</p>
            </div>
            <div className="class-members-list__top-right">
              <IonSelect
                interface="popover"
                className="class-members-list__year-select"
                value="2025-2026"
                aria-label="Учебный год"
              >
                <IonSelectOption value="2025-2026">2025–2026</IonSelectOption>
                <IonSelectOption value="2024-2025">2024–2025</IonSelectOption>
              </IonSelect>
              <span className="class-members-list__count-badge">
                <IonIcon icon={peopleOutline} aria-hidden />
                {parentCountLabel(parents.length)}
              </span>
            </div>
          </div>

          <section className="class-members-list__card" aria-labelledby="parents-list-heading">
            <h2 id="parents-list-heading" className="class-members-list__h2">
              Список родителей
            </h2>

            {parents.length === 0 ? (
              <p className="class-members-list__empty">В белом списке пока нет родителей</p>
            ) : (
              <div className="class-members-list__table-wrap">
                <div className="class-members-list__table-head" aria-hidden>
                  <span>ФИ родителя</span>
                  <span>Номер телефона</span>
                  <span>Статус</span>
                  <span />
                </div>
                <ul className="class-members-list__rows">
                  {parents.map((member) => {
                    const isEditing = editingId === member.id;
                    return (
                      <li key={member.id}>
                        <div
                          className={`class-members-list__row${isEditing ? ' class-members-list__row--editing' : ''}`}
                        >
                          <div className="class-members-list__cell class-members-list__cell--name">
                            {isEditing ? (
                              <IonInput
                                className="class-members-list__input"
                                value={draftName}
                                onIonInput={(e) => setDraftName(e.detail.value ?? '')}
                                aria-label="ФИО родителя"
                              />
                            ) : (
                              <span className="class-members-list__text">{member.name}</span>
                            )}
                          </div>
                          <div className="class-members-list__cell class-members-list__cell--phone">
                            {isEditing ? (
                              <IonInput
                                className="class-members-list__input"
                                type="tel"
                                inputMode="tel"
                                value={draftPhone}
                                onIonInput={(e) =>
                                  setDraftPhone(formatPhoneDisplay(e.detail.value ?? ''))
                                }
                                aria-label="Номер телефона"
                              />
                            ) : (
                              <span className="class-members-list__text">
                                {formatPhoneDisplay(member.phone) || '—'}
                              </span>
                            )}
                          </div>
                          <div className="class-members-list__cell class-members-list__cell--status">
                            <button
                              type="button"
                              className={`class-members-list__status${
                                member.authorized
                                  ? ' class-members-list__status--ok'
                                  : ' class-members-list__status--pending'
                              }`}
                              onClick={() => toggleAuthorized(member)}
                              disabled={isEditing}
                            >
                              {member.authorized ? 'Авторизовался' : 'Пока еще нет'}
                            </button>
                          </div>
                          <div className="class-members-list__cell class-members-list__cell--action">
                            {isEditing ? (
                              <div className="class-members-list__edit-actions">
                                <button
                                  type="button"
                                  className="class-members-list__save"
                                  onClick={() => saveEdit(member.id)}
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  className="class-members-list__cancel"
                                  onClick={cancelEdit}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="class-members-list__row-btn"
                                aria-label={`Редактировать ${member.name}`}
                                onClick={() => startEdit(member)}
                              >
                                <IonIcon icon={chevronForwardOutline} aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <div className="class-members-list__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassParentsListPage;
