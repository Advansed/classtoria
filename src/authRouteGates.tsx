import type { ReactNode } from 'react';
import { Redirect } from 'react-router-dom';
import { useStore } from './Store';

type Props = {
  children: ReactNode;
};

/** С корня всегда на стартовую страницу (без автоматического входа в ЛК). */
export function RootRedirect(): ReactNode {
  return <Redirect to="/start" />;
}

/** Личный кабинет только после явной авторизации (auth в сторе); иначе — старт. */
export function PrivateRoute({ children }: Props): ReactNode {
  const auth = useStore((s) => s.auth);
  if (!auth) {
    return <Redirect to="/start" />;
  }
  return <>{children}</>;
}
