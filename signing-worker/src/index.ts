/**
 * PooApp Signing Worker
 * 
 * Handles Turnkey signing operations outside of Convex to avoid bundle size limits.
 * Convex calls this worker via HTTP instead of importing @originals/auth directly.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createTurnkeyClient, TurnkeyWebVHSigner } from '@originals/auth/server';
import { CredentialManager, OriginalsSDK } from '@originals/sdk';
import type { OriginalsConfig } from '@originals/sdk';

interface Env {
  TURNKEY_API_PUBLIC_KEY: string;
  TURNKEY_API_PRIVATE_KEY: string;
  TURNKEY_ORGANIZATION_ID: string;
  SIGNING_SECRET: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for Convex HTTP actions
app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auth middleware - verify requests from Convex
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader || authHeader !== `Bearer ${c.env.SIGNING_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  await next();
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'pooapp-signing' }));

// SDK config
const config: OriginalsConfig = {
  network: 'signet',
  defaultKeyType: 'Ed25519',
};

/**
 * Get Ed25519 wallet account for a sub-org
 */
async function getEd25519Account(env: Env, subOrgId: string) {
  const turnkeyClient = createTurnkeyClient({
    apiPublicKey: env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: env.TURNKEY_API_PRIVATE_KEY,
    organizationId: env.TURNKEY_ORGANIZATION_ID,
  });

  // Get wallets for the sub-org
  const walletsResponse = await turnkeyClient.apiClient().getWallets({
    organizationId: subOrgId,
  });
  
  const wallets = walletsResponse.wallets;
  if (!wallets || wallets.length === 0) {
    throw new Error('No wallets found for sub-org');
  }

  // Get wallet accounts
  const rawClient = (turnkeyClient as any).client;
  const accountsResponse = await rawClient.getWalletAccounts({
    organizationId: subOrgId,
    walletId: wallets[0].walletId,
  });
  
  const accounts = accountsResponse.accounts;
  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet accounts found');
  }

  // Find Ed25519 account
  const ed25519Account = accounts.find((a: any) => a.curve === 'CURVE_ED25519');
  if (!ed25519Account) {
    throw new Error('No Ed25519 account found');
  }

  const address = ed25519Account.address;
  const verificationMethodId = `did:key:${address}`;

  return { turnkeyClient, address, verificationMethodId };
}

/**
 * Create DID for a user
 */
app.post('/create-did', async (c) => {
  try {
    const { subOrgId, webvhDomain } = await c.req.json();
    
    if (!subOrgId || !webvhDomain) {
      return c.json({ error: 'Missing subOrgId or webvhDomain' }, 400);
    }

    const { turnkeyClient, address, verificationMethodId } = 
      await getEd25519Account(c.env, subOrgId);

    const signer = new TurnkeyWebVHSigner(
      subOrgId,
      address,
      address,
      turnkeyClient,
      verificationMethodId
    );

    const sdk = new OriginalsSDK({ ...config, webvhDomain });
    const did = await sdk.createDID(signer);

    return c.json({ 
      success: true, 
      did: did.id,
      verificationMethodId 
    });
  } catch (error: any) {
    console.error('create-did error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Sign an item action credential
 */
app.post('/sign-item-action', async (c) => {
  try {
    const { type, listDid, itemId, actorDid, subOrgId } = await c.req.json();
    
    if (!type || !listDid || !itemId || !actorDid || !subOrgId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const { turnkeyClient, address, verificationMethodId } = 
      await getEd25519Account(c.env, subOrgId);

    const signer = new TurnkeyWebVHSigner(
      subOrgId,
      address,
      address,
      turnkeyClient,
      verificationMethodId
    );

    const credentialManager = new CredentialManager(config);
    const timestamp = new Date().toISOString();

    const unsignedCredential = await credentialManager.createResourceCredential(
      type === 'ItemAdded' ? 'ResourceCreated' : 'ResourceUpdated',
      {
        id: `${listDid}#item-${itemId}`,
        actionType: type,
        listDid,
        itemId,
        actor: actorDid,
        timestamp,
      },
      actorDid
    );

    const signedCredential = await credentialManager.signCredentialWithExternalSigner(
      unsignedCredential,
      signer
    );

    return c.json({
      success: true,
      type,
      listDid,
      itemId,
      actor: actorDid,
      timestamp,
      credential: signedCredential,
    });
  } catch (error: any) {
    console.error('sign-item-action error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Sign arbitrary data
 */
app.post('/sign-data', async (c) => {
  try {
    const { data, subOrgId } = await c.req.json();
    
    if (!data || !subOrgId) {
      return c.json({ error: 'Missing data or subOrgId' }, 400);
    }

    const { turnkeyClient, address } = await getEd25519Account(c.env, subOrgId);

    // Sign using Turnkey's signRawPayload
    const signResult = await turnkeyClient.apiClient().signRawPayload({
      signWith: address,
      payload: Buffer.from(data).toString('hex'),
      encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
      hashFunction: 'HASH_FUNCTION_NO_OP',
    });

    return c.json({
      success: true,
      signature: signResult.r + signResult.s,
      publicKey: address,
    });
  } catch (error: any) {
    console.error('sign-data error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
