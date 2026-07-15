import "../global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { plusJakartaSansFonts } from "@/src/theme/fonts";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(plusJakartaSansFonts);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      {!loaded && !error ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </AuthProvider>
  );
}
