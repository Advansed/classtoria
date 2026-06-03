import type { DaDataAddress, DaDataAddressSuggestion } from 'react-dadata';

export type SchoolPlaceFromDadata = {
  location: string;
  region: string;
};

const schoolPlaceDisplayValue = (region: string, location: string): string =>
  [region, location].filter(Boolean).join(', ');

/** Подсказка DaData из сохранённых `region` и `location` (для редактирования школы). */
export const buildSchoolPlaceSuggestionFromStored = (
  region: string,
  location: string,
): DaDataAddressSuggestion | undefined => {
  const trimmedRegion = region.trim();
  const trimmedLocation = location.trim();
  if (!trimmedRegion && !trimmedLocation) {
    return undefined;
  }

  const value = schoolPlaceDisplayValue(trimmedRegion, trimmedLocation);

  return {
    value,
    unrestricted_value: value,
    data: {
      region: trimmedRegion,
      region_with_type: trimmedRegion,
      city_with_type: trimmedLocation,
      settlement_with_type: trimmedLocation,
    } as DaDataAddress,
  };
};

/** Населённый пункт и регион из подсказки DaData для `add_school`. */
export const resolveSchoolPlaceFromDadata = (
  suggestion?: DaDataAddressSuggestion,
): SchoolPlaceFromDadata => {
  if (!suggestion) {
    return { location: '', region: '' };
  }
  const data = suggestion.data;
  const location =
    data.settlement_with_type?.trim() ||
    data.city_with_type?.trim() ||
    data.area_with_type?.trim() ||
    suggestion.value.trim();
  const region =
    data.region_with_type?.trim() ||
    data.region?.trim() ||
  '';
  return { location, region };
};
