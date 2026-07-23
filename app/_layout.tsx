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
  console.log("[ROOT] render start");

  const [loaded, error] = useFonts(plusJakartaSansFonts);

  console.log("[ROOT] fonts state", { loaded, error });

  useEffect(() => {
    console.log("[ROOT] effect fired", { loaded, error });
    if (loaded || error) {
      console.log("[ROOT] calling hideAsync");
      void SplashScreen.hideAsync()
        .then(() => console.log("[ROOT] splash hidden OK"))
        .catch((e) => console.log("[ROOT] splash hide ERROR", e));
    }
  }, [loaded, error]);

  console.log("[ROOT] about to return JSX", { loaded, error });

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