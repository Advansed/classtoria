import { useStore } from '../../Store';
import AddChildPage from './components/AddChildPage';
import MyChildrenPage from './components/MyChildrenPage';

/**
 * Главная вкладка: список детей приходит только с авторизацией (`childrens` в login).
 */
const PersonalHomeTab: React.FC = () => {
  const childrens = useStore((s) => s.childrens);

  if (childrens.length === 0) {
    return <AddChildPage mode="home" />;
  }

  return <MyChildrenPage />;
};

export default PersonalHomeTab;
