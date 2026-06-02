import type { DaDataAddressSuggestion } from 'react-dadata';

export type SchoolPlaceFromDadata = {
  location: string;
  region: string;
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
