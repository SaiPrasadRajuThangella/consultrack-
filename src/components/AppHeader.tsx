import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/src/components/ui/Text";
import { useAuth } from "@/src/contexts/AuthContext";

/** Shared inner row height for AppHeader and student-profile back bar */
export const APP_HEADER_ROW_HEIGHT = 56;

export function AppHeader() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
      <View
        className="relative flex-row items-center justify-end px-4"
        style={{ height: APP_HEADER_ROW_HEIGHT }}
      >
        <Text
          className="absolute left-0 right-0 text-center text-xl font-bold tracking-tight text-slate-900"
          pointerEvents="none"
        >
          Consultrack
        </Text>
        <Pressable
          onPress={handleLogout}
          hitSlop={8}
          className="z-10 flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 active:bg-slate-100"
        >
          <Feather name="log-out" size={16} color="#64748b" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
