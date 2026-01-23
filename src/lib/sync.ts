/**
 * Sync Manager for offline mutation synchronization (Phase 5.3)
 *
 * Processes queued mutations when the user comes back online.
 * Uses exponential backoff for retries and notifies listeners of status changes.
 */

import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  getQueuedMutations,
  clearMutation,
  updateMutationRetry,
  type QueuedMutation,
} from "./offline";

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

// ============================================================================
// Types
// ============================================================================

/** Possible sync status states */
export type SyncStatusType = "idle" | "syncing" | "synced" | "error";

/** Sync status with optional message for errors */
export interface SyncStatus {
  status: SyncStatusType;
  message?: string;
}

// ============================================================================
// Mutation Payload Types (matching Convex mutation args)
// ============================================================================

interface AddItemPayload {
  listId: Id<"lists">;
  name: string;
  createdByDid: string;
  legacyDid?: string;
  createdAt: number;
}

interface CheckItemPayload {
  itemId: Id<"items">;
  checkedByDid: string;
  legacyDid?: string;
  checkedAt: number;
}

interface UncheckItemPayload {
  itemId: Id<"items">;
  userDid: string;
  legacyDid?: string;
}

interface ReorderItemPayload {
  listId: Id<"lists">;
  itemIds: Id<"items">[];
  userDid: string;
  legacyDid?: string;
}

// ============================================================================
// SyncManager Class
// ============================================================================

/**
 * Manages synchronization of queued offline mutations with the server.
 *
 * Usage:
 * ```typescript
 * import { syncManager } from './sync';
 *
 * // Subscribe to status updates
 * const unsubscribe = syncManager.subscribe((status) => {
 *   console.log('Sync status:', status);
 * });
 *
 * // Trigger sync when back online
 * await syncManager.sync(convexClient);
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class SyncManager {
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Process all queued mutations in order.
   * Mutations are processed sequentially to preserve order.
   *
   * @param convex - The Convex React client for executing mutations
   */
  async sync(convex: ConvexReactClient): Promise<void> {
    // Prevent concurrent sync attempts
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notify({ status: "syncing" });

    try {
      const mutations = await getQueuedMutations();

      for (const mutation of mutations) {
        try {
          await this.executeMutation(convex, mutation);
          // Success - remove from queue
          await clearMutation(mutation.id!);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          if (mutation.retryCount >= MAX_RETRIES) {
            // Max retries reached - discard mutation and notify
            await clearMutation(mutation.id!);
            this.notify({
              status: "error",
              message: `Failed to sync ${mutation.type}: ${errorMessage}`,
            });
          } else {
            // Increment retry count for next attempt
            await updateMutationRetry(mutation.id!, mutation.retryCount + 1);

            // Wait before continuing to next mutation
            const delay = RETRY_DELAYS[mutation.retryCount] ?? 16000;
            await this.delay(delay);
          }
        }
      }

      this.notify({ status: "synced" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.notify({
        status: "error",
        message: `Sync failed: ${errorMessage}`,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a single mutation against the Convex backend.
   */
  private async executeMutation(
    convex: ConvexReactClient,
    mutation: QueuedMutation
  ): Promise<void> {
    switch (mutation.type) {
      case "addItem": {
        const payload = mutation.payload as AddItemPayload;
        await convex.mutation(api.items.addItem, payload);
        break;
      }

      case "checkItem": {
        const payload = mutation.payload as CheckItemPayload;
        await convex.mutation(api.items.checkItem, payload);
        break;
      }

      case "uncheckItem": {
        const payload = mutation.payload as UncheckItemPayload;
        await convex.mutation(api.items.uncheckItem, payload);
        break;
      }

      case "reorderItem": {
        const payload = mutation.payload as ReorderItemPayload;
        await convex.mutation(api.items.reorderItems, payload);
        break;
      }

      default: {
        // Type guard - should never happen with current MutationType
        const _exhaustiveCheck: never = mutation.type;
        throw new Error(`Unknown mutation type: ${_exhaustiveCheck}`);
      }
    }
  }

  /**
   * Delay execution for a specified number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Subscribe to sync status updates.
   *
   * @param listener - Callback function called with status updates
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of a status change.
   */
  private notify(status: SyncStatus): void {
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Check if sync is currently in progress.
   */
  get syncing(): boolean {
    return this.isSyncing;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton SyncManager instance for app-wide use.
 */
export const syncManager = new SyncManager();
