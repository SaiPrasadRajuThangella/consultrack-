import { useEffect } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/contexts/AuthContext";
import { AppHeader } from "@/src/components/AppHeader";
import { View, ActivityIndicator } from "react-native";
import { FONT } from "@/src/theme/fonts";

export default function AdminTabsLayout() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide Consultrack header on student profile — back bar is the only header there
  const isStudentProfile =
    /\/students\/[^/]+$/.test(pathname) && !pathname.endsWith("/add");
  const isAppProfile = pathname.includes("/profile");

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
      {!isStudentProfile ? <AppHeader /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarLabelStyle: {
            fontFamily: FONT.medium,
            fontSize: 11,
          },
          tabBarStyle: isAppProfile
            ? { display: "none" }
            : {
                height: 64 + Math.max(insets.bottom, 8),
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 8) + 4,
                paddingHorizontal: 8,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
                backgroundColor: "#ffffff",
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
          name="students"
          options={{
            title: "Students",
            tabBarIcon: ({ color, size }) => (
              <Feather name="book-open" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="login-management"
          options={{
            title: "Logs",
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" color={color} size={size} />
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
          name="profile"
          options={{
            href: null,
            title: "Profile",
          }}
        />
      </Tabs>
    </View>
  );
}
