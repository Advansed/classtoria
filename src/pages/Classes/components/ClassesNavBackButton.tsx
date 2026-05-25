import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { chevronBack } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

type ClassesNavBackButtonProps = {
  fallbackHref: string;
  fallbackState?: object;
  text?: string;
  className?: string;
};

/**
 * «Назад» с сохранением history.state: сначала goBack(), иначе push с fallbackState.
 */
const ClassesNavBackButton: React.FC<ClassesNavBackButtonProps> = ({
  fallbackHref,
  fallbackState,
  text = 'Назад',
  className,
}) => {
  const history = useHistory();

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }

    if (fallbackState) {
      history.push(fallbackHref, fallbackState);
      return;
    }

    history.push(fallbackHref);
  };

  return (
    <IonButtons slot="start">
      <IonButton fill="clear" className={className} onClick={handleBack}>
        <IonIcon slot="start" icon={chevronBack} aria-hidden />
        {text}
      </IonButton>
    </IonButtons>
  );
};

export default ClassesNavBackButton;
