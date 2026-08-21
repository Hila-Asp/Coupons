/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string;
    displayValue?: boolean;
    background?: string;
    lineColor?: string;
    margin?: number;
    fontSize?: number;
    textMargin?: number;
  }

  function JsBarcode(
    element: string | HTMLElement | SVGSVGElement,
    text: string,
    options?: JsBarcodeOptions,
  ): void;

  export default JsBarcode;
}
