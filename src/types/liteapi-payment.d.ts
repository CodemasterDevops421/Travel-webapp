declare class LiteAPIPayment {
  constructor(config: {
    publicKey: 'sandbox' | 'live';
    secretKey: string;
    returnUrl: string;
    targetElement: string;
    appearance?: {
      theme?: string;
    };
    options?: {
      business?: {
        name?: string;
      };
    };
  });

  handlePayment(): void;
}

declare global {
  interface Window {
    LiteAPIPayment?: typeof LiteAPIPayment;
  }
}

export {};
