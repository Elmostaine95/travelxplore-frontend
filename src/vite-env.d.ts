/// <reference types="vite/client" />

declare module "d3-geo";
declare module "topojson-client";

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** LiteAPI payment SDK (user payment flow); present after script load. */
interface Window {
  LiteAPIPayment?: new (config: {
    publicKey: string;
    secretKey: string;
    returnUrl: string;
    targetElement: string;
    appearance?: { theme?: string };
    options?: { business?: { name?: string } };
  }) => {
    handlePayment: () => void;
  };
}
