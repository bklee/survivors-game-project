import { STRINGS, StringKey } from './strings';

export type Lang = 'ko' | 'en';

const STORAGE_KEY = 'survivors_lang';

function detectInitialLang(): Lang {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === 'ko' || saved === 'en') return saved;
    // 브라우저 언어가 한국어면 ko, 그 외 모두 en
    const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
    return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export class I18n {
    private static lang: Lang = detectInitialLang();
    private static listeners: Set<() => void> = new Set();

    static getLang(): Lang {
        return this.lang;
    }

    static setLang(lang: Lang): void {
        if (this.lang === lang) return;
        this.lang = lang;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            /* private mode 등 — 무시 */
        }
        this.listeners.forEach((fn) => fn());
    }

    static toggle(): Lang {
        this.setLang(this.lang === 'ko' ? 'en' : 'ko');
        return this.lang;
    }

    /** 언어 변경 시 호출되는 콜백 등록. unsubscribe 함수 반환. */
    static onChange(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    /** 문자열 가져오기. {var} 자리는 vars 객체로 치환. */
    static t(key: StringKey, vars?: Record<string, string | number>): string {
        const entry = STRINGS[key];
        let s = entry[this.lang] || entry.ko;
        if (vars) {
            for (const [k, v] of Object.entries(vars)) {
                s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            }
        }
        return s;
    }
}
