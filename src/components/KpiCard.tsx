import { View, Pressable } from "react-native";
// import LinearGradient from "react-native-linear-gradient";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconWrap?: string;
  iconColor?: string;
  clickable?: boolean;
  onPress?: () => void;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconWrap = "bg-indigo-100",
  iconColor = "#6366f1",
  clickable,
  onPress,
}: KpiCardProps) {
  const content = (
    <LinearGradient
      colors={["#ffffff", "#f3f1fb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(226,232,240,0.8)",
        padding: 18,
        minHeight: 108,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1 gap-2 pr-2">
          <Text
            className="text-[10px] font-bold uppercase text-slate-500"
            style={{ letterSpacing: 1.2 }}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            className="text-3xl font-extrabold tracking-tight text-slate-900"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
        </View>

        <View
          className={cn(
            "h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconWrap,
          )}
        >
          <Icon size={20} color={iconColor} strokeWidth={2} />
        </View>
      </View>
    </LinearGradient>
  );

  if (clickable) {
    return (
      <Pressable onPress={onPress} className="w-full active:opacity-90 active:scale-[0.98]">
        {content}
      </Pressable>
    );
  }

  return <View className="w-full">{content}</View>;
}