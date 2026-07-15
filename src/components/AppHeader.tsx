import { Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Text } from "@/src/components/ui/Text";
import { useAuth } from "@/src/contexts/AuthContext";

const LOGO_SIZE = 48;

/** Shared inner row height for AppHeader and student-profile back bar */
export const APP_HEADER_ROW_HEIGHT = 68;

export function AppHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isProfile = pathname.includes("/profile");

  const displayName = user?.userName?.trim() || "Admin";
  const logoUrl = typeof user?.logoUrl === "string" ? user.logoUrl.trim() : "";

  const goToProfile = () => {
    if (!isProfile) router.push("/(admin)/profile");
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/dashboard");
    }
  };

  const logo = logoUrl ? (
    <Image
      source={{ uri: logoUrl }}
      style={{
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
      }}
      className="rounded-full"
      contentFit="cover"
      accessibilityLabel={`${displayName} logo`}
    />
  ) : (
    <View
      style={{
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
      }}
      className="items-center justify-center rounded-full bg-slate-100"
    >
      <Feather name="user" size={22} color="#94a3b8" />
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
      <View
        className="flex-row items-center justify-between gap-3 px-4"
        style={{ height: APP_HEADER_ROW_HEIGHT }}
      >
        <Pressable
          onPress={goToProfile}
          disabled={isProfile}
          className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={isProfile ? displayName : "Open profile"}
        >
          {logo}

          <View
            className="min-w-0 flex-1 justify-center"
            style={{ height: LOGO_SIZE }}
          >
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              Welcome
            </Text>
            <Text
              className="text-base font-semibold tracking-tight text-slate-900"
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>
        </Pressable>

        {isProfile ? (
          <Pressable
            onPress={goBack}
            hitSlop={8}
            className="items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2.5 active:bg-slate-100"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={18} color="#64748b" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
