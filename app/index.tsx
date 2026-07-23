import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";

/**
 * Entry route for `/`. Without this route, expo-router has nothing to match on
 * the initial URL: on a native release build React Navigation's async linking
 * pass never commits an initial state, the root screen never mounts, and the app
 * hangs on the splash screen. This sends the user to the right place based on
 * auth state.
 */
export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Redirect href={isAuthenticated ? "/(admin)/dashboard" : "/(auth)/login"} />
  );
}
