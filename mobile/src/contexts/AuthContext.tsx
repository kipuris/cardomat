import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "../services/ApiService";
import { syncService } from "../services/SyncService";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "RESTORE_TOKEN"; payload: { user: User; token: string } | null };

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
      };

    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      };

    case "RESTORE_TOKEN":
      if (action.payload) {
        return {
          ...state,
          isAuthenticated: true,
          isLoading: false,
          user: action.payload.user,
          token: action.payload.token,
        };
      } else {
        return {
          ...state,
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
        };
      }

    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored auth token on app start
  useEffect(() => {
    checkStoredToken();
  }, []);

  const checkStoredToken = async () => {
    try {
      console.log("🔍 Checking stored token...");
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem("auth_token"),
        AsyncStorage.getItem("user_data"),
      ]);

      console.log("📱 Stored data:", {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        hasUserData: !!userStr,
        userDataPreview: userStr ? userStr.substring(0, 50) + "..." : "null",
        rawToken: token,
        rawUserData: userStr,
      });

      if (token && userStr && userStr !== "undefined" && userStr !== "null") {
        try {
          const user = JSON.parse(userStr);
          console.log(
            "✅ Successfully restored auth state for user:",
            user.email
          );
          dispatch({ type: "RESTORE_TOKEN", payload: { user, token } });
        } catch (parseError) {
          console.error("❌ Error parsing user data:", parseError);
          // Clear invalid data and treat as logged out
          await Promise.all([
            AsyncStorage.removeItem("auth_token"),
            AsyncStorage.removeItem("user_data"),
            syncService.clearPendingChanges(), // Clear pending sync changes
          ]);
          dispatch({ type: "RESTORE_TOKEN", payload: null });
        }
      } else {
        console.log("🚫 No valid stored auth data found");
        dispatch({ type: "RESTORE_TOKEN", payload: null });
      }
    } catch (error) {
      console.error("❌ Error checking stored token:", error);
      dispatch({ type: "RESTORE_TOKEN", payload: null });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await apiService.login(email, password);

      // Store user data
      await AsyncStorage.setItem("user_data", JSON.stringify(response.user));
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
  }) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await apiService.register(userData);

      // Store user data
      await AsyncStorage.setItem("user_data", JSON.stringify(response.user));
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear stored data regardless of API call success
      await Promise.all([
        AsyncStorage.removeItem("auth_token"),
        AsyncStorage.removeItem("user_data"),
        syncService.clearPendingChanges(), // Clear pending sync changes
      ]);

      dispatch({ type: "LOGOUT" });
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
