import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheetSelect, type SelectOption } from "@/src/components/BottomSheetSelect";
import { Text } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

type DashboardFiltersProps = {
  countryOptions: SelectOption[];
  monthOptions: SelectOption[];
  yearOptions: SelectOption[];
  selectedCountry: string;
  intakeMonth: string;
  intakeYear: string;
  onCountryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  hasActiveFilters?: boolean;
  isLoading?: boolean;
};

export function DashboardFilters({
  countryOptions,
  monthOptions,
  yearOptions,
  selectedCountry,
  intakeMonth,
  intakeYear,
  onCountryChange,
  onMonthChange,
  onYearChange,
  onSearch,
  onReset,
  hasActiveFilters = false,
  isLoading = false,
}: DashboardFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const isDraftApplied =
    selectedCountry !== "all" || intakeMonth !== "" || intakeYear !== "";

  const canSearch = isDraftApplied && !isLoading;

  return (
    <View className="mt-4">
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 active:bg-slate-50"
      >
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Feather name="filter" size={16} color="#2563eb" />
          </View>
          <Text className="text-sm font-semibold text-slate-800">Filters</Text>
          {hasActiveFilters ? (
            <View className="h-2 w-2 rounded-full bg-blue-500" />
          ) : null}
          {isLoading ? <ActivityIndicator size="small" color="#3b82f6" /> : null}
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#94a3b8"
        />
      </Pressable>

      {expanded ? (
        <View className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
          <BottomSheetSelect
            label="Country"
            placeholder="All Countries"
            options={countryOptions}
            value={selectedCountry}
            onChange={onCountryChange}
          />

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <BottomSheetSelect
                label="Intake Month"
                placeholder="Select month"
                options={monthOptions}
                value={intakeMonth}
                onChange={onMonthChange}
              />
            </View>
            <View className="flex-1">
              <BottomSheetSelect
                label="Intake Year"
                placeholder="Select year"
                options={yearOptions}
                value={intakeYear}
                onChange={onYearChange}
              />
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onSearch}
              disabled={!canSearch}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5",
                canSearch ? "bg-blue-600 active:bg-blue-700" : "bg-slate-200",
              )}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather
                  name="search"
                  size={16}
                  color={canSearch ? "#fff" : "#94a3b8"}
                />
              )}
              <Text
                className={cn(
                  "font-semibold",
                  canSearch ? "text-white" : "text-slate-400",
                )}
              >
                {isLoading ? "Loading…" : "Search"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onReset}
              disabled={isLoading}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5",
                isLoading ? "opacity-50" : "active:bg-slate-100",
              )}
            >
              <Feather name="rotate-ccw" size={16} color="#64748b" />
              <Text className="font-semibold text-slate-600">Reset</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
