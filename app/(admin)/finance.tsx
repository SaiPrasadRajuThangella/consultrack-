import { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { KpiCard } from "@/src/components/KpiCard";
import { BottomSheetSelect } from "@/src/components/BottomSheetSelect";
import { Text } from "@/src/components/ui/Text";
import { chartTextStyle } from "@/src/theme/fonts";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type FinanceStats = {
  totalAgentsCommission: number;
  totalCommissionReceived: number;
  totalCommissionPending: number;
  totalAgentsCommissionGiven: number;
  totalAgentsCommissionPending: number;
  totalCommission: number;
  profitEarned: number;
};

type CashFlowEntry = {
  month: string;
  cashInflow: number;
  cashOutflow: number;
};

type StatConfig = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const chartWidth = Dimensions.get("window").width - 48;

function formatINR(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

function formatAxisLakh(value: number): string {
  if (value === 0) return "0L";
  return `${(value / 100_000).toFixed(0)}L`;
}

function buildStatCards(stats: FinanceStats): StatConfig[] {
  return [
    {
      key: "receivable",
      label: "Receivable",
      value: formatINR(stats.totalCommission),
      icon: IndianRupee,
      iconWrap: "bg-sky-100",
      iconColor: "#0ea5e9",
    },
    {
      key: "received",
      label: "Received",
      value: formatINR(stats.totalCommissionReceived),
      icon: CheckCircle2,
      iconWrap: "bg-emerald-100",
      iconColor: "#10b981",
    },
    {
      key: "pending",
      label: "Pending",
      value: formatINR(stats.totalCommissionPending),
      icon: AlertCircle,
      iconWrap: "bg-amber-100",
      iconColor: "#f59e0b",
    },
    {
      key: "payoutsDue",
      label: "Payouts Due",
      value: formatINR(stats.totalAgentsCommission),
      icon: Wallet,
      iconWrap: "bg-indigo-100",
      iconColor: "#6366f1",
    },
    {
      key: "profitEarned",
      label: "Profit Earned",
      value: formatINR(stats.profitEarned),
      icon: TrendingUp,
      iconWrap: "bg-emerald-100",
      iconColor: "#10b981",
    },
    {
      key: "agentPaid",
      label: "Agent Commission Paid",
      value: formatINR(stats.totalAgentsCommissionGiven),
      icon: Wallet,
      iconWrap: "bg-indigo-100",
      iconColor: "#6366f1",
    },
    {
      key: "agentPending",
      label: "Agent Commission Pending",
      value: formatINR(stats.totalAgentsCommissionPending),
      icon: AlertCircle,
      iconWrap: "bg-amber-100",
      iconColor: "#f59e0b",
    },
  ];
}

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function Finance() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCashFlow, setLoadingCashFlow] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [errorCashFlow, setErrorCashFlow] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [refreshing, setRefreshing] = useState(false);
  const [cashFlowTip, setCashFlowTip] = useState<{
    month: string;
    inflow: number;
    outflow: number;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setErrorStats(null);
      const res = await axiosInstance.get("/api/dashboard/finance/stats");
      console.log("[Finance] stats API response:", JSON.stringify(res.data, null, 2));
      setStats(res.data ?? null);
    } catch (err) {
      console.log("[Finance] stats API error:", err);
      setErrorStats("Failed to load finance stats.");
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchCashFlow = useCallback(async (year: string) => {
    try {
      setLoadingCashFlow(true);
      setErrorCashFlow(null);
      setCashFlowTip(null);
      const res = await axiosInstance.get(
        `/api/dashboard/finance/cash-flow?year=${year}`,
      );
      console.log(
        `[Finance] cash-flow API response (year=${year}):`,
        JSON.stringify(res.data, null, 2),
      );
      setCashFlow(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("[Finance] cash-flow API error:", err);
      setErrorCashFlow("Failed to load cash flow data.");
      setCashFlow([]);
    } finally {
      setLoadingCashFlow(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchCashFlow(selectedYear);
  }, [selectedYear, fetchCashFlow]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchCashFlow(selectedYear)]);
    setRefreshing(false);
  }, [fetchStats, fetchCashFlow, selectedYear]);

  const yearOptions = YEARS.map((y) => ({
    label: String(y),
    value: String(y),
  }));

  const inflowData = cashFlow.map((d) => ({
    value: d.cashInflow,
    label: d.month?.slice(0, 3) ?? "",
    onPress: () => {
      setCashFlowTip({
        month: d.month,
        inflow: d.cashInflow,
        outflow: d.cashOutflow,
      });
    },
  }));

  const outflowData = cashFlow.map((d) => ({
    value: d.cashOutflow,
  }));

  const maxCashValue = cashFlow.length
    ? Math.max(
        ...cashFlow.flatMap((d) => [d.cashInflow, d.cashOutflow]),
        0,
      )
    : 0;

  const initialLoading = loadingStats && !stats && !errorStats;

  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const statCards = stats ? buildStatCards(stats) : [];

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-base font-jakarta-medium text-slate-500">
          Analytics
        </Text>
        <Text className="mt-0.5 text-3xl font-jakarta-bold tracking-tight text-slate-900">
          Finance Intelligence
        </Text>
        <Text className="mt-1 text-sm text-slate-400">
          Receivables, payouts and cash-flow analytics
        </Text>

        {/* KPI Grid */}
        {loadingStats && !stats ? (
          <View className="mt-6 items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-3 text-sm font-medium text-slate-600">
              Loading stats…
            </Text>
          </View>
        ) : errorStats ? (
          <View className="mt-6 flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={16} color="#ef4444" />
            <Text className="flex-1 text-sm text-red-500">{errorStats}</Text>
          </View>
        ) : (
          <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
            {statCards.map((card) => (
              <View key={card.key} className="w-[48.5%]">
                <KpiCard
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  iconWrap={card.iconWrap}
                  iconColor={card.iconColor}
                />
              </View>
            ))}
          </View>
        )}

        {/* Cash Flow Chart */}
        <View className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-slate-800">
                Cash flow (INR)
              </Text>
              <Text className="mt-0.5 text-xs font-jakarta text-slate-400">
                Inflow vs outflow · {selectedYear}
              </Text>
            </View>
            {loadingCashFlow ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : null}
          </View>

          <View className="mb-3 w-36">
            <BottomSheetSelect
              label="Year"
              placeholder="Select year"
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </View>

          {loadingCashFlow ? (
            <View className="h-56 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : errorCashFlow ? (
            <View className="h-40 flex-row items-center justify-center gap-2">
              <AlertTriangle size={16} color="#f87171" />
              <Text className="text-sm text-red-400">{errorCashFlow}</Text>
            </View>
          ) : cashFlow.length === 0 ? (
            <Text className="py-10 text-center text-sm text-slate-400">
              No data available
            </Text>
          ) : (
            <>
              <Text className="mb-2 text-[11px] text-slate-400">
                Tap a point to view details
              </Text>
              <LineChart
                areaChart
                data={inflowData}
                data2={outflowData}
                height={220}
                width={chartWidth - 20}
                spacing={Math.max(
                  28,
                  (chartWidth - 60) / Math.max(cashFlow.length, 1),
                )}
                initialSpacing={12}
                color1="#6366f1"
                color2="#f97316"
                startFillColor1="#6366f1"
                startFillColor2="#f97316"
                startOpacity={0.25}
                endOpacity={0.02}
                thickness={3}
                hideDataPoints={false}
                dataPointsRadius={4}
                dataPointsColor1="#6366f1"
                dataPointsColor2="#f97316"
                focusedDataPointRadius={6}
                yAxisColor="transparent"
                xAxisColor="#e2e8f0"
                rulesColor="#e2e8f0"
                rulesType="dashed"
                yAxisTextStyle={chartTextStyle}
                xAxisLabelTextStyle={chartTextStyle}
                noOfSections={4}
                maxValue={maxCashValue > 0 ? maxCashValue * 1.1 : undefined}
                formatYLabel={(label: string) => formatAxisLakh(Number(label))}
                pointerConfig={{
                  pointerStripHeight: 180,
                  pointerStripColor: "#cbd5e1",
                  pointerStripWidth: 1,
                  strokeDashArray: [4, 4],
                  pointerColor: "#6366f1",
                  radius: 5,
                  pointerLabelWidth: 150,
                  pointerLabelHeight: 80,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  persistPointer: true,
                  pointerLabelComponent: (
                    items: { value?: number; label?: string }[],
                  ) => {
                    const month = items?.[0]?.label ?? "";
                    const inflow = Number(items?.[0]?.value ?? 0);
                    const outflow = Number(items?.[1]?.value ?? 0);
                    return (
                      <View className="min-w-[130px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                        <Text className="mb-1 text-xs font-semibold text-slate-800">
                          {month}
                        </Text>
                        <Text className="text-xs font-medium text-indigo-500">
                          Inflow : {formatINR(inflow)}
                        </Text>
                        <Text className="text-xs font-medium text-orange-500">
                          Outflow : {formatINR(outflow)}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
              {cashFlowTip ? (
                <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <Text className="text-xs font-semibold text-slate-800">
                    {cashFlowTip.month}
                  </Text>
                  <Text className="mt-1 text-xs font-medium text-indigo-600">
                    Inflow : {formatINR(cashFlowTip.inflow)}
                  </Text>
                  <Text className="text-xs font-medium text-orange-600">
                    Outflow : {formatINR(cashFlowTip.outflow)}
                  </Text>
                </View>
              ) : null}
              <View className="mt-3 flex-row flex-wrap justify-center gap-4">
                <LegendDot color="#6366f1" label="Inflow" />
                <LegendDot color="#f97316" label="Outflow" />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-xs font-jakarta text-slate-600">{label}</Text>
    </View>
  );
}
