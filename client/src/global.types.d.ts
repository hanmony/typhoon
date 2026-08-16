interface Option<T = string | number> {
  label: string;
  value: T;
}

interface PromiseWithResolvers<T> {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

interface Window {
  HELP_IMPROVE_VIDEOJS?: boolean;
  pdfWorkerSrc?: string;
}

declare module '*.svg' {
  const content: any;
  export default content;
}
