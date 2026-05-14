import { useIonToast } from '@ionic/react';

type ToastColor = 'success' | 'warning' | 'danger' | 'primary' | 'dark';

export const useToast = () => {
  const [present] = useIonToast();

  const show = (message: string, color: ToastColor = 'dark') => {
    present({
      message,
      duration: 2200,
      position: 'top',
      color,
    });
  };

  return {
    show,
    success: (message: string) => show(message, 'success'),
    warning: (message: string) => show(message, 'warning'),
    error: (message: string) => show(message, 'danger'),
  };
};
