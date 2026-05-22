export const DESCRIPTION_MAX = 500;

export const DESCRIPTION_PLACEHOLDERS: Record<string, string> = {
  'Открытый урок':
    'Поделитесь своими впечатлениями об открытом уроке. Что было интересного, чему научились, какие моменты запомнились больше всего?',
  'Линейка':
    'Расскажите о торжественной линейке: атмосфера, выступления, эмоции детей.',
  'Экскурсия':
    'Опишите экскурсию: куда ездили, что понравилось, что запомнилось.',
  'День знаний':
    'Поделитесь впечатлениями о празднике Дня знаний.',
  'Спортивный день':
    'Расскажите о спортивных соревнованиях и достижениях класса.',
  'Праздник':
    'Опишите праздник: программа, участие детей, яркие моменты.',
};

export const defaultDescriptionPlaceholder =
  'Опишите событие: что происходило, чему научились, что запомнилось.';

const DISPLAY_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Приводит дату события к формату дд.мм.гггг для отображения. */
export const normalizeEventDate = (raw: unknown): string => {
  if (raw == null) {
    return '';
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return '';
  }

  const display = trimmed.match(DISPLAY_DATE_RE);
  if (display) {
    return `${display[1].padStart(2, '0')}.${display[2].padStart(2, '0')}.${display[3]}`;
  }

  const iso = trimmed.match(ISO_DATE_RE);
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }

  const num = Number(trimmed);
  if (Number.isFinite(num) && num > 0) {
    const ms = num > 1e12 ? num : num * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}.${month}.${d.getFullYear()}`;
    }
  }

  return trimmed;
};

/** dd.mm.yyyy → yyyy-mm-dd для input[type=date] */
export const toInputDate = (display: string): string => {
  const normalized = normalizeEventDate(display);
  const m = normalized.match(DISPLAY_DATE_RE);
  if (!m) {
    return '';
  }
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  return `${m[3]}-${month}-${day}`;
};

/** yyyy-mm-dd → dd.mm.yyyy для API */
export const toDisplayDate = (iso: string): string => normalizeEventDate(iso);

export const todayInputDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const eventSelectValue = (index: number): string => `existing:${index}`;

export const parseEventSelectValue = (key: string, eventsLength: number): number | null => {
  if (!key.startsWith('existing:')) {
    return null;
  }
  const index = Number.parseInt(key.slice('existing:'.length), 10);
  if (!Number.isFinite(index) || index < 0 || index >= eventsLength) {
    return null;
  }
  return index;
};

export const descriptionPlaceholderForTitle = (title: string): string =>
  DESCRIPTION_PLACEHOLDERS[title] ?? defaultDescriptionPlaceholder;
