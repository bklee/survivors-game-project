declare module '*.png';

interface ImportMetaEnv {
    readonly VITE_LS_NO_ADS_URL: string;
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
