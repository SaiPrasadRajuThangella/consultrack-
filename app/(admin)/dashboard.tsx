import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
} from "react-native";
import { Text } from "@/src/components/ui/Text";
import { DashboardFilters } from "@/src/components/DashboardFilters";
import { LineChart, PieChart } from "react-native-gifted-charts";
import { Feather } from "@expo/vector-icons";
import {
  Banknote,
  CheckCircle2,
  FileText,
  GraduationCap,
  IndianRupee,
  Stamp,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import axiosInstance from "@/src/api/axiosInstance";
import { KpiCard } from "@/src/components/KpiCard";
import { getDisplayStatus } from "@/src/lib/statusMapper";
import { cn } from "@/src/lib/utils";
import { chartTextStyle } from "@/src/theme/fonts";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type DashboardStats = {
  totalStudents?: number;
  offerLetterConditional?: number;
  offerLetterUnConditional?: number;
  countOfFeesPaid?: number;
  visaAccepted?: number;
  visaRejected?: number;
  caseClosed?: number;
  countProcessingFeePaid?: number;
  totalProcessingAmount?: number;
  intakeMonth?: string;
  intakeYear?: string;
  [key: string]: unknown;
};

type StudentRow = {
  id?: string | number;
  studentId?: string | number;
  name?: string;
  mail?: string;
  phno?: string;
  passportNumber?: string;
  profileCompletionRate?: number;
  documentSubmited?: boolean;
  currentStatus?: string;
  countryname?: string;
  countryName?: string;
  applications?: { countryName?: string }[];
};

type CountryItem = {
  id: number;
  name: string;
};

type PipelineTrendItem = {
  month: string;
  students: number;
  offers: number;
  visas: number;
};

type DestinationMixItem = {
  countryId: number;
  countryName: string;
  applicationCount: number;
};

type StatConfig = {
  key: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconWrap: string;
  iconColor: string;
  filterKey?: string;
};

interface DashboardMemory {
  intakeMonth: string;
  intakeYear: string;
  selectedCountryId: number | null;
  selectedCountry: string;
  isFiltered: boolean;
  students: StudentRow[];
  stats: DashboardStats;
  pageNo: number;
  totalPages: number;
  currentStatus: string | undefined;
  isSearchClicked: boolean;
}

let dashboardMemory: DashboardMemory | null = null;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function normalizeStudents(students: unknown): StudentRow[] {
  if (!Array.isArray(students)) return [];
  return (students as StudentRow[]).map((s) => ({
    ...s,
    id: s.id ?? s.studentId,
  }));
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function studentCountry(student: StudentRow) {
  if (student.countryname) return student.countryname;
  if (student.countryName) return student.countryName;
  return student.applications?.[0]?.countryName ?? "—";
}

function studentStatusLabel(student: StudentRow) {
  if (student.documentSubmited) return "submitted";
  const raw = student.currentStatus;
  if (!raw) return "pending";
  return getDisplayStatus(raw).replace(/_/g, " ").toLowerCase();
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("submit") || s.includes("accept") || s.includes("closed")) {
    return "border-emerald-500/40 bg-emerald-50";
  }
  if (s.includes("reject")) return "border-red-500/40 bg-red-50";
  return "border-amber-500/40 bg-amber-50";
}

function statusTextClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("submit") || s.includes("accept") || s.includes("closed")) {
    return "text-emerald-800";
  }
  if (s.includes("reject")) return "text-red-800";
  return "text-amber-800";
}

function buildStatCards(stats: DashboardStats): StatConfig[] {
  const offerLetters =
    (Number(stats.offerLetterUnConditional) || 0) +
    (Number(stats.offerLetterConditional) || 0);

  return [
    {
      key: "totalStudents",
      label: "Total Students",
      value: stats.totalStudents ?? 0,
      icon: GraduationCap,
      iconWrap: "bg-blue-100",
      iconColor: "#3b82f6",
      filterKey: "TOTAL",
    },
    {
      key: "offerLetters",
      label: "Offer Letters",
      value: offerLetters,
      icon: FileText,
      iconWrap: "bg-indigo-100",
      iconColor: "#6366f1",
      filterKey: "OFFER_LETTER_UNCONDITIONAL",
    },
    {
      key: "visaAccepted",
      label: "Visa Accepted",
      value: stats.visaAccepted ?? 0,
      icon: Stamp,
      iconWrap: "bg-emerald-100",
      iconColor: "#10b981",
      filterKey: "VISA_ACCEPTED",
    },
    {
      key: "visaRejected",
      label: "Visa Rejected",
      value: stats.visaRejected ?? 0,
      icon: XCircle,
      iconWrap: "bg-red-100",
      iconColor: "#ef4444",
      filterKey: "VISA_REJECTED",
    },
    {
      key: "feesPaid",
      label: "University Fees Paid",
      value: stats.countOfFeesPaid ?? 0,
      icon: Wallet,
      iconWrap: "bg-sky-100",
      iconColor: "#0ea5e9",
      filterKey: "UNIVERSITY_FEES_PAID",
    },
    {
      key: "caseClosed",
      label: "Case Closed",
      value: stats.caseClosed ?? 0,
      icon: CheckCircle2,
      iconWrap: "bg-emerald-100",
      iconColor: "#10b981",
      filterKey: "CASE_CLOSED",
    },
    {
      key: "processingCount",
      label: "Processing Fee Count",
      value: stats.countProcessingFeePaid ?? 0,
      icon: Banknote,
      iconWrap: "bg-amber-100",
      iconColor: "#f59e0b",
      filterKey: "PROCESSING_FEE_PAID_COUNT",
    },
    {
      key: "processingAmount",
      label: "Processing Amount",
      value: formatInr(Number(stats.totalProcessingAmount) || 0),
      icon: IndianRupee,
      iconWrap: "bg-blue-100",
      iconColor: "#3b82f6",
    },
  ];
}

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const YEARS = Array.from({ length: 6 }, (_, i) =>
  (new Date().getFullYear() - i).toString(),
);

const DONUT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#6b7280",
  "#06b6d4",
  "#f59e0b",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
];

const chartWidth = Dimensions.get("window").width - 48;

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentStudents, setRecentStudents] = useState<StudentRow[]>([]);

  const [countryList, setCountryList] = useState<CountryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [intakeMonth, setIntakeMonth] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [appliedCountryId, setAppliedCountryId] = useState<number | null>(null);
  const [appliedIntakeMonth, setAppliedIntakeMonth] = useState("");
  const [appliedIntakeYear, setAppliedIntakeYear] = useState("");
  const [isSearchClicked, setIsSearchClicked] = useState(false);

  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<StudentRow[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string | undefined>();
  const [pageNo, setPageNo] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [pipelineData, setPipelineData] = useState<PipelineTrendItem[]>([]);
  const [destinationData, setDestinationData] = useState<DestinationMixItem[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [pipelineTip, setPipelineTip] = useState<{
    month: string;
    students: number;
    offers: number;
    visas: number;
  } | null>(null);
  const [destinationTip, setDestinationTip] = useState<{
    countryName: string;
    applicationCount: number;
    color: string;
  } | null>(null);

  const isRestoringRef = useRef(false);

  const isDraftFilterSelected =
    selectedCountry !== "all" || intakeMonth !== "" || intakeYear !== "";

  const hasAppliedFilters =
    appliedCountryId !== null ||
    appliedIntakeMonth !== "" ||
    appliedIntakeYear !== "";

  // ── Admin dashboard load (default) ─────────

  const loadAdminDashboard = useCallback(async () => {
    const [statsRes, studentsRes] = await Promise.all([
      axiosInstance.get("/dashboard/stats"),
      axiosInstance.get("/students?pageNo=0&size=5"),
    ]);
    setStats(statsRes.data ?? {});
    setRecentStudents(normalizeStudents(studentsRes.data?.content ?? []));
    setIsFiltered(false);
    setFilteredStudents([]);
  }, []);

  // ── Country dashboard ──────────────────────

  const fetchAdminCountryDashboard = useCallback(
    async (countryId: number, month?: string, year?: string) => {
      let url = `/dashboard/stats/${countryId}`;
      if (month && year) url += `?intakeMonth=${month}&intakeYear=${year}`;

      const [statsRes, studentsRes] = await Promise.all([
        axiosInstance.get(url),
        axiosInstance.get(
          `/dashboard/users/recentstudents/${countryId}?pageNo=0&size=5`,
        ),
      ]);

      setStats(statsRes.data ?? {});
      setRecentStudents(normalizeStudents(studentsRes.data?.content ?? []));
      setIsFiltered(false);
      setFilteredStudents([]);
    },
    [],
  );

  // ── Intake filter ──────────────────────────

  const fetchIntakeDashboard = useCallback(
    async (month: string, year: string, countryId: number | null) => {
      let url = "";
      if (!countryId) {
        url = `/dashboard/stats/intake?intakeMonth=${month}&intakeYear=${year}`;
      } else {
        url = `/dashboard/stats/${countryId}?intakeMonth=${month}&intakeYear=${year}`;
      }

      const res = await axiosInstance.get(url);
      setStats(res.data?.stats ?? res.data ?? {});
      setRecentStudents(
        normalizeStudents(res.data?.content ?? res.data?.students ?? []),
      );
      setIsFiltered(false);
      setFilteredStudents([]);
    },
    [],
  );

  // ── KPI drill-down ─────────────────────────

  const fetchFilteredStudents = useCallback(
    async (status?: string, pageNumber = 0) => {
      setFilterLoading(true);
      try {
        setIsFiltered(true);
        setCurrentStatus(status);

        let url = `/students/admin-filter?pageNo=${pageNumber}&size=10`;

        if (appliedIntakeYear) url += `&intakeYear=${appliedIntakeYear}`;
        if (appliedIntakeMonth) {
          url += `&intakeMonth=${appliedIntakeMonth.toLowerCase()}`;
        }

        if (status === "UNIVERSITY_FEES_PAID") {
          url += `&universityFeesPaid=YES`;
        } else if (status === "PROCESSING_FEE_PAID_COUNT") {
          url += `&isProcessingFeePaid=true`;
        } else if (status === "OFFER_LETTER_UNCONDITIONAL") {
          const params = new URLSearchParams();
          params.append("pageNo", String(pageNumber));
          params.append("size", "10");
          if (appliedCountryId) {
            params.append("countryId", String(appliedCountryId));
          }
          if (appliedIntakeMonth) {
            params.append("intakeMonth", appliedIntakeMonth.toLowerCase());
          }
          if (appliedIntakeYear) {
            params.append("intakeYear", appliedIntakeYear);
          }

          const [conditionalRes, unconditionalRes] = await Promise.all([
            axiosInstance.get(
              `/students/admin-filter?${params.toString()}&status=OFFER_LETTER_CONDITIONAL`,
            ),
            axiosInstance.get(
              `/students/admin-filter?${params.toString()}&status=OFFER_LETTER_UNCONDITIONAL`,
            ),
          ]);

          const mergedStudents = [
            ...(conditionalRes.data?.content || []),
            ...(unconditionalRes.data?.content || []),
          ];

          setFilteredStudents(normalizeStudents(mergedStudents));
          setPageNo(pageNumber);
          setTotalPages(1);
          return;
        } else if (status && status !== "TOTAL") {
          url += `&status=${status}`;
        }

        if (appliedCountryId) url += `&countryId=${appliedCountryId}`;

        const res = await axiosInstance.get(url);
        setFilteredStudents(normalizeStudents(res.data?.content ?? []));
        setPageNo(pageNumber);
        setTotalPages(res.data?.totalPages ?? 0);
      } catch (err) {
        console.error("fetchFilteredStudents error", err);
        Alert.alert("Error", "Failed to fetch filtered students");
      } finally {
        setFilterLoading(false);
      }
    },
    [appliedIntakeYear, appliedIntakeMonth, appliedCountryId],
  );

  // ── Charts ─────────────────────────────────

  const fetchChartsWithApplied = useCallback(
    async (month: string, year: string, countryId: number | null) => {
      setChartsLoading(true);
      try {
        const chartYear = year || new Date().getFullYear().toString();

        const pipelineParams = new URLSearchParams({ year: chartYear });
        if (countryId) pipelineParams.set("countryId", String(countryId));

        const destParams = new URLSearchParams();
        if (countryId) destParams.set("countryId", String(countryId));
        if (year) destParams.set("intakeYear", year);
        if (month) destParams.set("intakeMonth", month);

        const [pipelineRes, destRes] = await Promise.all([
          axiosInstance.get(`/dashboard/pipeline-trend?${pipelineParams.toString()}`),
          axiosInstance.get(`/dashboard/destination-mix?${destParams.toString()}`),
        ]);

        setPipelineData(pipelineRes.data ?? []);
        setDestinationData(destRes.data ?? []);
      } catch (err) {
        console.error("Chart fetch error", err);
      } finally {
        setChartsLoading(false);
      }
    },
    [],
  );

  // ── Search / Reset ─────────────────────────

  const handleSearch = async () => {
    if (!isDraftFilterSelected) {
      Alert.alert("Filter required", "Please select at least one filter");
      return;
    }

    if ((intakeMonth && !intakeYear) || (!intakeMonth && intakeYear)) {
      Alert.alert("Incomplete filter", "Please select both Month and Year");
      return;
    }

    setAppliedCountryId(selectedCountryId);
    setAppliedIntakeMonth(intakeMonth);
    setAppliedIntakeYear(intakeYear);
    setIsSearchClicked(true);
    setPipelineTip(null);
    setDestinationTip(null);
    setFilterLoading(true);

    try {
      if (intakeMonth && intakeYear) {
        await fetchIntakeDashboard(intakeMonth, intakeYear, selectedCountryId);
      } else if (selectedCountry !== "all" && selectedCountryId) {
        await fetchAdminCountryDashboard(selectedCountryId);
      } else {
        await loadAdminDashboard();
      }
      await fetchChartsWithApplied(
        intakeMonth,
        intakeYear,
        selectedCountryId,
      );
    } catch (err) {
      console.error("Search error", err);
      Alert.alert("Error", "Failed to fetch filtered data");
    } finally {
      setFilterLoading(false);
    }
  };

  const handleReset = async () => {
    setSelectedCountry("all");
    setSelectedCountryId(null);
    setIntakeMonth("");
    setIntakeYear("");
    setAppliedCountryId(null);
    setAppliedIntakeMonth("");
    setAppliedIntakeYear("");
    setIsSearchClicked(false);
    setIsFiltered(false);
    setFilteredStudents([]);
    setPipelineTip(null);
    setDestinationTip(null);
    dashboardMemory = null;
    setFilterLoading(true);
    try {
      await loadAdminDashboard();
      await fetchChartsWithApplied("", "", null);
    } finally {
      setFilterLoading(false);
    }
  };

  // ── Initial load ───────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const countryRes = await axiosInstance.get("/countries");
      const countries: CountryItem[] = countryRes.data ?? [];
      setCountryList(countries);

      if (dashboardMemory) {
        isRestoringRef.current = true;
        setIntakeMonth(dashboardMemory.intakeMonth);
        setIntakeYear(dashboardMemory.intakeYear);
        setSelectedCountryId(dashboardMemory.selectedCountryId);
        setAppliedIntakeMonth(dashboardMemory.intakeMonth);
        setAppliedIntakeYear(dashboardMemory.intakeYear);
        setAppliedCountryId(dashboardMemory.selectedCountryId);
        setIsFiltered(dashboardMemory.isFiltered);
        setStats(dashboardMemory.stats);
        setPageNo(dashboardMemory.pageNo);
        setTotalPages(dashboardMemory.totalPages);
        setCurrentStatus(dashboardMemory.currentStatus);
        setIsSearchClicked(dashboardMemory.isSearchClicked);

        const matched = countries.find(
          (c) => c.id === dashboardMemory!.selectedCountryId,
        );
        setSelectedCountry(matched?.name ?? "all");

        if (dashboardMemory.isFiltered) {
          setFilteredStudents(dashboardMemory.students);
          setRecentStudents([]);
        } else {
          setRecentStudents(dashboardMemory.students);
          setFilteredStudents([]);
        }

        await fetchChartsWithApplied(
          dashboardMemory.intakeMonth,
          dashboardMemory.intakeYear,
          dashboardMemory.selectedCountryId,
        );

        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      } else {
        await loadAdminDashboard();
        await fetchChartsWithApplied("", "", null);
      }
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAdminDashboard, fetchChartsWithApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    dashboardMemory = null;
    void load();
  };

  const saveMemoryAndNavigate = (studentId: string | number) => {
    dashboardMemory = {
      intakeMonth,
      intakeYear,
      selectedCountryId,
      selectedCountry,
      isFiltered,
      students: isFiltered ? filteredStudents : recentStudents,
      stats,
      pageNo,
      totalPages,
      currentStatus,
      isSearchClicked,
    };
    router.push(`/(admin)/students/${studentId}`);
  };

  const onCountryChange = (value: string) => {
    if (isRestoringRef.current) return;
    setSelectedCountry(value);
    if (value === "all") {
      setSelectedCountryId(null);
    } else {
      const country = countryList.find(
        (c) => c.name.toUpperCase() === value.toUpperCase(),
      );
      setSelectedCountryId(country?.id ?? null);
    }
  };

  const statCards = buildStatCards(stats);

  const pipelineStudents = pipelineData.map((d) => ({
    value: d.students,
    label: d.month?.slice(0, 3) ?? "",
    onPress: () => {
      setDestinationTip(null);
      setPipelineTip({
        month: d.month,
        students: d.students,
        offers: d.offers,
        visas: d.visas,
      });
    },
  }));
  const pipelineOffers = pipelineData.map((d) => ({ value: d.offers }));
  const pipelineVisas = pipelineData.map((d) => ({ value: d.visas }));

  const pieData = destinationData.map((item, index) => {
    const color = DONUT_COLORS[index % DONUT_COLORS.length];
    return {
      value: item.applicationCount,
      color,
      text: item.countryName,
      onPress: () => {
        setPipelineTip(null);
        setDestinationTip({
          countryName: item.countryName,
          applicationCount: item.applicationCount,
          color,
        });
      },
    };
  });

  const countryOptions = [
    { label: "All Countries", value: "all" },
    ...countryList.map((c) => ({ label: c.name, value: c.name })),
  ];

  const monthOptions = MONTHS.map((m) => ({
    label: m.charAt(0) + m.slice(1).toLowerCase(),
    value: m,
  }));

  const yearOptions = YEARS.map((y) => ({ label: y, value: y }));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <Text className="text-3xl font-medium font-jakarta tracking-tight text-slate-900">
          Dashboard
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          Track students, applications, and consultancy performance at a glance.
        </Text>

        <DashboardFilters
          countryOptions={countryOptions}
          monthOptions={monthOptions}
          yearOptions={yearOptions}
          selectedCountry={selectedCountry}
          intakeMonth={intakeMonth}
          intakeYear={intakeYear}
          onCountryChange={onCountryChange}
          onMonthChange={setIntakeMonth}
          onYearChange={setIntakeYear}
          onSearch={handleSearch}
          onReset={handleReset}
          hasActiveFilters={hasAppliedFilters}
          isLoading={filterLoading}
        />

        <View className="relative mt-4">
          {filterLoading ? (
            <View className="items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-3 text-sm font-medium text-slate-600">
                Loading data…
              </Text>
            </View>
          ) : (
            <>
        {/* KPI Grid — exactly 2 cards per row, uniform size */}
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {statCards.map((card) => {
            const clickable =
              isSearchClicked && card.filterKey !== undefined && !filterLoading;
            return (
              <View key={card.key} className="w-[48.5%]">
                <KpiCard
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  iconWrap={card.iconWrap}
                  iconColor={card.iconColor}
                  clickable={clickable}
                  onPress={
                    clickable
                      ? () => fetchFilteredStudents(card.filterKey)
                      : undefined
                  }
                />
              </View>
            );
          })}
        </View>

        {/* Pipeline Trend */}
        <View className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-800">
                Pipeline Trend
              </Text>
              <Text className="mt-0.5 text-xs font-jakarta text-slate-400">
                New Applications, offers and visas over time
              </Text>
            </View>
            {chartsLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : null}
          </View>

          {pipelineData.length === 0 && !chartsLoading ? (
            <Text className="py-10 text-center text-sm text-slate-400">
              No pipeline data available.
            </Text>
          ) : chartsLoading ? (
            <View className="h-56 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <>
              <Text className="mb-2 text-[11px] text-slate-400">
                Tap a point to view details
              </Text>
              <LineChart
                areaChart
                data={pipelineStudents}
                data2={pipelineOffers}
                data3={pipelineVisas}
                height={220}
                width={chartWidth - 20}
                spacing={Math.max(28, (chartWidth - 60) / Math.max(pipelineData.length, 1))}
                initialSpacing={12}
                color1="#3b82f6"
                color2="#10b981"
                color3="#f97316"
                startFillColor1="#3b82f6"
                startFillColor2="#10b981"
                startFillColor3="#f97316"
                startOpacity={0.25}
                endOpacity={0.02}
                thickness={3}
                hideDataPoints={false}
                dataPointsRadius={4}
                dataPointsColor1="#3b82f6"
                dataPointsColor2="#10b981"
                dataPointsColor3="#f97316"
                focusedDataPointRadius={6}
                yAxisColor="transparent"
                xAxisColor="#e2e8f0"
                rulesColor="#e2e8f0"
                rulesType="dashed"
                yAxisTextStyle={chartTextStyle}
                xAxisLabelTextStyle={chartTextStyle}
                noOfSections={4}
                pointerConfig={{
                  pointerStripHeight: 180,
                  pointerStripColor: "#cbd5e1",
                  pointerStripWidth: 1,
                  strokeDashArray: [4, 4],
                  pointerColor: "#3b82f6",
                  radius: 5,
                  pointerLabelWidth: 150,
                  pointerLabelHeight: 95,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  persistPointer: true,
                  pointerLabelComponent: (items: { value?: number; label?: string }[]) => {
                    const month = items?.[0]?.label ?? "";
                    const students = Number(items?.[0]?.value ?? 0);
                    const offers = Number(items?.[1]?.value ?? 0);
                    const visas = Number(items?.[2]?.value ?? 0);
                    return (
                      <View className="min-w-[130px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                        <Text className="mb-1 text-xs font-semibold text-slate-800">
                          {month}
                        </Text>
                        <Text className="text-xs font-medium text-blue-500">
                          Applications : {students}
                        </Text>
                        <Text className="text-xs font-medium text-emerald-500">
                          Offers : {offers}
                        </Text>
                        <Text className="text-xs font-medium text-amber-500">
                          Visas : {visas}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
              {pipelineTip ? (
                <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <Text className="text-xs font-semibold text-slate-800">
                    {pipelineTip.month}
                  </Text>
                  <Text className="mt-1 text-xs font-medium text-blue-600">
                    Applications : {pipelineTip.students}
                  </Text>
                  <Text className="text-xs font-medium text-emerald-600">
                    Offers : {pipelineTip.offers}
                  </Text>
                  <Text className="text-xs font-medium text-amber-600">
                    Visas : {pipelineTip.visas}
                  </Text>
                </View>
              ) : null}
              <View className="mt-3 flex-row flex-wrap justify-center gap-4">
                <LegendDot color="#3b82f6" label="Applications" />
                <LegendDot color="#10b981" label="Offers" />
                <LegendDot color="#f97316" label="Visas" />
              </View>
            </>
          )}
        </View>

        {/* Destination Mix */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-800">
                Destination Mix
              </Text>
              <Text className="mt-0.5 text-xs font-jakarta text-slate-400">
                Applications by country
              </Text>
            </View>
            {chartsLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : null}
          </View>

          {destinationData.length === 0 && !chartsLoading ? (
            <Text className="py-10 text-center font-jakarta text-sm text-slate-400">
              No destination data available.
            </Text>
          ) : chartsLoading ? (
            <View className="h-48 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <View className="items-center">
              <Text className="mb-2 self-start text-[11px] text-slate-400">
                Tap a slice to view details
              </Text>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                strokeWidth={2}
                strokeColor="#fff"
                focusOnPress
                toggleFocusOnPress
                extraRadiusForFocused={8}
              />
              {destinationTip ? (
                <View className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: destinationTip.color }}
                    />
                    <Text className="text-xs font-semibold text-slate-800">
                      {destinationTip.countryName}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs font-medium text-slate-600">
                    Applications: {destinationTip.applicationCount}
                  </Text>
                </View>
              ) : null}
              <View className="mt-3 w-full flex-row flex-wrap">
                {destinationData.map((item, index) => (
                  <Pressable
                    key={item.countryId}
                    onPress={() => {
                      setPipelineTip(null);
                      setDestinationTip({
                        countryName: item.countryName,
                        applicationCount: item.applicationCount,
                        color: DONUT_COLORS[index % DONUT_COLORS.length],
                      });
                    }}
                    className="mb-2 w-1/2 flex-row items-center justify-between px-1"
                  >
                    <View className="mr-1 min-w-0 flex-1 flex-row items-center gap-2">
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[index % DONUT_COLORS.length],
                        }}
                      />
                      <Text
                        className="flex-1 text-[11px] font-jakarta text-slate-600"
                        numberOfLines={1}
                      >
                        {item.countryName}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-slate-800">
                      {item.applicationCount}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Student list */}
        {isFiltered ? (
          <View className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <View className="border-b border-slate-200 px-4 py-3">
              <Text className="font-semibold text-slate-900">Filtered Students</Text>
              <Text className="mt-0.5 text-xs text-slate-400">
                Showing results based on applied filters
              </Text>
            </View>

            {filteredStudents.length === 0 ? (
              <Text className="px-4 py-8 text-center text-sm text-slate-400">
                No students found for the selected filters.
              </Text>
            ) : (
              <>
                <View className="gap-3 p-3">
                  {filteredStudents.map((student) => {
                    const id = student.id ?? student.studentId;
                    const profilePct = Math.min(
                      100,
                      Math.max(0, Number(student.profileCompletionRate) || 0),
                    );
                    const initial = (
                      student.name?.trim().charAt(0) || "?"
                    ).toUpperCase();
                    const submitted = Boolean(student.documentSubmited);

                    return (
                      <Pressable
                        key={String(id)}
                        onPress={() => saveMemoryAndNavigate(id!)}
                        className="active:opacity-90 active:scale-[0.98]"
                      >
                        <LinearGradient
                          colors={["#ffffff", "#f3f1fb"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: "rgba(226,232,240,0.8)",
                            padding: 16,
                          }}
                        >
                          <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                              <Text className="font-semibold text-white">
                                {initial}
                              </Text>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className="font-medium text-slate-900"
                                numberOfLines={1}
                              >
                                {student.name}
                              </Text>
                              <Text
                                className="mt-0.5 text-xs text-slate-400"
                                numberOfLines={1}
                              >
                                {student.mail ?? "—"} · {student.phno ?? "—"}
                              </Text>
                              <View className="mt-1.5 flex-row items-center gap-2">
                                <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <View
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${profilePct}%` }}
                                  />
                                </View>
                                <Text className="text-[10px] font-medium tabular-nums text-slate-600">
                                  {profilePct}%
                                </Text>
                              </View>
                              <Text
                                className="mt-1 text-[10px] text-slate-400"
                                numberOfLines={1}
                              >
                                {[
                                  student.passportNumber || "No passport",
                                  student.phno ?? "No phone",
                                ].join(" · ")}
                              </Text>
                            </View>
                            <View
                              className={cn(
                                "rounded-full border px-2 py-0.5",
                                submitted
                                  ? "border-emerald-500/40 bg-emerald-50"
                                  : "border-amber-500/40 bg-amber-50",
                              )}
                            >
                              <Text
                                className={cn(
                                  "text-[10px] font-medium",
                                  submitted
                                    ? "text-emerald-800"
                                    : "text-amber-800",
                                )}
                              >
                                {submitted ? "Submitted" : "Pending"}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="flex-row items-center justify-between border-t border-slate-200 px-4 py-3">
                  <Pressable
                    disabled={pageNo === 0}
                    onPress={() =>
                      fetchFilteredStudents(currentStatus, pageNo - 1)
                    }
                    className={cn(
                      "rounded-lg border border-slate-200 px-3 py-2",
                      pageNo === 0 && "opacity-40",
                    )}
                  >
                    <Text className="text-sm text-slate-700">Previous</Text>
                  </Pressable>
                  <Text className="text-xs text-slate-400">
                    Page {pageNo + 1} of {Math.max(totalPages, 1)}
                  </Text>
                  <Pressable
                    disabled={pageNo >= totalPages - 1}
                    onPress={() =>
                      fetchFilteredStudents(currentStatus, pageNo + 1)
                    }
                    className={cn(
                      "rounded-lg border border-slate-200 px-3 py-2",
                      pageNo >= totalPages - 1 && "opacity-40",
                    )}
                  >
                    <Text className="text-sm text-slate-700">Next</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : (
          <View className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <View className="border-b border-slate-200 px-4 py-3">
              <Text className="font-semibold text-slate-900">Recent Students</Text>
              <Text className="mt-0.5 text-xs font-jakarta text-slate-400">
                Latest profiles added to the system
              </Text>
            </View>

            {recentStudents.length === 0 ? (
              <Text className="px-4 py-8 text-center font-jakarta text-sm text-slate-400">
                No recent students found.
              </Text>
            ) : (
              <View className="gap-3 p-3">
                {recentStudents.map((student) => {
                  const id = student.id ?? student.studentId;
                  const status = studentStatusLabel(student);
                  const profilePct = Math.min(
                    100,
                    Math.max(0, Number(student.profileCompletionRate) || 0),
                  );
                  const initial = (
                    student.name?.trim().charAt(0) || "?"
                  ).toUpperCase();

                  return (
                    <Pressable
                      key={String(id)}
                      onPress={() => saveMemoryAndNavigate(id!)}
                      className="active:opacity-90 active:scale-[0.98]"
                    >
                      <LinearGradient
                        colors={["#ffffff", "#f3f1fb"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: "rgba(226,232,240,0.8)",
                          padding: 16,
                        }}
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                            <Text className="font-semibold text-white">
                              {initial}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text
                              className="font-medium text-slate-900"
                              numberOfLines={1}
                            >
                              {student.name}
                            </Text>
                            <Text
                              className="mt-0.5 text-xs font-jakarta text-slate-400"
                              numberOfLines={1}
                            >
                              {student.mail ?? "—"}
                            </Text>
                            <View className="mt-1.5 flex-row items-center gap-2">
                              <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <View
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${profilePct}%` }}
                                />
                              </View>
                              <Text className="text-[10px] font-medium tabular-nums text-slate-600">
                                {profilePct}%
                              </Text>
                            </View>
                            <Text
                              className="mt-1 text-[10px] text-slate-400"
                              numberOfLines={1}
                            >
                              {studentCountry(student)}
                            </Text>
                          </View>
                          <View
                            className={cn(
                              "rounded-full border px-2 py-0.5",
                              statusBadgeClass(status),
                            )}
                          >
                            <Text
                              className={cn(
                                "text-[10px] font-medium capitalize",
                                statusTextClass(status),
                              )}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
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
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-jakarta text-slate-600">{label}</Text>
    </View>
  );
}
