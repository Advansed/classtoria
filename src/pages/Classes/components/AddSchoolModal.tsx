import { IonSpinner } from '@ionic/react';
import { useEffect, useState } from 'react';
import type { DaDataAddressSuggestion } from 'react-dadata';
import { getDadataToken } from '../../../config/dadata';
import SchoolLocationField from './SchoolLocationField';
import {
  buildSchoolPlaceSuggestionFromStored,
  resolveSchoolPlaceFromDadata,
} from './schoolLocationUtils';

type AddSchoolModalProps = {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string, region: string, location: string) => void;
  title?: string;
  submitLabel?: string;
  initialName?: string;
  initialRegion?: string;
  initialLocation?: string;
};

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({
  open,
  submitting,
  onClose,
  onSubmit,
  title = 'Новая школа',
  submitLabel = 'Добавить',
  initialName = '',
  initialRegion = '',
  initialLocation = '',
}) => {
  const dadataToken = getDadataToken();
  const [name, setName] = useState('');
  const [locationSuggestion, setLocationSuggestion] = useState<DaDataAddressSuggestion | undefined>();
  const [locationManual, setLocationManual] = useState('');
  const [regionManual, setRegionManual] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initialName);
    setLocationSuggestion(
      dadataToken
        ? buildSchoolPlaceSuggestionFromStored(initialRegion, initialLocation)
        : undefined,
    );
    setLocationManual(initialLocation);
    setRegionManual(initialRegion);
  }, [open, initialName, initialLocation, initialRegion, dadataToken]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (dadataToken) {
      const { location, region } = resolveSchoolPlaceFromDadata(locationSuggestion);
      onSubmit(trimmedName, region, location);
      return;
    }
    onSubmit(trimmedName, regionManual.trim(), locationManual.trim());
  };

  return (
    <div className="classes-schools__modal" role="dialog" aria-modal="true" aria-labelledby="add-school-title">
      <button
        type="button"
        className="classes-schools__modal-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="classes-schools__modal-card">
        <h2 id="add-school-title" className="classes-schools__modal-title">
          {title}
        </h2>

        <div className="classes-schools__form-field">
          <label htmlFor="add-school-name" className="classes-schools__form-label">
            Название школы
          </label>
          <input
            id="add-school-name"
            type="text"
            className="classes-schools__form-input"
            placeholder="Например, СОШ №17"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="organization"
          />
        </div>

        {dadataToken ? (
          <SchoolLocationField
            id="add-school-location"
            label="Населённый пункт"
            placeholder="Начните вводить город или посёлок"
            token={dadataToken}
            value={locationSuggestion}
            defaultQuery={
              locationSuggestion?.value ??
              [initialRegion.trim(), initialLocation.trim()].filter(Boolean).join(', ')
            }
            onChange={setLocationSuggestion}
          />
        ) : (
          <>
            <div className="classes-schools__form-field">
              <label htmlFor="add-school-region-manual" className="classes-schools__form-label">
                Регион
              </label>
              <input
                id="add-school-region-manual"
                type="text"
                className="classes-schools__form-input"
                placeholder="Например, Приморский край"
                value={regionManual}
                onChange={(e) => setRegionManual(e.target.value)}
              />
            </div>
            <div className="classes-schools__form-field">
              <label htmlFor="add-school-location-manual" className="classes-schools__form-label">
                Населённый пункт
              </label>
              <input
                id="add-school-location-manual"
                type="text"
                className="classes-schools__form-input"
                placeholder="Город или посёлок"
                value={locationManual}
                onChange={(e) => setLocationManual(e.target.value)}
              />
              <p className="classes-schools__form-hint">
                Подсказки DaData недоступны — укажите регион и населённый пункт вручную.
              </p>
            </div>
          </>
        )}

        <div className="classes-schools__modal-actions">
          <button
            type="button"
            className="classes-schools__modal-btn classes-schools__modal-btn--ghost"
            disabled={submitting}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="classes-schools__modal-btn classes-schools__modal-btn--primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? <IonSpinner name="crescent" /> : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSchoolModal;
