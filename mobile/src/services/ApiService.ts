import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { LoyaltyCard, Transaction, Offer } from "../types/card";

class ApiService {
  private api: AxiosInstance;
  private baseURL = "http://localhost:3000/api/v1"; // This should match your backend URL

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login or refresh token
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized() {
    // Clear stored token and redirect to login
    await AsyncStorage.removeItem("auth_token");
    // You could emit an event here to redirect to login screen
  }

  // Device information helpers
  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem("device_id");
    if (!deviceId) {
      // Generate a unique device ID
      deviceId =
        Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    const deviceName = Constants.deviceName || `${Platform.OS} Device`;
    return deviceName;
  }

  private getDeviceType(): "ios" | "android" | "web" {
    if (Platform.OS === "web") return "web";
    return Platform.OS as "ios" | "android";
  }

  private async getDeviceInfo() {
    return {
      device_id: await this.getDeviceId(),
      device_name: this.getDeviceName(),
      device_type: this.getDeviceType(),
      push_token: undefined, // TODO: Implement push notifications
    };
  }

  // Authentication
  async login(email: string, password: string) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const response = await this.api.post("/auth/login", {
        email,
        password,
        ...deviceInfo,
      });
      const { token, user } = response.data.data;

      await AsyncStorage.setItem("auth_token", token);

      return { token, user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: { email: string; password: string; name: string }) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const response = await this.api.post("/auth/register", {
        ...userData,
        ...deviceInfo,
      });
      const { token, user } = response.data.data;

      await AsyncStorage.setItem("auth_token", token);

      return { token, user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await this.api.post("/auth/logout");
    } finally {
      await AsyncStorage.removeItem("auth_token");
    }
  }

  // Cards API
  async getCards(): Promise<LoyaltyCard[]> {
    try {
      const response = await this.api.get("/cards");
      return response.data.data.cards;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCard(cardData: Partial<LoyaltyCard>): Promise<LoyaltyCard> {
    try {
      // Map frontend camelCase to backend snake_case
      const barcodeTypeMapping: Record<string, string> = {
        CODE128: "code128",
        CODE39: "code39",
        QR_CODE: "qr",
        EAN13: "ean13",
        UPC_A: "upc",
      };

      const backendCardData = {
        card_name: cardData.name,
        store_name: cardData.store,
        card_number: cardData.cardNumber,
        barcode_type: cardData.barcodeType
          ? barcodeTypeMapping[cardData.barcodeType] || "code128"
          : "code128",
        barcode_data: cardData.barcodeData,
        card_color: cardData.color,
        notes: cardData.notes || "",
        is_favorite: cardData.isFavorite || false,
      };

      const response = await this.api.post("/cards", backendCardData);
      return response.data.data.card;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCard(
    cardId: string,
    cardData: Partial<LoyaltyCard>
  ): Promise<LoyaltyCard> {
    try {
      // Map frontend camelCase to backend snake_case
      const barcodeTypeMapping: Record<string, string> = {
        CODE128: "code128",
        CODE39: "code39",
        QR_CODE: "qr",
        EAN13: "ean13",
        UPC_A: "upc",
      };

      const backendCardData: any = {};

      if (cardData.name) backendCardData.card_name = cardData.name;
      if (cardData.store) backendCardData.store_name = cardData.store;
      if (cardData.cardNumber)
        backendCardData.card_number = cardData.cardNumber;
      if (cardData.barcodeType)
        backendCardData.barcode_type =
          barcodeTypeMapping[cardData.barcodeType] || "code128";
      if (cardData.barcodeData)
        backendCardData.barcode_data = cardData.barcodeData;
      if (cardData.color) backendCardData.card_color = cardData.color;
      if (cardData.notes !== undefined) backendCardData.notes = cardData.notes;
      if (cardData.isFavorite !== undefined)
        backendCardData.is_favorite = cardData.isFavorite;

      const response = await this.api.put(`/cards/${cardId}`, backendCardData);
      return response.data.data.card;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      await this.api.delete(`/cards/${cardId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateBarcode(cardId: string): Promise<string> {
    try {
      const response = await this.api.post(`/barcode/generate`, { cardId });
      return response.data.barcodeUrl;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Transactions API
  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await this.api.get("/transactions");
      return response.data.transactions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTransaction(
    transactionData: Partial<Transaction>
  ): Promise<Transaction> {
    try {
      const response = await this.api.post("/transactions", transactionData);
      return response.data.transaction;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Location API
  async getNearbyStores(latitude: number, longitude: number, radius = 5) {
    try {
      const response = await this.api.get("/location/nearby", {
        params: { latitude, longitude, radius },
      });
      return response.data.stores;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSuggestedCards(latitude: number, longitude: number) {
    try {
      const response = await this.api.get("/location/suggest-cards", {
        params: { latitude, longitude },
      });
      return response.data.suggestedCards;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Offers API
  async getOffers(): Promise<Offer[]> {
    try {
      const response = await this.api.get("/offers");
      return response.data.offers;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPersonalizedOffers(): Promise<Offer[]> {
    try {
      const response = await this.api.get("/offers/personalized");
      return response.data.offers;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async saveOffer(offerId: string): Promise<void> {
    try {
      await this.api.post(`/offers/${offerId}/save`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async redeemOffer(offerId: string): Promise<void> {
    try {
      await this.api.post(`/offers/${offerId}/redeem`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || "Server error occurred";
      return new Error(message);
    } else if (error.request) {
      // Request made but no response received
      return new Error("Network error - please check your connection");
    } else {
      // Something else happened
      return new Error(error.message || "An unexpected error occurred");
    }
  }
}

export const apiService = new ApiService();
