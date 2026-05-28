import { FioSuggestions, type DaDataFioSuggestion } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';

type AddChildFioFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  token: string;
  filterParts?: ('SURNAME' | 'NAME' | 'PATRONYMIC')[];
  value?: DaDataFioSuggestion;
  onChange: (suggestion?: DaDataFioSuggestion) => void;
};

const AddChildFioField: React.FC<AddChildFioFieldProps> = ({
  id,
  label,
  placeholder,
  token,
  filterParts,
  value,
  onChange,
}) => (
  <div className="add-child__group">
    <label htmlFor={id} className="add-child__lbl">
      {label}
    </label>
    <div className="add-child__box add-child__box--dadata">
      <FioSuggestions
        token={token}
        value={value}
        onChange={onChange}
        {...(filterParts ? { filterParts } : {})}
        delay={300}
        minChars={2}
        count={7}
        containerClassName="add-child__dadata"
        suggestionsClassName="add-child__dadata-suggestions"
        suggestionClassName="add-child__dadata-suggestion"
        currentSuggestionClassName="add-child__dadata-suggestion--current"
        inputProps={{
          id,
          placeholder,
          className: 'react-dadata__input add-child__dadata-input',
          autoComplete: 'name',
        }}
      />
    </div>
  </div>
);

export default AddChildFioField;
