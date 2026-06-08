import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  collectionMediaItems,
  imageThumbRaw,
} from '../Classes/components/classViewUtils';
import CollectionMediaModal from '../Classes/components/CollectionMediaModal';
import '../Classes/components/ImageViewPage.css';
import { publicCollectionPath, publicEventPath } from '../Classes/routes';
import {
  findPublicCollection,
  findPublicImage,
  usePublicEvent,
} from './usePublicEvent';

const PublicImagePage: React.FC = () => {
  const history = useHistory();
  const { eventId: eventIdParam, collectionId: collectionIdParam, imageId: imageIdParam } =
    useParams<{ eventId: string; collectionId: string; imageId: string }>();
  const eventId = eventIdParam?.trim() ?? '';
  const collectionId = collectionIdParam?.trim() ?? '';
  const imageId = imageIdParam?.trim() ?? '';
  const { loading, error, event } = usePublicEvent(eventId);

  const collection = useMemo(
    () => findPublicCollection(event, collectionId),
    [event, collectionId],
  );
  const mediaItems = useMemo(
    () => collectionMediaItems(collection).filter((img) => imageThumbRaw(img)),
    [collection],
  );
  const image = useMemo(
    () => findPublicImage(collection, imageId),
    [collection, imageId],
  );

  const viewerIndex = useMemo(() => {
    if (!image || mediaItems.length === 0) {
      return -1;
    }
    const byId = mediaItems.findIndex(
      (item) => item.imageId === imageId || item === image,
    );
    if (byId >= 0) {
      return byId;
    }
    if (imageId.startsWith('idx-')) {
      const index = Number(imageId.slice(4));
      if (Number.isFinite(index) && index >= 0 && index < mediaItems.length) {
        return index;
      }
    }
    return 0;
  }, [image, imageId, mediaItems]);

  const handleClose = () => {
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

  const handleIndexChange = (nextIndex: number) => {
    const nextImage = mediaItems[nextIndex];
    if (!nextImage) {
      return;
    }
    const nextImageId =
      nextImage.imageId?.trim() || `idx-${nextIndex}`;
    history.replace(`/event/${eventId}/collection/${collectionId}/photo/${nextImageId}`);
  };

  return (
    <IonPage className="image-view">
      <IonContent fullscreen className="image-view__content">
        {loading ? (
          <div className="image-view__loading" role="status">
            <IonSpinner name="crescent" />
            <p>Загрузка…</p>
          </div>
        ) : null}

        {!loading && (error || !image) ? (
          <p className="image-view__error" role="alert">
            {error || 'Материал не найден.'}
          </p>
        ) : null}
      </IonContent>

      <CollectionMediaModal
        open={!loading && !error && viewerIndex >= 0}
        items={mediaItems}
        index={Math.max(viewerIndex, 0)}
        token={null}
        onClose={handleClose}
        onIndexChange={handleIndexChange}
      />
    </IonPage>
  );
};

export default PublicImagePage;
