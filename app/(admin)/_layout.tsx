import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/src/contexts/AuthContext";
import { AppHeader } from "@/src/components/AppHeader";
import { View, ActivityIndicator } from "react-native";
import { FONT } from "@/src/theme/fonts";

export default function AdminTabsLayout() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [loading, isAuthenticated]);

  if (loading || !isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarLabelStyle: {
            fontFamily: FONT.medium,
            fontSize: 11,
          },
        }}
      >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="login-management"
        options={{
          title: "Login Mgmt",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" color={color} size={size} />
          ),
        }}
      />
      </Tabs>
    </View>
  );
}
