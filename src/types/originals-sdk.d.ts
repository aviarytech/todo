declare module "@originals/sdk" {
  export interface OriginalsConfig {
    network?: string;
    defaultKeyType?: string;
  }

  export interface DIDDocument {
    id: string;
    [key: string]: unknown;
  }

  export interface VerifiableCredential {
    [key: string]: unknown;
  }

  export interface KeyPair {
    [key: string]: unknown;
  }

  export class DIDManager {
    constructor(config?: OriginalsConfig);
    createDIDPeer(
      resources?: unknown[],
      includeServices?: boolean
    ): Promise<{ didDocument: DIDDocument }>;
  }
}
