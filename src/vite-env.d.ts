declare module '*.png';

interface ImportMetaEnv {
    readonly BASE_URL: string;
    readonly VITE_LS_NO_ADS_URL: string;
    readonly VITE_API_BASE_URL: string;
    readonly VITE_GD_GAME_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
