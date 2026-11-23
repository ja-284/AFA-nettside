/** Laster Cloudflare Turnstile ved behov og gir et enkelt grensesnitt for token. */
interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  getResponse(id: string): string | undefined;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile-missing')));
    s.onerror = () => {
      loading = null;
      reject(new Error('turnstile-load-failed'));
    };
    document.head.append(s);
  });
  return loading;
}

export interface Widget {
  /** Venter på token (maks `timeout` ms). */
  token(timeout?: number): Promise<string | null>;
  reset(): void;
}

export async function mountTurnstile(el: HTMLElement, sitekey: string, onError?: () => void): Promise<Widget | null> {
  let api: TurnstileApi;
  try {
    api = await loadTurnstile();
  } catch {
    onError?.();
    return null;
  }
  let current: string | null = null;
  const id = api.render(el, {
    sitekey,
    theme: 'light',
    language: 'nb',
    size: 'flexible',
    appearance: 'interaction-only',
    callback: (t: string) => {
      current = t;
    },
    'expired-callback': () => {
      current = null;
    },
    'error-callback': () => {
      current = null;
      onError?.();
    },
  });
  return {
    async token(timeout = 10000) {
      const start = Date.now();
      while (!current && Date.now() - start < timeout) {
        current = api.getResponse(id) || null;
        if (!current) await new Promise((r) => setTimeout(r, 200));
      }
      return current;
    },
    reset() {
      current = null;
      api.reset(id);
    },
  };
}
