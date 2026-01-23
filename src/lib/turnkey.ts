/**
 * Turnkey client wrapper for the Lisa app.
 *
 * Provides a simplified API for Turnkey-based authentication via @originals/auth.
 * This enables secure key management where private keys never leave Turnkey's
 * infrastructure, while still allowing DID-based operations.
 *
 * Used alongside the existing identity system during migration period.
 */

import {
  initializeTurnkeyClient,
  initOtp,
  completeOtp,
  fetchWallets,
  fetchUser,
  getKeyByCurve,
  ensureWalletWithAccounts,
  TurnkeyDIDSigner,
  TurnkeySessionExpiredError,
  createDIDWithTurnkey,
} from "@originals/auth/client";
import type { TurnkeyWallet } from "@originals/auth/types";

// Re-export functions and classes for consumers
export {
  initializeTurnkeyClient,
  initOtp,
  completeOtp,
  fetchWallets,
  fetchUser,
  getKeyByCurve,
  ensureWalletWithAccounts,
  TurnkeyDIDSigner,
  TurnkeySessionExpiredError,
  createDIDWithTurnkey,
};

export type { TurnkeyWallet };
