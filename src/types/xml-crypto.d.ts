declare module 'xml-crypto' {
  export class SignedXml {
    constructor(options?: any);
    signingKey: string | Buffer;
    keyInfoProvider?: { getKeyInfo(): string };
    addReference(options: {
      xpath: string;
      transforms?: string[];
      digestAlgorithm?: string;
    }): void;
    sign(xml: string): string;
    verifySignature(xml: string): boolean;
  }
}