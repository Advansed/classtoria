import {
  IonAlert,
  IonBackButton,
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
import {
  chevronBackOutline,
  chevronForwardOutline,
  peopleOutline,
  schoolOutline,
  trashOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizePhoneDigits } from '../../authCookies';
import { useToast } from '../../hooks/useToast';
import { useStore } from '../../Store';
import { useClassesStore } from './classesStore';
import { CLASSES_CABINET } from './routes';
import type { ClassMember, ClassRouteState } from './types';
import {
  filterParents,
  filterStudents,
  filterTeachers,
  formatPhoneDisplay,
  isClassAdminRole,
  resolveWhitelistTeacher,
  splitMembersByChecked,
} from './utils';
import './ClassParentsListPage.css';

const FALLBACK_TEACHER_IMG = '/images/start-gallery.png';

type WhitelistTab = 'students' | 'parents';

type AddMemberDialogRole = 'student' | 'parent' | 'teacher';

const ADD_MEMBER_DIALOG: Record<
  AddMemberDialogRole,
  { header: string; message: string; success: string; error: string }
> = {
  student: {
    header: 'Добавить ученика',
    message: 'Введите номер телефона ученика',
    success: 'Ученик добавлен',
    error: 'Не удалось добавить ученика',
  },
  parent: {
    header: 'Добавить родителя',
    message: 'Введите номер телефона родителя',
    success: 'Родитель добавлен',
    error: 'Не удалось добавить родителя',
  },
  teacher: {
    header: 'Добавить учителя',
    message: 'Введите номер телефона учителя',
    success: 'Учитель добавлен',
    error: 'Не удалось добавить учителя',
  },
};

const TEACHER_CHANGE_DIALOG = {
  header: 'Изменить классного руководителя',
  message: 'Введите номер телефона нового классного руководителя',
  success: 'Классный руководитель изменён',
  error: 'Не удалось изменить классного руководителя',
};

const studentCountLabel = (count: number): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) {
    return `${count} учеников`;
  }
  if (n1 === 1) {
    return `${count} ученик`;
  }
  if (n1 >= 2 && n1 <= 4) {
    return `${count} ученика`;
  }
  return `${count} учеников`;
};

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

type EditHandlers = {
  editingId: string | null;
  draftName: string;
  draftPhone: string;
  confirmingId: string | null;
  deletingId: string | null;
  onDraftName: (value: string) => void;
  onDraftPhone: (value: string) => void;
  onStartEdit: (member: ClassMember) => void;
  onCancelEdit: () => void;
  onSaveEdit: (memberId: string) => void;
  onToggleAuthorized: (member: ClassMember) => void;
  onConfirm: (member: ClassMember) => void;
  onDelete: (member: ClassMember) => void;
};

type MemberRowProps = EditHandlers & {
  member: ClassMember;
  nameLabel: string;
  variant: 'confirmed' | 'pending';
};

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  nameLabel,
  variant,
  editingId,
  draftName,
  draftPhone,
  confirmingId,
  deletingId,
  onDraftName,
  onDraftPhone,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleAuthorized,
  onConfirm,
  onDelete,
}) => {
  const isEditing = editingId === member.id;
  const isPending = variant === 'pending';
  const isConfirming = confirmingId === member.id;
  const isDeleting = deletingId === member.id;

  return (
    <li>
      <div
        className={`class-members-list__row class-members-list__row--${variant}${
          isEditing ? ' class-members-list__row--editing' : ''
        }`}
      >
        <div className="class-members-list__cell class-members-list__cell--name">
          {isEditing && !isPending ? (
            <IonInput
              className="class-members-list__input"
              value={draftName}
              onIonInput={(e) => onDraftName(e.detail.value ?? '')}
              aria-label={nameLabel}
            />
          ) : (
            <span className="class-members-list__text">{member.name}</span>
          )}
        </div>
        <div className="class-members-list__cell class-members-list__cell--phone">
          {isEditing && !isPending ? (
            <IonInput
              className="class-members-list__input"
              type="tel"
              inputMode="tel"
              value={draftPhone}
              onIonInput={(e) => onDraftPhone(formatPhoneDisplay(e.detail.value ?? ''))}
              aria-label="Номер телефона"
            />
          ) : (
            <span className="class-members-list__text">
              {formatPhoneDisplay(member.phone) || '—'}
            </span>
          )}
        </div>
        <div className="class-members-list__cell class-members-list__cell--status">
          {isPending ? null : (
            <button
              type="button"
              className={`class-members-list__status${
                member.authorized
                  ? ' class-members-list__status--ok'
                  : ' class-members-list__status--pending'
              }`}
              onClick={() => onToggleAuthorized(member)}
              disabled={isEditing}
            >
              {member.authorized ? 'Вошёл' : ''}
            </button>
          )}
        </div>
        <div className="class-members-list__cell class-members-list__cell--action">
          {isPending ? (
            <button
              type="button"
              className="class-members-list__confirm-btn"
              disabled={isConfirming}
              onClick={() => onConfirm(member)}
            >
              {isConfirming ? '…' : 'Подтвердить'}
            </button>
          ) : isEditing ? (
            <div className="class-members-list__edit-actions">
              <button type="button" className="class-members-list__save" onClick={() => onSaveEdit(member.id)}>
                OK
              </button>
              <button type="button" className="class-members-list__cancel" onClick={onCancelEdit}>
                ×
              </button>
            </div>
          ) : (
            <div className="class-members-list__row-actions">
              <button
                type="button"
                className="class-members-list__delete-btn"
                onClick={() => onDelete(member)}
                disabled={isDeleting}
              >
                {isDeleting ? '…' : 'Удалить'}
              </button>
              <button
                type="button"
                className="class-members-list__row-btn"
                aria-label={`Редактировать ${member.name}`}
                onClick={() => onStartEdit(member)}
                disabled={isDeleting}
              >
                <IonIcon icon={chevronForwardOutline} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

type MemberTableProps = EditHandlers & {
  members: ClassMember[];
  variant: 'confirmed' | 'pending';
  nameColumnLabel: string;
  nameFieldLabel: string;
  listId: string;
};

const MemberTable: React.FC<MemberTableProps> = ({
  members,
  variant,
  nameColumnLabel,
  nameFieldLabel,
  listId,
  ...editHandlers
}) => (
  <div className={`class-members-list__table-wrap class-members-list__table-wrap--${variant}`}>
    <div className="class-members-list__table-head" aria-hidden>
      <span>{nameColumnLabel}</span>
      <span>Номер</span>
      <span>{variant === 'pending' ? '' : 'Статус'}</span>
      <span />
    </div>
    <ul id={listId} className="class-members-list__rows">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          nameLabel={nameFieldLabel}
          variant={variant}
          {...editHandlers}
        />
      ))}
    </ul>
  </div>
);

type SectionHeadProps = {
  id: string;
  title: string;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
};

const SectionHead: React.FC<SectionHeadProps> = ({
  id,
  title,
  onAction,
  actionLabel = '+ Добавить',
  actionDisabled,
}) => (
  <div className="class-members-list__section-head">
    <h2 id={id} className="class-members-list__h2">
      {title}
    </h2>
    {onAction ? (
      <button
        type="button"
        className="class-members-list__head-add"
        onClick={onAction}
        disabled={actionDisabled}
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

type MemberSplitListSectionProps = {
  headingId: string;
  title: string;
  members: ClassMember[];
  nameColumnLabel: string;
  nameFieldLabel: string;
  emptyText: string;
  editHandlers: EditHandlers;
  onAdd?: () => void;
  addDisabled?: boolean;
};

const MemberSplitListSection: React.FC<MemberSplitListSectionProps> = ({
  headingId,
  title,
  members,
  nameColumnLabel,
  nameFieldLabel,
  emptyText,
  editHandlers,
  onAdd,
  addDisabled,
}) => {
  const { confirmed, pending } = useMemo(() => splitMembersByChecked(members), [members]);
  const titleWithCount = `${title} (${members.length})`;

  if (members.length === 0) {
    return (
      <section className="class-members-list__card" aria-labelledby={headingId}>
        <SectionHead
          id={headingId}
          title={titleWithCount}
          onAction={onAdd}
          actionDisabled={addDisabled}
        />
        <p className="class-members-list__empty">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="class-members-list__card" aria-labelledby={headingId}>
      <SectionHead
        id={headingId}
        title={titleWithCount}
        onAction={onAdd}
        actionDisabled={addDisabled}
      />

      <div className="class-members-list__split">
        <div className="class-members-list__subsection class-members-list__subsection--confirmed">
          {confirmed.length === 0 ? (
            <p className="class-members-list__empty class-members-list__empty--compact">
              Пока нет подтверждённых
            </p>
          ) : (
            <MemberTable
              members={confirmed}
              variant="confirmed"
              nameColumnLabel={nameColumnLabel}
              nameFieldLabel={nameFieldLabel}
              listId={`${headingId}-confirmed`}
              {...editHandlers}
            />
          )}
        </div>

        {pending.length > 0 ? (
          <div className="class-members-list__subsection class-members-list__subsection--pending">
            <h3 className="class-members-list__h3">Не подтверждённые ({pending.length})</h3>
            <MemberTable
              members={pending}
              variant="pending"
              nameColumnLabel={nameColumnLabel}
              nameFieldLabel={nameFieldLabel}
              listId={`${headingId}-pending`}
              {...editHandlers}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};

const ClassWhitelistPage: React.FC = () => {
  const location = useLocation<ClassRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const flatClassRole = useStore((s) => s.classes.find((c) => c.id === state.classId)?.role ?? '');

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || '—';
  const classNameFromRoute = state.className?.trim() || '—';

  const loadClass = useClassesStore((s) => s.loadClass);
  const classDetail = useClassesStore((s) =>
    classId ? s.classes.find((c) => c.id === classId) : undefined,
  );
  console.log(classDetail);
  const members = classDetail?.members;
  const students = useMemo(() => filterStudents(members ?? []), [members]);
  const parents = useMemo(() => filterParents(members ?? []), [members]);
  const teacherMembers = useMemo(() => filterTeachers(members ?? []), [members]);
  const updateMember = useClassesStore((s) => s.updateMember);
  const confirmMember = useClassesStore((s) => s.confirmMember);
  const deleteMember = useClassesStore((s) => s.deleteMember);
  const addMember = useClassesStore((s) => s.addMember);

  const [activeTab, setActiveTab] = useState<WhitelistTab>('students');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [addMemberDialog, setAddMemberDialog] = useState<AddMemberDialogRole | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const classRole = classDetail?.role?.trim() || flatClassRole.trim();
  const isClassAdmin = isClassAdminRole(classRole);

  const displayClassName = classDetail?.name || classNameFromRoute;
  const classTeacher = classDetail?.teacher;

  const teacherCard = useMemo(
    () => resolveWhitelistTeacher(classTeacher, teacherMembers, members),
    [classTeacher, teacherMembers, members],
  );

  const teacherDisplayName = teacherCard.name || 'Имя не указано';
  const teacherPhoneFormatted = formatPhoneDisplay(teacherCard.phone);
  const teacherImage = teacherCard.image || FALLBACK_TEACHER_IMG;
  const hasTeacher = Boolean(
    teacherCard.name ||
      teacherCard.phone ||
      teacherCard.member ||
      classTeacher?.id,
  );

  const addMemberDialogCopy = useMemo(() => {
    if (!addMemberDialog) {
      return null;
    }
    if (addMemberDialog === 'teacher' && hasTeacher) {
      return TEACHER_CHANGE_DIALOG;
    }
    return ADD_MEMBER_DIALOG[addMemberDialog];
  }, [addMemberDialog, hasTeacher]);

  const addMemberDialogSubmitLabel =
    addMemberDialog === 'teacher' && hasTeacher ? 'Сохранить' : 'Добавить';

  const countBadgeLabel =
    activeTab === 'students'
      ? studentCountLabel(students.length)
      : parentCountLabel(parents.length);

  const switchTab = (tab: WhitelistTab) => {
    setActiveTab(tab);
    setEditingId(null);
    setDraftName('');
    setDraftPhone('');
  };

  console.log(members)

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

  const editHandlers = useMemo(
    () => ({
      editingId,
      draftName,
      draftPhone,
      confirmingId,
      deletingId,
      onDraftName: setDraftName,
      onDraftPhone: setDraftPhone,
      onStartEdit: (member: ClassMember) => {
        if (!member.checked) {
          return;
        }
        setEditingId(member.id);
        setDraftName(member.name);
        setDraftPhone(formatPhoneDisplay(member.phone) || member.phone);
      },
      onCancelEdit: () => {
        setEditingId(null);
        setDraftName('');
        setDraftPhone('');
      },
      onSaveEdit: (memberId: string) => {
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
        setEditingId(null);
        setDraftName('');
        setDraftPhone('');
      },
      onToggleAuthorized: (member: ClassMember) => {
        if (!classId || !member.checked) {
          return;
        }
        updateMember(classId, member.id, { authorized: !member.authorized });
      },
      onConfirm: (member: ClassMember) => {
        const trimmedToken = token?.trim();
        if (!trimmedToken || !classId) {
          toast.warning('Нет данных для подтверждения');
          return;
        }
        setConfirmingId(member.id);
        void confirmMember({
          token: trimmedToken,
          classId,
          userId: member.id,
          schoolId,
          name: classNameFromRoute,
        })
          .then((result) => {
            if (result.success) {
              toast.success(result.message ?? 'Участник подтверждён');
              setEditingId(null);
            } else {
              toast.error(result.message ?? 'Не удалось подтвердить');
            }
          })
          .catch(() => {
            toast.error('Ошибка сети');
          })
          .finally(() => {
            setConfirmingId(null);
          });
      },
      onDelete: (member: ClassMember) => {
        const trimmedToken = token?.trim();
        if (!trimmedToken || !classId) {
          toast.warning('Нет данных для удаления');
          return;
        }
        setDeletingId(member.id);
        void deleteMember({
          token: trimmedToken,
          classId,
          userId: member.id,
          schoolId,
          name: classNameFromRoute,
        })
          .then((result) => {
            if (result.success) {
              toast.success(result.message ?? 'Участник удалён');
              if (editingId === member.id) {
                setEditingId(null);
                setDraftName('');
                setDraftPhone('');
              }
            } else {
              toast.error(result.message ?? 'Не удалось удалить');
            }
          })
          .catch(() => {
            toast.error('Ошибка сети');
          })
          .finally(() => {
            setDeletingId(null);
          });
      },
    }),
    [
      classId,
      classNameFromRoute,
      confirmMember,
      draftName,
      draftPhone,
      editingId,
      confirmingId,
      deletingId,
      deleteMember,
      schoolId,
      token,
      toast,
      updateMember,
    ],
  );

  const openAddMemberDialog = (role: AddMemberDialogRole) => {
    if (!token?.trim() || !classId) {
      toast.warning('Нет данных класса');
      return;
    }
    setAddMemberDialog(role);
  };

  const submitAddMember = async (
    phoneRaw: string,
    role: AddMemberDialogRole,
    isTeacherChange = false,
  ) => {
    const trimmedToken = token?.trim();
    if (!trimmedToken || !classId) {
      toast.warning('Нет данных для добавления');
      return;
    }

    const phone = normalizePhoneDigits(phoneRaw);
    if (phone.length < 11) {
      toast.warning('Введите полный номер телефона');
      return;
    }

    const labels =
      role === 'teacher' && isTeacherChange ? TEACHER_CHANGE_DIALOG : ADD_MEMBER_DIALOG[role];
    setAddMemberDialog(null);
    setIsAddingMember(true);
    try {
      const result = await addMember({
        token: trimmedToken,
        classId,
        phone,
        role,
        schoolId,
        name: classNameFromRoute,
      });
      if (result.success) {
        toast.success(result.message ?? labels.success);
        if (role === 'student') {
          setActiveTab('students');
        } else if (role === 'parent') {
          setActiveTab('parents');
        }
      } else {
        toast.error(result.message ?? labels.error);
      }
    } catch {
      toast.error('Ошибка сети. Попробуйте снова');
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <IonPage>

      <IonHeader className="class-members-list__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_CABINET}
              text="Назад"
              className="class-members-list__back"
            />
          </IonButtons>
          <IonTitle className="class-members-list__toolbar-title">Белый список</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="class-members-list">
        <div className="class-members-list__scroll">
          <div className="class-members-list__top">
            <div>
              <h1 className="class-members-list__school">{schoolName}</h1>
              <p className="class-members-list__class">{displayClassName}</p>
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
                {countBadgeLabel}
              </span>
            </div>
          </div>

          <section
            className="class-members-list__card class-members-list__teacher-card"
            aria-labelledby="whitelist-teacher-heading"
          >
            <SectionHead
              id="whitelist-teacher-heading"
              title="Классный руководитель"
              onAction={isClassAdmin ? () => openAddMemberDialog('teacher') : undefined}
              actionLabel={hasTeacher ? 'Изменить' : '+ Добавить'}
              actionDisabled={isAddingMember}
            />
            {hasTeacher ? (
              <div className="class-members-list__teacher-row">
                <img
                  src={teacherImage}
                  alt=""
                  className="class-members-list__teacher-avatar"
                  width={52}
                  height={52}
                />
                <div className="class-members-list__teacher-body">
                  <p className="class-members-list__teacher-name">{teacherDisplayName}</p>
                  <p className="class-members-list__teacher-meta">
                    {teacherPhoneFormatted || 'Телефон не указан'}
                  </p>
                </div>
                {teacherCard.inWhitelist && teacherCard.member ? (
                  <button
                    type="button"
                    className={`class-members-list__status class-members-list__teacher-status${
                      teacherCard.authorized
                        ? ' class-members-list__status--ok'
                        : ' class-members-list__status--pending'
                    }`}
                    onClick={() => {
                      if (classId) {
                        updateMember(classId, teacherCard.member!.id, {
                          authorized: !teacherCard.authorized,
                        });
                      }
                    }}
                  >
                    {teacherCard.authorized ? 'Вошёл в систему' : ''}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="class-members-list__empty class-members-list__empty--compact">
                <IonIcon icon={schoolOutline} aria-hidden /> Учитель не назначен
              </p>
            )}
          </section>

          <IonAlert
            isOpen={addMemberDialog !== null}
            onDidDismiss={() => setAddMemberDialog(null)}
            header={addMemberDialogCopy?.header ?? ''}
            message={addMemberDialogCopy?.message ?? ''}
            inputs={[
              {
                name: 'phone',
                type: 'tel',
                placeholder: '+7 (___) ___-__-__',
              },
            ]}
            buttons={[
              { text: 'Отмена', role: 'cancel' },
              {
                text: addMemberDialogSubmitLabel,
                handler: (data) => {
                  const phone = String(data?.phone ?? '');
                  if (normalizePhoneDigits(phone).length < 11) {
                    toast.warning('Введите полный номер телефона');
                    return false;
                  }
                  if (addMemberDialog) {
                    void submitAddMember(phone, addMemberDialog, hasTeacher);
                  }
                },
              },
            ]}
          />

          <div className="class-members-list__tabs" role="tablist" aria-label="Разделы белого списка">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'students'}
              className={`class-members-list__tab${activeTab === 'students' ? ' class-members-list__tab--active' : ''}`}
              onClick={() => switchTab('students')}
            >
              Ученики ({students.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'parents'}
              className={`class-members-list__tab${activeTab === 'parents' ? ' class-members-list__tab--active' : ''}`}
              onClick={() => switchTab('parents')}
            >
              Родители ({parents.length})
            </button>
          </div>

          {activeTab === 'students' ? (
            <MemberSplitListSection
              headingId="students-list-heading"
              title="Список учеников"
              members={students}
              nameColumnLabel="ФИ ученика"
              nameFieldLabel="ФИО ученика"
              emptyText="В белом списке пока нет учеников"
              editHandlers={editHandlers}
              onAdd={() => openAddMemberDialog('student')}
              addDisabled={isAddingMember}
            />
          ) : (
            <MemberSplitListSection
              headingId="parents-list-heading"
              title="Список родителей"
              members={parents}
              nameColumnLabel="ФИ родителя"
              nameFieldLabel="ФИО родителя"
              emptyText="В белом списке пока нет родителей"
              editHandlers={editHandlers}
              onAdd={() => openAddMemberDialog('parent')}
              addDisabled={isAddingMember}
            />
          )}

          <div className="class-members-list__bottom-spacer" aria-hidden />
        </div>
      </IonContent>

    </IonPage>
  );
};

export default ClassWhitelistPage;

