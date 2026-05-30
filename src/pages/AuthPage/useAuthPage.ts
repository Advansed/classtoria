import { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { post, type ApiResponse } from '../../api';
import {
  clearAuthCookies,
  normalizePhoneDigits,
  readLastPhoneDisplay,
  readStoredAuth,
  saveLastPhoneDisplay,
  savePasswordHashCookies,
  setLoggedInCookie,
} from '../../authCookies';
import { useToast } from '../../hooks/useToast';
import { parseChildrenFromApi } from '../PersonalPage/childrenUtils';
import { useStore, type AuthUser } from '../../Store';
import {
  socketAcquire,
  socketRelease,
  socketSend,
  socketSubscribeMessage,
  waitForSocketOpen,
} from '../../socketStore';

type Transport = 'max' | 'telegram' | 'sms';

const readAuthUser = (raw: ApiResponse<unknown>['user']): Partial<AuthUser> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    image: typeof raw.image === 'string' ? raw.image : '',
    role: typeof raw.role === 'string' ? raw.role : '',
  };
};

const applyLoginToStore = (res: ApiResponse<unknown>) => {
  const token =
    typeof res.token === 'string' && res.token.trim().length > 0 ? res.token.trim() : null;
  if (!token) {
    return;
  }

  const childrens = parseChildrenFromApi(res);

  useStore.getState().applyLogin(
    {
      token,
      user_id: res.user_id ?? '',
      user: readAuthUser(res.user),
    },
    childrens,
  );
};

/** Бот MAX для подтверждения входа (handle @id143502923920_bot). */
export const MAX_BOT_ID = 'id143502923920_bot';
export const MAX_BOT_URL = `https://max.ru/${MAX_BOT_ID}`;

type CheckSmsResponseData =
  | { passwordhash?: string; passwordHash?: string }
  | string
  | null;

const readPasswordHashField = (
  envelope: ApiResponse<CheckSmsResponseData> | CheckSmsResponseData | Record<string, unknown>,
): string => {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return '';
  }
  const raw = envelope as Record<string, unknown>;
  const lower = raw.passwordhash;
  const camel = raw.passwordHash;
  if (typeof lower === 'string' && lower.trim().length > 0) {
    return lower.trim();
  }
  if (typeof camel === 'string' && camel.trim().length > 0) {
    return camel.trim();
  }
  return '';
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) {
    return '';
  }

  let normalized = digits;
  if (normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`;
  }
  if (!normalized.startsWith('7')) {
    normalized = `7${normalized.slice(0, 10)}`;
  }

  const country = '+7';
  const part1 = normalized.slice(1, 4);
  const part2 = normalized.slice(4, 7);
  const part3 = normalized.slice(7, 9);
  const part4 = normalized.slice(9, 11);

  if (normalized.length <= 1) {
    return country;
  }
  if (normalized.length <= 4) {
    return `${country} (${part1}`;
  }
  if (normalized.length <= 7) {
    return `${country} (${part1}) ${part2}`;
  }
  if (normalized.length <= 9) {
    return `${country} (${part1}) ${part2}-${part3}`;
  }

  return `${country} (${part1}) ${part2}-${part3}-${part4}`;
};

const passwordHashFromCheckSms = (response: ApiResponse<CheckSmsResponseData>): string => {
  const fromEnvelope = readPasswordHashField(response);
  if (fromEnvelope) {
    return fromEnvelope;
  }
  const d = response.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const fromData = readPasswordHashField(d as Record<string, unknown>);
    if (fromData) {
      return fromData;
    }
  }
  return '';
};

const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
};

const authCodeFromObject = (o: Record<string, unknown>): string => {
  const a = o.auth_code;
  if (typeof a === 'string' && a.trim()) {
    return a.trim();
  }
  const camel = o.authCode;
  if (typeof camel === 'string' && camel.trim()) {
    return camel.trim();
  }
  const d = o.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return authCodeFromObject(d as Record<string, unknown>);
  }
  return '';
};

const tryGetAuthMaxPayload = (
  root: Record<string, unknown>,
): Record<string, unknown> | null => {
  const t = root.type;
  const e = root.event;
  if (t === 'auth_max' || e === 'auth_max') {
    return root;
  }
  const nested = root.auth_max;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return null;
};

/** Сообщение в окно-заглушку: открыть MAX (только https://max.ru/…). */
const MAX_PLACEHOLDER_MSG = 'classtoria-max-open' as const;

const buildMaxPlaceholderDocument = (): string => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Класстория — MAX</title><style>body{font-family:system-ui,sans-serif;padding:2rem;text-align:center;color:#1a1a1a;background:#fafafa;margin:0}p{margin:.5rem 0}</style></head><body>
<p>Запрашиваем вход в MAX…</p>
<p style="font-size:14px;color:#666">Сейчас откроется чат с ботом.</p>
<script>(function(){
var T=${JSON.stringify(MAX_PLACEHOLDER_MSG)};
function go(u){try{window.location.replace(u);}catch(e){window.location.href=u;}}
window.addEventListener('message',function(ev){
var d=ev&&ev.data;
if(!d||d.type!==T)return;
if(typeof d.url==='string'&&d.url.indexOf('https://max.ru/')===0)go(d.url);
});
})();</script></body></html>`;

/** Окно открыто по клику; внутри — слушатель postMessage, чтобы потом сделать переход из этого окна (иначе часто остаётся blank и не открывается MAX). */
const openMaxPlaceholderWindow = (): Window | null => {
  const w = window.open('', '_blank');
  if (!w) {
    return null;
  }
  try {
    const doc = w.document;
    doc.open();
    doc.write(buildMaxPlaceholderDocument());
    doc.close();
  } catch {
    try {
      w.close();
    } catch {
      /* noop */
    }
    return null;
  }
  return w;
};

const buildMaxBotDeepLink = (authCode: string): string => {
  const raw = authCode.trim();
  /* Документация MAX: https://max.ru/<ник>?start=<payload>, payload ≤ 128 символов → боту в bot_started.payload */
  const payload =
    raw.length > 128 ? raw.slice(0, 128) : raw;
  const u = new URL(MAX_BOT_URL);
  u.searchParams.set('start', payload);
  return u.toString();
};

/** Сообщение WebSocket: emit reg_max({ phone }) — phone в цифрах (напр. 79001234567). */
const buildRegMaxPayload = (phoneDigits: string): string =>
  JSON.stringify({ type: 'reg_max', phone: phoneDigits });

export const useAuthPage = () => {
  const toast = useToast();
  const history = useHistory();
  const [phone, setPhone] = useState(() => {
    const saved = readLastPhoneDisplay().trim();
    return saved ? formatPhone(saved) : '';
  });
  const [sms, setSms] = useState('');
  const [transport, setTransport] = useState<Transport | ''>('');
  const [smsFlow, setSmsFlow] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [transportError, setTransportError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(() => readStoredAuth() !== null);

  const refreshStoredPassword = useCallback(() => {
    setHasStoredPassword(readStoredAuth() !== null);
  }, []);

  const handlePhoneChange = (value: string) => {
    const next = formatPhone(value);
    setPhone(next);
    saveLastPhoneDisplay(next);
    setPhoneError('');
  };

  const handleSmsChange = (value: string) => {
    setSms(value.replace(/\D/g, '').slice(0, 6));
  };

  const selectSmsFlow = () => {
    setSmsFlow(true);
    setSms('');
    setTransport('sms');
    setTransportError('');
  };

  const selectAuthorizeFlow = () => {
    setSmsFlow(false);
    setTransport('');
    setTransportError('');
    setSms('');
  };

  const handleAuthorizeViaMax = async () => {
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      toast.warning('Введите номер телефона');
      return;
    }

    const phoneDigits = normalizePhoneDigits(phone);
    if (!phoneDigits || phoneDigits.length < 11) {
      setPhoneError('Введите полный номер телефона');
      toast.warning('Введите полный номер телефона');
      return;
    }

    setPhoneError('');
    setIsSending(true);
    const maxTab = openMaxPlaceholderWindow();
    if (!maxTab) {
      toast.warning('Разрешите всплывающие окна или откройте ссылку из уведомления после получения кода');
    }
    socketAcquire();
    const maxWait = {
      unsub: null as (() => void) | null,
      timer: undefined as number | undefined,
    };
    let botOpened = false;

    const closePlaceholderTab = () => {
      if (maxTab && !maxTab.closed && !botOpened) {
        maxTab.close();
      }
    };

    const openMaxBotWithCode = (code: string) => {
      const url = buildMaxBotDeepLink(code);
      if (!url.startsWith('https://max.ru/')) {
        return;
      }
      botOpened = true;
      const tryPostMessage = (): boolean => {
        if (!maxTab || maxTab.closed) {
          return false;
        }
        try {
          maxTab.postMessage({ type: MAX_PLACEHOLDER_MSG, url }, '*');
          return true;
        } catch {
          return false;
        }
      };
      const fallbackOpen = () => {
        const w = window.open(url, '_blank', 'noopener,noreferrer');
        if (!w || w.closed) {
          toast.warning(
            'Не удалось открыть MAX. Разрешите всплывающие окна для этого сайта и повторите вход.',
          );
        }
      };
      /* Следующий тик: слушатель в заглушке уже установлен; переход из окна-заглушки, а не из родителя — иначе часто blank. */
      window.queueMicrotask(() => {
        if (tryPostMessage()) {
          return;
        }
        window.setTimeout(() => {
          if (tryPostMessage()) {
            return;
          }
          fallbackOpen();
        }, 50);
      });
      toast.success('Откройте MAX — должен запуститься чат с ботом; завершите вход в «Класстория»');
    };

    try {
      await waitForSocketOpen(15_000);

      const { passwordHash } = await new Promise<{
        passwordHash: string;
      }>((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          if (maxWait.timer !== undefined) {
            window.clearTimeout(maxWait.timer);
            maxWait.timer = undefined;
          }
          maxWait.unsub?.();
          maxWait.unsub = null;
        };

        maxWait.timer = window.setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          closePlaceholderTab();
          reject(new Error('Таймаут ожидания подтверждения в MAX'));
        }, 120_000);

        maxWait.unsub = socketSubscribeMessage((raw) => {
          if (settled) {
            return;
          }
          const o = parseJsonObject(raw);
          if (!o) {
            return;
          }

          const code = authCodeFromObject(o);
          if (code && !botOpened) {
            openMaxBotWithCode(code);
          }

          const authMax = tryGetAuthMaxPayload(o);
          if (!authMax) {
            return;
          }

          if (authMax.success !== true) {
            const msg =
              typeof authMax.message === 'string' && authMax.message.trim()
                ? authMax.message.trim()
                : 'Подтверждение в MAX не удалось';
            settled = true;
            cleanup();
            closePlaceholderTab();
            reject(new Error(msg));
            return;
          }

          const hash = readPasswordHashField(authMax);
          if (!hash) {
            settled = true;
            cleanup();
            closePlaceholderTab();
            reject(new Error('Сервер не вернул passwordHash'));
            return;
          }

          settled = true;
          cleanup();
          resolve({ passwordHash: hash });
        });

        socketSend(buildRegMaxPayload(phoneDigits));
      });

      savePasswordHashCookies(phone, passwordHash);
      refreshStoredPassword();

      const loginResponse = await post('login', {
        phone,
        password: passwordHash,
      });

      console.log('loginResponse', loginResponse);

      if (!loginResponse.success) {
        toast.error(loginResponse.message ?? 'Не удалось авторизоваться');
        return;
      }

      toast.success(loginResponse.message ?? 'Успешный вход');
      setLoggedInCookie();
      applyLoginToStore(loginResponse);
      history.replace('/personal/home');
    } catch (err) {
      closePlaceholderTab();
      const message =
        err instanceof Error ? err.message : 'Ошибка сети. Попробуйте снова';
      toast.error(message);
    } finally {
      if (maxWait.timer !== undefined) {
        window.clearTimeout(maxWait.timer);
      }
      maxWait.unsub?.();
      maxWait.unsub = null;
      socketRelease();
      setIsSending(false);
    }
  };

  /** Вход по ключу из cookies; при неудаче — false (дальше сценарий MAX). */
  const tryLoginWithStoredKey = async (): Promise<boolean> => {
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      toast.warning('Введите номер телефона');
      return false;
    }

    const stored = readStoredAuth();
    if (!stored) {
      return false;
    }

    const currentDigits = normalizePhoneDigits(phone);
    if (!currentDigits || currentDigits.length < 11) {
      setPhoneError('Введите полный номер телефона');
      toast.warning('Введите полный номер телефона');
      return false;
    }

    if (currentDigits !== stored.phoneDigits) {
      clearAuthCookies();
      refreshStoredPassword();
      return false;
    }

    setPhoneError('');
    try {
      const response = await post('login', {
        phone,
        password: stored.passwordHash,
      });
      
      console.log('response', response);

      if (!response.success) {
        clearAuthCookies();
        refreshStoredPassword();
        return false;
      }

      toast.success(response.message ?? 'Успешный вход');
      setLoggedInCookie();
      applyLoginToStore(response);
      history.replace('/personal/home');
      return true;
    } catch {
      toast.error('Ошибка сети. Попробуйте снова');
      return false;
    }
  };

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      toast.warning('Введите номер телефона');
      return;
    }

    if (!transport) {
      setTransportError('Выберите способ получения кода');
      toast.warning('Выберите способ получения кода');
      return;
    }

    setPhoneError('');
    setTransportError('');
    setIsSending(true);

    try {
      const response = await post('phone', {
        phone,
        transport,
      });

      if (!response.success) {
        toast.error(response.message ?? 'Не удалось отправить код');
        return;
      }

      toast.success(response.message ?? 'Код отправлен');
    } catch {
      toast.error('Ошибка сети. Попробуйте снова');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifySms = async () => {
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      toast.warning('Введите номер телефона');
      return;
    }
    if (!transport) {
      setTransportError('Выберите способ получения кода');
      toast.warning('Выберите способ получения кода');
      return;
    }
    if (!sms.trim()) {
      toast.warning('Введите код из сообщения');
      return;
    }

    setIsSending(true);
    try {
      const response = await post<CheckSmsResponseData>('check_sms', {
        phone,
        transport,
        sms,
      });

      if (!response.success) {
        toast.error(response.message ?? 'Код не прошёл проверку');
        return;
      }

      const passwordHash = passwordHashFromCheckSms(response);
      if (!passwordHash) {
        toast.error('Сервер не вернул passwordHash');
        return;
      }

      savePasswordHashCookies(phone, passwordHash);
      refreshStoredPassword();
      toast.success(response.message ?? 'Номер подтверждён, ключ сохранён на этом устройстве');
      selectAuthorizeFlow();
    } catch {
      toast.error('Ошибка сети. Попробуйте снова');
    } finally {
      setIsSending(false);
    }
  };

  const primaryButtonLabel = smsFlow ? 'Проверить код' : 'Войти';

  const smsHintText =
    'Получите код по SMS. Регистрация и восстановление проходят одинаково.';

  const pageTitle = smsFlow ? 'Подтверждение номера' : 'Авторизация';

  const handlePrimaryAction = async () => {
    if (smsFlow) {
      await handleVerifySms();
      return;
    }

    if (hasStoredPassword) {
      setIsSending(true);
      try {
        const loggedIn = await tryLoginWithStoredKey();
        if (loggedIn) {
          return;
        }
      } finally {
        setIsSending(false);
      }
    }

    await handleAuthorizeViaMax();
  };

  return {
    phone,
    sms,
    smsFlow,
    hasStoredPassword,
    transport,
    phoneError,
    transportError,
    isSending,
    primaryButtonLabel,
    smsHintText,
    pageTitle,
    handlePhoneChange,
    handleSmsChange,
    selectSmsFlow,
    selectAuthorizeFlow,
    handleSendCode,
    handlePrimaryAction,
  };
};
