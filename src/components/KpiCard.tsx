import { View, Pressable, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
  trend?: string;
  clickable?: boolean;
  onPress?: () => void;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconWrap,
  iconColor,
  trend,
  clickable,
  onPress,
}: KpiCardProps) {
  const content = (
    <View className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5" style={styles.shadow}>
      {/* Soft premium glow — top-right, mirrors web gradient-primary blur */}
      <View
        pointerEvents="none"
        style={styles.glow}
        className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-300/30"
      />

      <View className="relative z-10 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-2">
          <Text
            className="text-[10px] font-semibold uppercase text-slate-500"
            style={styles.labelTracking}
            numberOfLines={2}
          >
            {label}
          </Text>
          <Text
            className="text-2xl font-semibold tracking-tight text-slate-900"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
          {trend ? (
            <Text className="text-xs font-medium text-emerald-600">{trend}</Text>
          ) : null}
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
    </View>
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

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 118,
  },
  glow: {
    opacity: 0.45,
  },
  labelTracking: {
    letterSpacing: 1.4,
  },
});
