import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../hooks/useSettings";
import { useSync } from "../hooks/useSync";

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings, updateSetting, exportData, clearData } = useSettings();

  const {
    triggerSync,
    pullFromServer,
    pushToServer,
    getSyncStatusMessage,
    isOnline,
    isSyncing,
    pendingChanges,
  } = useSync();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout? Your cards will remain stored locally.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const renderSettingsItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" />
        <View style={styles.settingsItemText}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement ||
        (onPress && <Ionicons name="chevron-forward" size={20} color="#ccc" />)}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderSection(
          "Account",
          <>
            {renderSettingsItem(
              "person",
              user?.name || "User",
              user?.email,
              undefined,
              undefined
            )}
            {renderSettingsItem(
              "log-out",
              "Logout",
              "Sign out of your account",
              handleLogout,
              undefined
            )}
          </>
        )}

        {renderSection(
          "Notifications",
          <>
            {renderSettingsItem(
              "notifications",
              "Push Notifications",
              "Receive alerts about offers and updates",
              undefined,
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) =>
                  updateSetting("pushNotifications", value)
                }
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={settings.pushNotifications ? "#007AFF" : "#f4f3f4"}
              />
            )}
            {renderSettingsItem(
              "location",
              "Location Services",
              "Show nearby stores and card suggestions",
              undefined,
              <Switch
                value={settings.locationServices}
                onValueChange={(value) =>
                  updateSetting("locationServices", value)
                }
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={settings.locationServices ? "#007AFF" : "#f4f3f4"}
              />
            )}
            {renderSettingsItem(
              "card",
              "Card Assist",
              "Auto-display cards at store locations",
              undefined,
              <Switch
                value={settings.cardAssist}
                onValueChange={(value) => updateSetting("cardAssist", value)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={settings.cardAssist ? "#007AFF" : "#f4f3f4"}
              />
            )}
          </>
        )}

        {renderSection(
          "Security",
          <>
            {renderSettingsItem(
              "finger-print",
              "Biometric Lock",
              "Secure your cards with biometric authentication",
              () => {},
              <Switch
                value={settings.biometricLock}
                onValueChange={(value) => updateSetting("biometricLock", value)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={settings.biometricLock ? "#007AFF" : "#f4f3f4"}
              />
            )}
            {renderSettingsItem(
              "shield-checkmark",
              "Auto Lock",
              "Automatically lock app after inactivity",
              () => {}
            )}
          </>
        )}

        {renderSection(
          "Data & Sync",
          <>
            {renderSettingsItem(
              "sync",
              "Sync Now",
              `${getSyncStatusMessage()}${
                pendingChanges > 0 ? ` • ${pendingChanges} pending` : ""
              }`,
              isSyncing ? undefined : triggerSync
            )}
            {renderSettingsItem(
              "cloud-download",
              "Pull from Server",
              "Download latest data from server",
              isOnline && !isSyncing ? pullFromServer : undefined
            )}
            {renderSettingsItem(
              "cloud-upload",
              "Push to Server",
              "Upload local changes to server",
              isOnline && !isSyncing && pendingChanges > 0
                ? pushToServer
                : undefined
            )}
            {renderSettingsItem(
              "download",
              "Export Data",
              "Download your card data",
              exportData
            )}
            {renderSettingsItem(
              "trash",
              "Clear All Data",
              "Remove all cards and data",
              clearData
            )}
          </>
        )}

        {renderSection(
          "About",
          <>
            {renderSettingsItem(
              "information-circle",
              "App Version",
              "v1.0.0",
              () => {}
            )}
            {renderSettingsItem(
              "document-text",
              "Privacy Policy",
              undefined,
              () => {}
            )}
            {renderSettingsItem(
              "help-circle",
              "Help & Support",
              undefined,
              () => {}
            )}
            {renderSettingsItem("star", "Rate App", undefined, () => {})}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e1e1e1",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 15,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 12,
    color: "#666",
  },
});
