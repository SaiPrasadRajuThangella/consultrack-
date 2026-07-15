import { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, parseISO, isValid } from "date-fns";
import { ChevronDown, Clock } from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { Text } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Activity {
  login: string;
  logout: string;
  hours: string;
}

interface LoginUser {
  userId: string;
  mail: string;
  role: string;
  name: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toDateString(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseDateString(value: string): Date {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

function formatSessionTime(value: string) {
  try {
    const d = new Date(value);
    if (!isValid(d)) return value;
    return format(d, "hh:mm a");
  } catch {
    return value;
  }
}

function formatDisplayDate(value: string) {
  if (!value) return "Any";
  try {
    return format(parseDateString(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

// ─────────────────────────────────────────────
// DATE FIELD
// ─────────────────────────────────────────────

function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Select date",
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pickerValue = value ? parseDateString(value) : new Date();

  const commit = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (selected) onChange(toDateString(selected));
    if (Platform.OS === "ios") {
      // keep open until Done — value updates live
    }
  };

  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-medium text-slate-500">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 active:bg-slate-50"
      >
        <Text
          className={cn(
            "text-sm",
            value ? "font-medium text-slate-900" : "text-slate-400",
          )}
          numberOfLines={1}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
      </Pressable>

      {optional && value ? (
        <Pressable onPress={() => onChange("")} className="mt-1 self-start">
          <Text className="text-xs font-medium text-blue-600">Clear</Text>
        </Pressable>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={commit}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="fade">
          <View className="flex-1 justify-end bg-black/40">
            <Pressable className="flex-1" onPress={() => setOpen(false)} />
            <View className="rounded-t-3xl bg-white px-4 pb-8 pt-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Pressable onPress={() => setOpen(false)}>
                  <Text className="text-sm font-medium text-slate-500">Cancel</Text>
                </Pressable>
                <Text className="text-sm font-semibold text-slate-900">{label}</Text>
                <Pressable onPress={() => setOpen(false)}>
                  <Text className="text-sm font-semibold text-blue-600">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={commit}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// USER ACTIVITY PANEL
// ─────────────────────────────────────────────

function UserActivityPanel({
  userId,
  cached,
  onCache,
}: {
  userId: string;
  cached?: Activity[];
  onCache: (id: string, data: Activity[]) => void;
}) {
  const [activityData, setActivityData] = useState<Activity[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached?.length);
  const [startDate, setStartDate] = useState(toDateString(new Date()));
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const today = new Date();

  const fetchActivity = useCallback(
    async (ignoreFilters = false) => {
      setLoading(true);
      setCurrentPage(1);
      let url = `/activity/users/${userId}`;

      if (!ignoreFilters && startDate) {
        url += `?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }

      try {
        const response = await axiosInstance.get(url);
        const data = response.data || [];
        const allActivities = data.flatMap(
          (day: { activities?: Activity[] }) => day.activities || [],
        );
        setActivityData(allActivities);
        onCache(userId, allActivities);
      } catch {
        setActivityData([]);
        onCache(userId, []);
      } finally {
        setLoading(false);
      }
    },
    [userId, startDate, endDate, onCache],
  );

  useEffect(() => {
    if (cached !== undefined) {
      setActivityData(cached);
      setLoading(false);
      return;
    }
    void fetchActivity(true);
    // Only load once per expand when not cached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = activityData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.max(1, Math.ceil(activityData.length / recordsPerPage));

  return (
    <View className="border-t border-slate-100 bg-slate-50/80 px-4 py-4">
      <View className="mb-3 flex-row gap-3">
        <DateField
          label="From"
          value={startDate}
          onChange={setStartDate}
          maximumDate={today}
        />
        <DateField
          label="To"
          value={endDate}
          onChange={setEndDate}
          minimumDate={startDate ? parseDateString(startDate) : undefined}
          maximumDate={today}
          placeholder="Optional"
          optional
        />
      </View>

      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => void fetchActivity()}
          disabled={loading}
          className={cn(
            "flex-1 items-center rounded-xl bg-blue-500 py-3 active:bg-blue-600",
            loading && "opacity-60",
          )}
        >
          <Text className="text-sm font-semibold text-white">Filter</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const todayStr = toDateString(new Date());
            setStartDate(todayStr);
            setEndDate("");
            void fetchActivity(true);
          }}
          disabled={loading}
          className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50"
        >
          <Text className="text-sm font-semibold text-slate-700">Reset</Text>
        </Pressable>
      </View>

      <View className="mb-3 flex-row items-center gap-2">
        <Clock size={16} color="#3b82f6" />
        <Text className="flex-1 text-sm font-semibold text-slate-800">
          Session History
        </Text>
        <Text className="text-xs text-slate-400">
          {activityData.length === 0
            ? "No records"
            : `${indexOfFirst + 1}–${Math.min(indexOfLast, activityData.length)} of ${activityData.length}`}
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : currentRecords.length > 0 ? (
        <>
          <View className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <View className="flex-row bg-slate-50 px-3 py-2.5">
              <Text className="w-[34%] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Login
              </Text>
              <Text className="w-[34%] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Logout
              </Text>
              <Text className="w-[32%] text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Duration
              </Text>
            </View>
            {currentRecords.map((act, idx) => {
              const isLive = !act.logout;
              return (
                <View
                  key={`${act.login}-${idx}`}
                  className="flex-row border-t border-slate-100 px-3 py-3"
                >
                  <Text className="w-[34%] text-sm text-slate-500">
                    {formatSessionTime(act.login)}
                  </Text>
                  <Text
                    className={cn(
                      "w-[34%] text-sm",
                      isLive
                        ? "font-semibold text-emerald-600"
                        : "text-slate-600",
                    )}
                  >
                    {act.logout ? formatSessionTime(act.logout) : "—"}
                  </Text>
                  <Text
                    className={cn(
                      "w-[32%] text-right text-sm font-medium",
                      isLive ? "text-emerald-600" : "text-blue-600",
                    )}
                  >
                    {act.hours}
                  </Text>
                </View>
              );
            })}
          </View>

          {totalPages > 1 ? (
            <View className="mt-3 flex-row items-center justify-end gap-2">
              <Pressable
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "rounded-lg border border-slate-200 bg-white px-3 py-2",
                  currentPage === 1 && "opacity-40",
                )}
              >
                <Text className="text-xs font-medium text-slate-700">Previous</Text>
              </Pressable>
              <Text className="text-xs text-slate-400">
                Page {currentPage} of {totalPages}
              </Text>
              <Pressable
                disabled={currentPage >= totalPages}
                onPress={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={cn(
                  "rounded-lg border border-slate-200 bg-white px-3 py-2",
                  currentPage >= totalPages && "opacity-40",
                )}
              >
                <Text className="text-xs font-medium text-slate-700">Next</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <View className="items-center rounded-xl border border-dashed border-slate-200 py-10">
          <Text className="text-sm text-slate-400">No records found.</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function LoginManagement() {
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [activityCache, setActivityCache] = useState<Record<string, Activity[]>>(
    {},
  );

  const handleCache = useCallback((id: string, data: Activity[]) => {
    setActivityCache((prev) => ({ ...prev, [id]: data }));
  }, []);

  const fetchLogins = useCallback(async () => {
    try {
      setError(null);
      const response = await axiosInstance.get("/activity/users");
      setUsers(response.data ?? []);
    } catch {
      setError("Failed to load employees.");
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogins();
  }, [fetchLogins]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setActivityCache({});
    setExpandedUserId(null);
    void fetchLogins();
  }, [fetchLogins]);

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
        <Text className="text-base font-jakarta-medium text-slate-500">
          Activity
        </Text>
        <Text className="mt-0.5 text-3xl font-jakarta-bold tracking-tight text-slate-900">
          Employee Activity
        </Text>
        <Text className="mt-1 text-sm text-slate-400">
          Login sessions and active duration per employee
        </Text>

        {error ? (
          <View className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-500">{error}</Text>
          </View>
        ) : null}

        <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
          {users.length === 0 && !error ? (
            <Text className="py-12 text-center text-sm text-slate-400">
              No employees found.
            </Text>
          ) : (
            <View className="gap-2">
              {users.map((user) => {
                const isOpen = expandedUserId === user.userId;
                const isAdmin = user.role === "ADMIN";

                return (
                  <View
                    key={user.userId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <Pressable
                      onPress={() =>
                        setExpandedUserId(isOpen ? null : user.userId)
                      }
                      className={cn(
                        "flex-row items-center gap-3 p-3.5 active:bg-slate-50",
                        isOpen && "bg-slate-50",
                      )}
                    >
                      <ChevronDown
                        size={16}
                        color="#94a3b8"
                        style={{
                          transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                        }}
                      />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="flex-1 text-sm font-semibold uppercase tracking-wide text-slate-900"
                            numberOfLines={1}
                          >
                            {user.name}
                          </Text>
                          <View
                            className={cn(
                              "rounded-md px-2 py-0.5",
                              isAdmin ? "bg-blue-600" : "bg-slate-100",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-[10px] font-semibold uppercase",
                                isAdmin ? "text-white" : "text-slate-700",
                              )}
                            >
                              {user.role}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="mt-0.5 text-sm text-slate-400"
                          numberOfLines={1}
                        >
                          {user.mail}
                        </Text>
                      </View>
                    </Pressable>

                    {isOpen ? (
                      <UserActivityPanel
                        userId={user.userId}
                        cached={activityCache[user.userId]}
                        onCache={handleCache}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
