import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/src/components/ui/Text";
import { useAuth } from "@/src/contexts/AuthContext";

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
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold tracking-tight text-slate-900">
          Consultrack
        </Text>
        <Pressable
          onPress={handleLogout}
          hitSlop={8}
          className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 active:bg-slate-100"
        >
          <Feather name="log-out" size={16} color="#64748b" />
          <Text className="text-sm font-medium text-slate-600">Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
