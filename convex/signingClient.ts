/**
 * Client for the external signing worker.
 * 
 * This replaces direct @originals/auth imports to keep the Convex bundle small.
 * The heavy Turnkey/crypto dependencies live in the signing worker instead.
 */

const SIGNING_WORKER_URL = process.env.SIGNING_WORKER_URL || 'https://pooapp-signing.aviarytech.workers.dev';

interface SigningClientConfig {
  workerUrl?: string;
  secret: string;
}

export class SigningClient {
  private url: string;
  private secret: string;

  constructor(config: SigningClientConfig) {
    this.url = config.workerUrl || SIGNING_WORKER_URL;
    this.secret = config.secret;
  }

  private async request<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const response = await fetch(`${this.url}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secret}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data as T;
  }

  /**
   * Create a DID for a user via the signing worker
   */
  async createDID(subOrgId: string, webvhDomain: string): Promise<{ did: string; verificationMethodId: string }> {
    const result = await this.request<{ success: boolean; did: string; verificationMethodId: string }>(
      '/create-did',
      { subOrgId, webvhDomain }
    );
    return { did: result.did, verificationMethodId: result.verificationMethodId };
  }

  /**
   * Sign an item action credential
   */
  async signItemAction(args: {
    type: 'ItemAdded' | 'ItemChecked' | 'ItemUnchecked' | 'ItemRemoved';
    listDid: string;
    itemId: string;
    actorDid: string;
    subOrgId: string;
  }): Promise<{
    type: string;
    listDid: string;
    itemId: string;
    actor: string;
    timestamp: string;
    credential: any;
  }> {
    return this.request('/sign-item-action', args);
  }

  /**
   * Sign arbitrary data
   */
  async signData(data: string, subOrgId: string): Promise<{ signature: string; publicKey: string }> {
    const result = await this.request<{ success: boolean; signature: string; publicKey: string }>(
      '/sign-data',
      { data, subOrgId }
    );
    return { signature: result.signature, publicKey: result.publicKey };
  }
}

/**
 * Create a signing client instance.
 * Uses SIGNING_SECRET env var for authentication.
 */
export function createSigningClient(secret: string, workerUrl?: string): SigningClient {
  return new SigningClient({ secret, workerUrl });
}
