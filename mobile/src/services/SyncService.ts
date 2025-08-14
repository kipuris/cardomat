import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { apiService } from "./ApiService";
import { LoyaltyCard, Transaction } from "../types/card";

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
}

export interface PendingChange {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  entity: "card" | "transaction";
  data: any;
  timestamp: Date;
  retryCount: number;
}

export class SyncService {
  private listeners: Array<(status: SyncStatus) => void> = [];
  private syncStatus: SyncStatus = {
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load sync status from storage
    await this.loadSyncStatus();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Set up app state monitoring
    this.setupAppStateMonitoring();

    // Perform initial sync if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.handleOnline();
    }
  }

  private setupNetworkMonitoring() {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.syncStatus.isOnline) {
        this.handleOnline();
      } else if (wasOnline && !this.syncStatus.isOnline) {
        this.handleOffline();
      }

      this.notifyListeners();
    });
  }

  private setupAppStateMonitoring() {
    AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && this.syncStatus.isOnline) {
        // Sync when app becomes active and we're online
        this.syncPendingChanges();
      }
    });
  }

  private async handleOnline() {
    console.log("Network: Online");
    try {
      await this.syncPendingChanges();
    } catch (error) {
      console.error("Sync on network restoration failed:", error);
    }
  }

  private handleOffline() {
    console.log("Network: Offline");
    this.syncStatus.isSyncing = false;
    this.notifyListeners();
  }

  // Add a change to the pending queue
  async addPendingChange(
    change: Omit<PendingChange, "id" | "timestamp" | "retryCount">
  ) {
    try {
      const pendingChange: PendingChange = {
        ...change,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        retryCount: 0,
      };

      const existing = await this.getPendingChanges();
      existing.push(pendingChange);

      await AsyncStorage.setItem("pending_changes", JSON.stringify(existing));

      this.syncStatus.pendingChanges = existing.length;
      this.notifyListeners();

      // Try to sync immediately if online
      if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
        this.syncPendingChanges();
      }
    } catch (error) {
      console.error("Failed to add pending change:", error);
    }
  }

  // Check if user is authenticated
  private async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token || token === "undefined" || token === "null") {
      return false;
    }

    // Basic token format validation (should be a non-empty string)
    return token.length > 0;
  }

  // Sync pending changes with the server
  async syncPendingChanges(): Promise<void> {
    if (this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
      return;
    }

    // Skip sync if not authenticated - work offline only
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      console.log("Skipping sync - no auth token (offline-only mode)");
      return;
    }

    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    try {
      const pendingChanges = await this.getPendingChanges();
      const successfulChanges: string[] = [];

      for (const change of pendingChanges) {
        try {
          await this.processPendingChange(change);
          successfulChanges.push(change.id);
        } catch (error) {
          console.error(`Failed to sync change ${change.id}:`, error);

          // Check if it's an authentication error
          const isAuthError =
            error instanceof Error &&
            (error.message.includes("Invalid or expired token") ||
              error.message.includes("Access token required") ||
              error.message.includes("Unauthorized"));

          if (isAuthError) {
            console.warn(
              "Authentication error detected, clearing all pending changes"
            );
            // Clear all pending changes since they won't succeed without valid auth
            await this.clearPendingChanges();
            break; // Exit the loop since we cleared everything
          }

          // Increment retry count for non-auth errors
          change.retryCount++;

          // Remove changes that have failed too many times
          if (change.retryCount >= 3) {
            console.warn(
              `Removing change ${change.id} after ${change.retryCount} failed attempts`
            );
            successfulChanges.push(change.id);
          }
        }
      }

      // Remove successfully synced changes
      if (successfulChanges.length > 0) {
        const remainingChanges = pendingChanges.filter(
          (change) => !successfulChanges.includes(change.id)
        );
        await AsyncStorage.setItem(
          "pending_changes",
          JSON.stringify(remainingChanges)
        );
        this.syncStatus.pendingChanges = remainingChanges.length;
      }

      this.syncStatus.lastSync = new Date();
      await this.saveSyncStatus();
    } catch (error) {
      console.error("Sync process failed:", error);
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processPendingChange(change: PendingChange) {
    switch (change.entity) {
      case "card":
        await this.syncCardChange(change);
        break;
      case "transaction":
        await this.syncTransactionChange(change);
        break;
      default:
        throw new Error(`Unknown entity type: ${change.entity}`);
    }
  }

  private async syncCardChange(change: PendingChange) {
    switch (change.type) {
      case "CREATE":
        await apiService.createCard(change.data);
        break;
      case "UPDATE":
        await apiService.updateCard(change.data.id, change.data);
        break;
      case "DELETE":
        await apiService.deleteCard(change.data.id);
        break;
    }
  }

  private async syncTransactionChange(change: PendingChange) {
    switch (change.type) {
      case "CREATE":
        await apiService.createTransaction(change.data);
        break;
      // Transactions are typically append-only, so no UPDATE/DELETE
    }
  }

  // Sync data from server (pull)
  async syncFromServer(): Promise<{
    cards: LoyaltyCard[];
    transactions: Transaction[];
  }> {
    if (!this.syncStatus.isOnline) {
      throw new Error("Cannot sync from server while offline");
    }

    try {
      const [cards, transactions] = await Promise.all([
        apiService.getCards(),
        apiService.getTransactions(),
      ]);

      return { cards, transactions };
    } catch (error) {
      console.error("Failed to sync from server:", error);
      throw error;
    }
  }

  // Force full sync (pull and push)
  async performFullSync(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      Alert.alert(
        "Offline",
        "Cannot sync while offline. Please check your internet connection."
      );
      return;
    }

    try {
      this.syncStatus.isSyncing = true;
      this.notifyListeners();

      // First, sync pending changes (push)
      await this.syncPendingChanges();

      // Then, sync from server (pull)
      const serverData = await this.syncFromServer();

      // Merge with local data (this would typically be handled by the app context)
      // For now, we'll just return the server data
      return serverData as any;
    } catch (error) {
      Alert.alert(
        "Sync Error",
        "Failed to sync with server. Please try again later."
      );
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Get pending changes from storage
  private async getPendingChanges(): Promise<PendingChange[]> {
    try {
      const changes = await AsyncStorage.getItem("pending_changes");
      return changes ? JSON.parse(changes) : [];
    } catch (error) {
      console.error("Failed to get pending changes:", error);
      return [];
    }
  }

  // Load sync status from storage
  private async loadSyncStatus() {
    try {
      const status = await AsyncStorage.getItem("sync_status");
      if (status) {
        const parsed = JSON.parse(status);
        this.syncStatus = {
          ...this.syncStatus,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
        };
      }

      const pendingChanges = await this.getPendingChanges();
      this.syncStatus.pendingChanges = pendingChanges.length;
    } catch (error) {
      console.error("Failed to load sync status:", error);
    }
  }

  // Save sync status to storage
  private async saveSyncStatus() {
    try {
      await AsyncStorage.setItem(
        "sync_status",
        JSON.stringify({
          lastSync: this.syncStatus.lastSync?.toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  }

  // Subscribe to sync status changes
  addListener(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);

    // Immediately notify the listener with current status
    listener(this.syncStatus);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.syncStatus));
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Clear all pending changes (useful for testing or reset)
  async clearPendingChanges() {
    try {
      await AsyncStorage.removeItem("pending_changes");
      this.syncStatus.pendingChanges = 0;
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to clear pending changes:", error);
    }
  }

  // Check if device is online
  async checkOnlineStatus(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error("Failed to check online status:", error);
      return false;
    }
  }
}

export const syncService = new SyncService();
