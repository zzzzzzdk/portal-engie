/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    YISACONF?: any;
    cancelTokens?: any[];
    __APP_CONFIG__?: any;
    DocsAPI?: {
      DocEditor: new (id: string, config: Record<string, any>) => {
        destroyEditor: () => void;
      };
    };
  }
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}

export {};
