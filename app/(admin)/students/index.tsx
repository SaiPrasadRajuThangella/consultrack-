import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Globe, GraduationCap } from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { useAuth } from "@/src/contexts/AuthContext";
import { BottomSheetSelect } from "@/src/components/BottomSheetSelect";
import { Text, TextInput } from "@/src/components/ui/Text";
import { getApiStatus, getDisplayStatus } from "@/src/lib/statusMapper";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type StudentRow = {
  id?: string | number;
  name?: string;
  mail?: string;
  profileCompletionRate?: number;
  passportNumber?: string;
  phno?: string | number;
  documentSubmited?: boolean;
  currentStatus?: string;
};

type CountryItem = {
  id: number;
  name: string;
};

// ─────────────────────────────────────────────
// CONSTANTS / HELPERS
// ─────────────────────────────────────────────

const APPLICATION_STATUSES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_RECEIVED",
  "OFFER_LETTER_CONDITIONAL",
  "OFFER_LETTER_UNCONDITIONAL",
  "VISA_APPROVED",
  "VISA_ACCEPTED",
  "VISA_REJECTED",
  "CASE_CLOSED",
];

const PAGE_SIZE = 10;
const STORAGE_COUNTRY = "last_selected_country";
const STORAGE_STATUS = "last_selected_status";
const STORAGE_PAGE = "students_list_page";

function asTrimmed(value: unknown, fallback = "") {
  if (value == null) return fallback;
  return String(value).trim() || fallback;
}

function studentInitial(name?: string) {
  const n = asTrimmed(name);
  return n ? n.charAt(0).toUpperCase() : "?";
}

function docStatusLabel(student: StudentRow) {
  return student.documentSubmited ? "Submitted" : "Pending";
}

function formatStatusLabel(status: string) {
  return getDisplayStatus(status).replace(/_/g, " ");
}

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function Students() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isSales = role === "SALES";
  const userId = user?.userId ?? user?.userid;

  const [processingFeeFilter, setProcessingFeeFilter] = useState<
    "all" | "paid" | "unpaid"
  >("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(
    isAdmin ? "all" : undefined,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [documentsFilter, setDocumentsFilter] = useState<
    "all" | "submitted" | "pending"
  >("all");
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prefsReady, setPrefsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted filters
  useEffect(() => {
    (async () => {
      try {
        const [savedCountry, savedStatus] = await Promise.all([
          AsyncStorage.getItem(STORAGE_COUNTRY),
          AsyncStorage.getItem(STORAGE_STATUS),
        ]);

        if (savedStatus && savedStatus !== "all") {
          setStatusFilter(getApiStatus(savedStatus));
        }

        if (
          savedCountry &&
          savedCountry !== "undefined" &&
          savedCountry !== "null" &&
          savedCountry !== ""
        ) {
          if (!isAdmin && savedCountry === "all") {
            setSelectedCountry(undefined);
          } else {
            setSelectedCountry(savedCountry);
          }
        } else {
          setSelectedCountry(isAdmin ? "all" : undefined);
        }
      } finally {
        setPrefsReady(true);
      }
    })();
  }, [isAdmin]);

  const isDocumentsFilterEnabled =
    isAdmin && selectedCountry === "all" && statusFilter === "all";

  useEffect(() => {
    if (!isDocumentsFilterEnabled && documentsFilter !== "all") {
      setDocumentsFilter("all");
    }
  }, [isDocumentsFilterEnabled, documentsFilter]);

  useEffect(() => {
    const fetchCountryList = async () => {
      try {
        let res;
        if (isSales || isAdmin) {
          res = await axiosInstance.get("/countries");
        } else {
          res = await axiosInstance.get(`/countries/user/${userId}`);
        }
        setCountries(res.data ?? []);
      } catch (err) {
        console.error("Failed to load countries", err);
      }
    };

    if (user) void fetchCountryList();
  }, [user, isAdmin, isSales, userId]);

  useEffect(() => {
    if (isSales) return;
    if (!isAdmin && countries.length === 1) {
      const singleCountry = countries[0].id.toString();
      setSelectedCountry(singleCountry);
      void AsyncStorage.setItem(STORAGE_COUNTRY, singleCountry);
    }
  }, [countries, isAdmin, isSales]);

  const buildListUrl = useCallback(() => {
    if (isSales) {
      return `/leads?page=${page - 1}&size=${PAGE_SIZE}`;
    }

    let url = `/students?pageNo=${page - 1}&size=${PAGE_SIZE}`;

    if (
      selectedCountry &&
      selectedCountry !== "all" &&
      selectedCountry !== "undefined"
    ) {
      url = `/dashboard/users/recentstudents/${selectedCountry}?pageNo=${page - 1}&size=${PAGE_SIZE}`;
    } else if (statusFilter !== "all") {
      url = `/students/filter/status/${getApiStatus(statusFilter)}?pageNo=${page - 1}&size=${PAGE_SIZE}`;
    } else if (isDocumentsFilterEnabled && documentsFilter !== "all") {
      const value = documentsFilter === "submitted" ? "true" : "false";
      url = `/students/filter/documents-submitted/${value}?pageNo=${page - 1}&size=${PAGE_SIZE}`;
    } else if (isDocumentsFilterEnabled && processingFeeFilter !== "all") {
      const value = processingFeeFilter === "paid" ? "true" : "false";
      url = `/students/filter/processing-fee-paid/${value}?pageNo=${page - 1}&size=${PAGE_SIZE}`;
    }

    return url;
  }, [
    page,
    selectedCountry,
    isSales,
    statusFilter,
    isDocumentsFilterEnabled,
    documentsFilter,
    processingFeeFilter,
  ]);

  const fetchStudents = useCallback(async () => {
    const res = await axiosInstance.get(buildListUrl());

    let content: StudentRow[] = [];

    if (role === "SALES") {
      content = (res.data.content || []).map(
        (lead: {
          id?: string | number;
          name?: string;
          mail?: string;
          phno?: string | number;
          passport?: string;
          status?: string;
        }) => ({
          id: lead.id,
          name: lead.name,
          mail: lead.mail,
          phno: String(lead.phno ?? ""),
          passportNumber: lead.passport ?? "",
          profileCompletionRate: 0,
          documentSubmited: false,
          currentStatus: lead.status,
        }),
      );
    } else {
      content = (res.data.content || []) as StudentRow[];
    }

    if (content.length === 0 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
      return;
    }

    setAllStudents(content);
    setTotalPages(res.data.totalPages || 1);
  }, [buildListUrl, page, role]);

  useEffect(() => {
    if (!user || !prefsReady) return;

    const isInvalidCountry =
      !selectedCountry ||
      selectedCountry === "all" ||
      selectedCountry === "undefined" ||
      selectedCountry === "null" ||
      selectedCountry === "";

    if (!isAdmin && !isSales && isInvalidCountry && statusFilter === "all") {
      setAllStudents([]);
      setLoading(false);
      return;
    }

    if (!isAdmin && !isSales && countries.length === 0) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchStudents();
      } catch (err) {
        console.error("Students fetch error", err);
        setError("Failed to load students.");
        setAllStudents([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    void load();
  }, [
    user,
    prefsReady,
    selectedCountry,
    countries.length,
    isSales,
    isAdmin,
    statusFilter,
    documentsFilter,
    processingFeeFilter,
    fetchStudents,
  ]);

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    void AsyncStorage.setItem(STORAGE_COUNTRY, val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    const apiStatus = val === "all" ? "all" : getApiStatus(val);
    setStatusFilter(apiStatus);
    void AsyncStorage.setItem(STORAGE_STATUS, apiStatus);
    setPage(1);
  };

  const handleDocumentsChange = (val: string) => {
    setDocumentsFilter(val as "all" | "submitted" | "pending");
    setPage(1);
  };

  const handleProcessingFeeChange = (val: string) => {
    setProcessingFeeFilter(val as "all" | "paid" | "unpaid");
    setPage(1);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();

    if (searchTerm.trim() === "") {
      setSearching(false);
      setLoading(true);
      try {
        await fetchStudents();
      } catch {
        setError("Failed to load students.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setSearching(true);
    setLoading(true);
    setError(null);

    try {
      if (isSales) {
        const res = await axiosInstance.get(
          `/leads/search?searchTerm=${encodeURIComponent(searchTerm)}&page=0&size=${PAGE_SIZE}`,
        );
        const content = (res.data.content || []).map(
          (lead: {
            id?: string | number;
            name?: string;
            mail?: string;
            phno?: string | number;
            passport?: string;
            status?: string;
          }) => ({
            id: lead.id,
            name: lead.name,
            mail: lead.mail,
            phno: String(lead.phno ?? ""),
            passportNumber: lead.passport ?? "",
            profileCompletionRate: 0,
            documentSubmited: false,
            currentStatus: lead.status,
          }),
        );
        setAllStudents(content);
        setTotalPages(res.data.totalPages || 1);
      } else {
        const res = await axiosInstance.get(
          `/dashboard/users/search?search=${encodeURIComponent(searchTerm)}`,
        );
        const content = Array.isArray(res.data)
          ? res.data
          : res.data.content || [];
        setAllStudents(content);
        setTotalPages(res.data.totalPages || 1);
      }
      setPage(1);
    } catch (err) {
      console.error("Search failed", err);
      setError("Could not find students.");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const openStudent = async (student: StudentRow) => {
    const id = student.id;
    if (!id) return;
    await AsyncStorage.setItem(STORAGE_PAGE, String(page));
    if (isSales) {
      router.push(`/leads/${id}` as never);
    } else {
      router.push(`/(admin)/students/${id}`);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchTerm("");
    void fetchStudents()
      .catch(() => setError("Failed to load students."))
      .finally(() => setRefreshing(false));
  }, [fetchStudents]);

  const selectedCountryName =
    selectedCountry === "all"
      ? "All Countries"
      : countries.find((c) => c.id.toString() === selectedCountry)?.name;

  const statusSelectValue =
    statusFilter === "all"
      ? "all"
      : (APPLICATION_STATUSES.find((s) => getApiStatus(s) === statusFilter) ??
        statusFilter);

  const showCountryPicker = isAdmin || countries.length > 1;
  const needsCountry =
    !isAdmin &&
    !isSales &&
    (selectedCountry === "all" || !selectedCountry) &&
    statusFilter === "all";

  const countryOptions = useMemo(() => {
    const opts = countries.map((c) => ({
      label: c.name,
      value: c.id.toString(),
    }));
    if (isAdmin) {
      return [{ label: "All Countries", value: "all" }, ...opts];
    }
    return opts;
  }, [countries, isAdmin]);

  const statusOptions = useMemo(
    () => [
      { label: "All Statuses", value: "all" },
      ...APPLICATION_STATUSES.map((s) => ({
        label: formatStatusLabel(s),
        value: s,
      })),
    ],
    [],
  );

  const documentsOptions = [
    { label: "All Docs", value: "all" },
    { label: "Submitted", value: "submitted" },
    { label: "Pending", value: "pending" },
  ];

  const processingFeeOptions = [
    { label: "Processing Fee", value: "all" },
    { label: "Paid", value: "paid" },
    { label: "Unpaid", value: "unpaid" },
  ];

  const countryDisabled =
    statusFilter !== "all" ||
    documentsFilter !== "all" ||
    processingFeeFilter !== "all";

  const statusDisabled =
    (selectedCountry !== "all" && selectedCountry !== undefined) ||
    documentsFilter !== "all" ||
    processingFeeFilter !== "all";

  const docsDisabled =
    !isDocumentsFilterEnabled || processingFeeFilter !== "all";

  const feeDisabled =
    !isDocumentsFilterEnabled || documentsFilter !== "all";

  if (!prefsReady && loading) {
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-base font-jakarta-medium text-slate-500">
          Directory
        </Text>
        <Text className="mt-0.5 text-3xl font-jakarta-bold tracking-tight text-slate-900">
          {isAdmin ? "All Students" : isSales ? "Leads" : "My Students"}
        </Text>
        <View className="mt-1 flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-sm text-slate-400">
            {isSales
              ? "Lead management."
              : isAdmin
                ? "Showing all student records across destinations and statuses."
                : selectedCountryName
                  ? `Showing students for ${selectedCountryName}.`
                  : "Select a country or status to load student records."}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/students/add")}
            className="items-center justify-center rounded-2xl bg-blue-500 px-3.5 py-2.5 active:bg-blue-600 active:opacity-90"
          >
            <GraduationCap size={18} color="#fff" strokeWidth={2} />
            <Text className="mt-0.5 text-[11px] font-semibold leading-tight text-white">
              Add
            </Text>
            <Text className="text-[11px] font-semibold leading-tight text-white">
              Student
            </Text>
          </Pressable>
        </View>

        {/* Search + filters */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Feather name="search" size={16} color="#94a3b8" />
            <TextInput
              placeholder={
                isSales
                  ? "Search leads by name..."
                  : "Search by name or passport..."
              }
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={() => void handleSearch()}
              returnKeyType="search"
              autoCapitalize="none"
              className="flex-1 py-3 text-sm text-slate-900"
            />
            <Pressable
              onPress={() => void handleSearch()}
              className="rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600"
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-xs font-semibold text-white">Search</Text>
              )}
            </Pressable>
          </View>

          {!isSales ? (
            <View className="mt-4 gap-3">
              {showCountryPicker ? (
                <BottomSheetSelect
                  label="Country"
                  placeholder="Country"
                  options={countryOptions}
                  value={selectedCountry ?? ""}
                  onChange={handleCountryChange}
                  disabled={countryDisabled}
                />
              ) : null}

              {isAdmin ? (
                <>
                  <BottomSheetSelect
                    label="Status"
                    placeholder="All Statuses"
                    options={statusOptions}
                    value={statusSelectValue}
                    onChange={handleStatusChange}
                    disabled={statusDisabled}
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <BottomSheetSelect
                        label="Documents"
                        placeholder="All Docs"
                        options={documentsOptions}
                        value={documentsFilter}
                        onChange={handleDocumentsChange}
                        disabled={docsDisabled}
                      />
                    </View>
                    <View className="flex-1">
                      <BottomSheetSelect
                        label="Processing Fee"
                        placeholder="Processing Fee"
                        options={processingFeeOptions}
                        value={processingFeeFilter}
                        onChange={handleProcessingFeeChange}
                        disabled={feeDisabled}
                      />
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {error ? (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-500">{error}</Text>
          </View>
        ) : null}

        {/* List container: header → spaced cards → pagination footer */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="border-b border-slate-200 px-4 py-3">
            <Text className="text-base font-semibold text-slate-900">
              {isSales ? "Leads" : "Students"}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-400">
              {allStudents.length === 0
                ? "No records"
                : `Page ${Math.min(page, totalPages || 1)} of ${totalPages || 1}`}
            </Text>
          </View>

          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-3 text-sm font-medium text-slate-600">
                Loading…
              </Text>
            </View>
          ) : needsCountry ? (
            <View className="items-center px-6 py-16">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Globe size={28} color="#3b82f6" />
              </View>
              <Text className="text-center text-base font-semibold text-slate-900">
                Please select a country
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-400">
                Choose a country or status from the filters above to load
                student applications.
              </Text>
            </View>
          ) : allStudents.length === 0 ? (
            <Text className="px-4 py-12 text-center text-sm text-slate-400">
              No students found.
            </Text>
          ) : (
            <View className="gap-3 p-3">
              {allStudents.map((student, idx) => {
                const rate = Math.min(
                  100,
                  Math.max(0, Number(student.profileCompletionRate) || 0),
                );
                const submitted = Boolean(student.documentSubmited);
                const initial = studentInitial(student.name);

                return (
                  <Pressable
                    key={`${student.id}-${idx}`}
                    onPress={() => void openStudent(student)}
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
                      {isSales ? (
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
                              {asTrimmed(student.name, "N/A")}
                            </Text>
                            <Text
                              className="mt-0.5 text-xs text-slate-400"
                              numberOfLines={1}
                            >
                              {asTrimmed(student.mail, "N/A")} ·{" "}
                              {asTrimmed(student.phno, "N/A")}
                            </Text>
                          </View>
                          <View className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                            <Text className="text-[10px] font-medium text-slate-600">
                              {asTrimmed(student.currentStatus, "N/A")}
                            </Text>
                          </View>
                        </View>
                      ) : (
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
                              {asTrimmed(student.name, "N/A")}
                            </Text>
                            <Text
                              className="mt-0.5 text-xs text-slate-400"
                              numberOfLines={1}
                            >
                              {asTrimmed(student.mail, "N/A")}
                            </Text>
                            <View className="mt-1.5 flex-row items-center gap-2">
                              <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <View
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${rate}%` }}
                                />
                              </View>
                              <Text className="text-[10px] font-medium tabular-nums text-slate-600">
                                {rate}%
                              </Text>
                            </View>
                            <Text
                              className="mt-1 text-[10px] text-slate-400"
                              numberOfLines={1}
                            >
                              {[
                                asTrimmed(
                                  student.passportNumber,
                                  "No passport",
                                ),
                                asTrimmed(student.phno, "No phone"),
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
                              {docStatusLabel(student)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!loading && !needsCountry && allStudents.length > 0 ? (
            <View className="flex-row items-center justify-between border-t border-slate-200 px-4 py-3">
              <Pressable
                disabled={page <= 1 || totalPages <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "rounded-lg border border-slate-200 bg-white px-3 py-2",
                  (page <= 1 || totalPages <= 1) && "opacity-40",
                )}
              >
                <Text className="text-xs font-medium text-slate-700">
                  Previous
                </Text>
              </Pressable>
              <Text className="text-xs text-slate-400">
                Page {Math.min(page, totalPages || 1)} of {totalPages || 1}
              </Text>
              <Pressable
                disabled={page >= totalPages || totalPages <= 1}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  "rounded-lg border border-slate-200 bg-white px-3 py-2",
                  (page >= totalPages || totalPages <= 1) && "opacity-40",
                )}
              >
                <Text className="text-xs font-medium text-slate-700">Next</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

    </View>
  );
}
