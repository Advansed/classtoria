import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';
import {
  callOutline,
  checkmarkCircle,
  chevronBackOutline,
  chevronForwardOutline,
  peopleOutline,
  personOutline,
  ribbonOutline,
  schoolOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { clearAuthCookies, readStoredAuth } from '../../../authCookies';
import { useStore } from '../../../Store';
import './ProfileTab.css';

const AVATAR = '/images/auth-feature.png';

type RoleId = 'parent' | 'teacher' | 'student';

const formatPhoneFromDigits = (digits: string): string => {
  const d = digits.replace(/\D/g, '');
  if (d.length < 11) {
    return digits || '—';
  }
  const rest = d.startsWith('7') ? d.slice(1) : d;
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 8);
  const e = rest.slice(8, 10);
  return `+7 (${a}) ${b}-${c}-${e}`;
};

/** Вкладка «Профиль» внутри PersonalPage. Корень — IonPage (требование IonTabs для корректного стека). */
const ProfileTab: React.FC = () => {
  const history = useHistory();
  const [activeRole, setActiveRole] = useState<RoleId>('parent');

  const phoneDisplay = useMemo(() => {
    const s = readStoredAuth();
    return s ? formatPhoneFromDigits(s.phoneDigits) : '+7 (999) 123-45-67';
  }, []);

  const handleLogout = () => {
    clearAuthCookies();
    useStore.getState().reset();
    history.replace('/start');
  };

  const roleLabel: Record<RoleId, string> = {
    parent: 'Родитель',
    teacher: 'Учитель',
    student: 'Ученик',
  };

  const rolePillIcon =
    activeRole === 'parent' ? peopleOutline : activeRole === 'teacher' ? schoolOutline : personOutline;

  console.log('ProfileTab');

  const render = () => (
    <IonPage>
      <IonContent>
        
        <div>
          <h1>ProfileTab</h1>
        </div>

      </IonContent>
    </IonPage>
  );

  console.log()

  return render();
};

export default ProfileTab;
