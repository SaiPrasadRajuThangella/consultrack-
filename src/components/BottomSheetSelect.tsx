import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
};

type BottomSheetSelectProps = {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
/** Sheet occupies ~45% of the screen, anchored to the bottom */
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45);

export function BottomSheetSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: BottomSheetSelectProps) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const insets = useSafeAreaInsets();

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;
  const hasValue = value !== "";

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SHEET_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start();
    }
  }, [visible, slideAnim]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  };

  const select = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  return (
    <>
      <View className={cn(disabled && "opacity-50")}>
        {label ? (
          <Text className="mb-1.5 text-xs font-medium text-slate-500">{label}</Text>
        ) : null}
        <Pressable
          onPress={() => {
            if (!disabled) setVisible(true);
          }}
          disabled={disabled}
          className={cn(
            "flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3.5",
            disabled ? "bg-slate-50" : "active:bg-slate-50",
          )}
        >
          <Text
            className={cn(
              "flex-1 text-sm",
              hasValue ? "font-medium text-slate-900" : "text-slate-400",
            )}
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
          <Feather name="chevron-down" size={18} color="#94a3b8" />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={close} />

          <Animated.View
            style={{
              height: SHEET_HEIGHT,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY: slideAnim }],
            }}
            className="rounded-t-3xl border-t border-slate-100 bg-white shadow-lg"
          >
            <View className="items-center py-3">
              <View className="h-1 w-10 rounded-full bg-slate-200" />
            </View>

            <View className="border-b border-slate-100 px-5 pb-3">
              <Text className="text-base font-semibold text-slate-900">
                {label || placeholder}
              </Text>
            </View>

            <ScrollView
              className="flex-1"
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value || "__empty__"}
                    onPress={() => select(option.value)}
                    className={cn(
                      "flex-row items-center justify-between border-b border-slate-50 px-5 py-4 active:bg-slate-50",
                      isSelected && "bg-blue-50/60",
                    )}
                  >
                    <Text
                      className={cn(
                        "flex-1 text-sm",
                        isSelected
                          ? "font-semibold text-blue-600"
                          : "text-slate-700",
                      )}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Feather name="check" size={18} color="#2563eb" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
