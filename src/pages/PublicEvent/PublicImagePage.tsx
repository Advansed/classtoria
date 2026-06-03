import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { ChevronLeft, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { imageFullRaw } from '../Classes/components/classViewUtils';
import { guessImageFilename, saveImageWithDialog } from '../Classes/components/imageDownload';
import { useClassImageSrc } from '../Classes/components/useClassImageSrc';
import '../Classes/components/ImageViewPage.css';
import { publicCollectionPath, publicEventPath } from '../Classes/routes';
import {
  findPublicCollection,
  findPublicImage,
  usePublicEvent,
} from './usePublicEvent';

const PublicImagePage: React.FC = () => {
  const history = useHistory();
  const toast = useToast();
  const { eventId: eventIdParam, collectionId: collectionIdParam, imageId: imageIdParam } =
    useParams<{ eventId: string; collectionId: string; imageId: string }>();
  const eventId = eventIdParam?.trim() ?? '';
  const collectionId = collectionIdParam?.trim() ?? '';
  const imageId = imageIdParam?.trim() ?? '';
  const { loading, error, event } = usePublicEvent(eventId);
  const [downloading, setDownloading] = useState(false);

  const collection = useMemo(
    () => findPublicCollection(event, collectionId),
    [event, collectionId],
  );
  const image = useMemo(
    () => findPublicImage(collection, imageId),
    [collection, imageId],
  );

  const photoSrc = useClassImageSrc(null, image ? imageFullRaw(image) : '');

  const handleBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push(
      publicCollectionPath(eventId, collectionId) ||
        publicEventPath(eventId) ||
        '/start',
    );
  };

  const handleDownload = async () => {
    if (!photoSrc || downloading) {
      return;
    }
    setDownloading(true);
    try {
      const filename = guessImageFilename(
        image?.imageId?.trim() || imageId,
        image ? imageFullRaw(image) : undefined,
      );
      const result = await saveImageWithDialog(photoSrc, filename);
      if (result === 'saved') {
        toast.success('Фото сохранено');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить фото';
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <IonPage className="image-view">
      <IonContent fullscreen className="image-view__content">
        <div className="image-view__wrap">
          {loading ? (
            <div className="image-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && (error || !image) ? (
            <p className="image-view__error" role="alert">
              {error || 'Фотография не найдена.'}
            </p>
          ) : null}

          {image ? (
            <>
              <div className="image-view__stage">
                <img src={photoSrc} alt="" className="image-view__photo" />
              </div>

              <div className="image-view__topbar">
                <button
                  type="button"
                  className="image-view__icon-btn"
                  onClick={handleBack}
                  aria-label="Назад"
                >
                  <ChevronLeft size={28} strokeWidth={2} aria-hidden />
                </button>
              </div>

              <div className="image-view__bottom">
                <div className="image-view__actions">
                  <button
                    type="button"
                    className="image-view__action-btn image-view__action-btn--download"
                    onClick={() => void handleDownload()}
                    disabled={downloading || !photoSrc}
                    aria-label="Сохранить"
                  >
                    <Download size={24} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicImagePage;
