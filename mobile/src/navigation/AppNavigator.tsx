import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CardsScreen } from "../screens/CardsScreen";
import { ScanScreen } from "../screens/ScanScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CardDetailScreen } from "../screens/CardDetailScreen";
import { AddCardScreen } from "../screens/AddCardScreen";
import { ManualEntryScreen } from "../screens/ManualEntryScreen";

import { RootTabParamList, RootStackParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Cards") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "Scan") {
            iconName = focused ? "scan" : "scan-outline";
          } else if (route.name === "Transactions") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerStyle: {
          backgroundColor: "#007AFF",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{ title: "My Cards" }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{ title: "Scan Card" }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: "Transactions" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#007AFF",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CardDetail"
            component={CardDetailScreen}
            options={{ title: "Card Details" }}
          />
          <Stack.Screen
            name="AddCard"
            component={AddCardScreen}
            options={{ title: "Add Card" }}
          />
          <Stack.Screen
            name="ManualEntry"
            component={ManualEntryScreen}
            options={{ title: "Manual Entry" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
