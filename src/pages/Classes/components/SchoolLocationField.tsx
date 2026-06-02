import { AddressSuggestions, type DaDataAddressSuggestion } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';

type SchoolLocationFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  token: string;
  value?: DaDataAddressSuggestion;
  onChange: (suggestion?: DaDataAddressSuggestion) => void;
};

const SchoolLocationField: React.FC<SchoolLocationFieldProps> = ({
  id,
  label,
  placeholder,
  token,
  value,
  onChange,
}) => (
  <div className="classes-schools__form-field">
    <label htmlFor={id} className="classes-schools__form-label">
      {label}
    </label>
    <div className="classes-schools__dadata-box">
      <AddressSuggestions
        token={token}
        value={value}
        onChange={onChange}
        delay={300}
        minChars={2}
        count={7}
        filterFromBound="city"
        filterToBound="settlement"
        containerClassName="classes-schools__dadata"
        suggestionsClassName="classes-schools__dadata-suggestions"
        suggestionClassName="classes-schools__dadata-suggestion"
        currentSuggestionClassName="classes-schools__dadata-suggestion--current"
        inputProps={{
          id,
          placeholder,
          className: 'react-dadata__input classes-schools__dadata-input',
          autoComplete: 'off',
        }}
      />
    </div>
  </div>
);

export default SchoolLocationField;
