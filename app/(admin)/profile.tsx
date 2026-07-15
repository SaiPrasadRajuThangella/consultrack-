import { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { format, isValid } from "date-fns";
import {
  Calendar,
  Edit3,
  LogOut,
  Mail,
  MapPin,
  Save,
  Shield,
  User,
} from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { Text, TextInput } from "@/src/components/ui/Text";
import { useAuth } from "@/src/contexts/AuthContext";
import { cn } from "@/src/lib/utils";
import { router } from "expo-router";

type SessionUser = Record<string, unknown>;

function displayEmail(user: SessionUser) {
  return String(user.userMail ?? user.email ?? user.mail ?? "");
}

function displayName(user: SessionUser) {
  return String(user.userName ?? user.name ?? "");
}

function displayRole(user: SessionUser) {
  const r = String(user.role ?? user.userRole ?? "").toUpperCase();
  if (r === "ADMIN") return "Administrator";
  if (r === "SUPER_ADMIN") return "Super Administrator";
  if (r === "USER") return "User";
  return r || "—";
}

function roleBadgeLabel(user: SessionUser) {
  const r = String(user.role ?? user.userRole ?? "").toUpperCase();
  if (r === "ADMIN") return "ADMINISTRATOR";
  if (r === "SUPER_ADMIN") return "SUPER ADMIN";
  return r || "USER";
}

function accessLabel(user: SessionUser) {
  const r = String(user.role ?? user.userRole ?? "").toUpperCase();
  if (r === "ADMIN" || r === "SUPER_ADMIN") return "Full system access";
  return "Standard access";
}

function formatJoined(user: SessionUser) {
  const raw = user.createdAt ?? user.joinedAt;
  if (!raw) return null;
  try {
    const d = new Date(String(raw));
    if (!isValid(d)) return null;
    return `Joined ${format(d, "MMM yyyy")}`;
  } catch {
    return null;
  }
}

function formatLocation(user: SessionUser) {
  const loc = user.usercountry ?? user.country ?? user.city ?? user.location;
  return loc ? String(loc) : null;
}

const sqlInjectionRegex =
  /('|--|;|\/\*|\*\/|xp_|drop|select|insert|delete|update|truncate|alter)/i;

function validateName(name: string) {
  return /^[A-Z][a-zA-Z ]+$/.test(name);
}

function validatePassword(password: string) {
  if (!password) return true;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

function getUsageColor(percentage: number) {
  if (percentage >= 80) return "bg-red-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

type UsageData = {
  usedStudents?: number;
  maxStudents?: number;
  studentUsagePercentage?: number;
  remainingStudents?: number;
  usedUsers?: number;
  maxUsers?: number;
  userUsagePercentage?: number;
  remainingUsers?: number;
  usedStorageGB?: number;
  maxStorageGB?: number;
  storageUsagePercentage?: number;
  remainingStorageGB?: number;
};

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", password: "", phone: "" });

  const sessionUser = (user ?? {}) as SessionUser;

  useEffect(() => {
    setForm({
      name: displayName(sessionUser),
      password: "",
      phone: String(sessionUser.phno ?? sessionUser.phone ?? ""),
    });
  }, [user]);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setUsageLoading(true);
        const res = await axiosInstance.get("/api/validation/limits/usage");
        setUsageData(res.data);
      } catch {
        // Usage is optional — keep the profile usable without it
      } finally {
        setUsageLoading(false);
      }
    };
    void fetchUsage();
  }, []);

  const email = displayEmail(sessionUser);
  const joined = formatJoined(sessionUser);
  const location = formatLocation(sessionUser);
  const phone = String(sessionUser.phno ?? sessionUser.phone ?? "");
  const userId = Number(sessionUser.userId ?? sessionUser.userid);
  const logoUrl =
    typeof sessionUser.logoUrl === "string" ? sessionUser.logoUrl.trim() : "";

  const detailRows = useMemo(
    () =>
      (
        [
          { icon: Mail, text: email },
          { icon: Shield, text: accessLabel(sessionUser) },
          joined ? { icon: Calendar, text: joined } : null,
          location ? { icon: MapPin, text: location } : null,
        ] as const
      ).filter(Boolean) as { icon: typeof Mail; text: string }[],
    [email, sessionUser, joined, location],
  );

  const handleSave = async () => {
    const formattedName = form.name
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    if (sqlInjectionRegex.test(form.name) || sqlInjectionRegex.test(form.password)) {
      Alert.alert("Invalid input", "Invalid characters detected");
      return;
    }
    if (!validateName(formattedName)) {
      Alert.alert(
        "Invalid name",
        "Name must start with a capital letter and contain only letters",
      );
      return;
    }
    if (!validatePassword(form.password)) {
      Alert.alert(
        "Invalid password",
        "Password must be at least 8 characters with upper, lower, and a number",
      );
      return;
    }

    try {
      setSaving(true);
      await axiosInstance.put(
        `/consultancy/update-admin/${userId}`,
        {},
        {
          params: {
            adminName: formattedName,
            adminPassword: form.password || undefined,
            adminPhone: form.phone || undefined,
          },
        },
      );

      await updateUser({
        userName: formattedName,
        phno: form.phone,
        phone: form.phone,
      });
      setForm((f) => ({ ...f, name: formattedName, password: "" }));
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch {
      Alert.alert("Error", "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: displayName(sessionUser),
      password: "",
      phone: String(sessionUser.phno ?? sessionUser.phone ?? ""),
    });
    setIsEditing(false);
  };

  const startEditing = () => {
    setForm({
      name: displayName(sessionUser),
      password: "",
      phone: String(sessionUser.phno ?? sessionUser.phone ?? ""),
    });
    setIsEditing(true);
  };

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
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-medium font-jakarta tracking-tight text-slate-900">
          Profile
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          Manage your personal information and security.
        </Text>

        {/* Identity card */}
        <View className="mt-5 items-center rounded-2xl border border-slate-200 bg-white p-6">
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
              className="rounded-full"
              contentFit="cover"
              accessibilityLabel={`${displayName(sessionUser)} logo`}
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-slate-100"
              style={{ width: 96, height: 96 }}
            >
              <User size={40} color="#94a3b8" />
            </View>
          )}
          <Text className="mt-4 text-lg font-semibold text-slate-900">
            {displayName(sessionUser) || "—"}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500">{email || "—"}</Text>
          <View className="mt-3 rounded-full bg-blue-500 px-3 py-1">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-white">
              {roleBadgeLabel(sessionUser)}
            </Text>
          </View>

          <View className="mt-6 w-full gap-2.5">
            {detailRows.map(({ icon: Icon, text }) => (
              <View key={text} className="flex-row items-center gap-2">
                <Icon size={16} color="#94a3b8" />
                <Text className="flex-1 text-sm text-slate-500" numberOfLines={1}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal information */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">
              Personal Information
            </Text>
            {isEditing ? (
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-xs font-medium text-slate-600">Editing</Text>
              </View>
            ) : null}
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-xs font-medium text-slate-500">Full Name</Text>
              {isEditing ? (
                <TextInput
                  value={form.name}
                  onChangeText={(value) => {
                    if (!/^[a-zA-Z\s]*$/.test(value)) return;
                    setForm((f) => ({ ...f, name: value }));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                  placeholder="Full name"
                  placeholderTextColor="#94a3b8"
                />
              ) : (
                <Text className="py-2 text-sm font-medium text-slate-900">
                  {displayName(sessionUser) || "—"}
                </Text>
              )}
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-medium text-slate-500">Email</Text>
              <View className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                <Text className="text-sm text-slate-500">{email || "—"}</Text>
              </View>
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-medium text-slate-500">Phone</Text>
              {isEditing ? (
                <TextInput
                  value={form.phone}
                  onChangeText={(value) => {
                    if (!/^[0-9]*$/.test(value)) return;
                    if (value.length > 10) return;
                    setForm((f) => ({ ...f, phone: value }));
                  }}
                  keyboardType="number-pad"
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                  placeholder="Enter phone number"
                  placeholderTextColor="#94a3b8"
                />
              ) : (
                <View className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                  <Text className="text-sm text-slate-500">
                    {phone || "Not provided"}
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-medium text-slate-500">Role</Text>
              <View className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                <Text className="text-sm text-slate-500">
                  {displayRole(sessionUser)}
                </Text>
              </View>
            </View>

            {isEditing ? (
              <View>
                <Text className="mb-1.5 text-xs font-medium text-slate-500">
                  New Password (optional)
                </Text>
                <TextInput
                  value={form.password}
                  onChangeText={(value) => setForm((f) => ({ ...f, password: value }))}
                  secureTextEntry
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                  placeholder="Leave blank to keep current"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ) : null}
          </View>

          <View className="mt-5 flex-row justify-end gap-2">
            {isEditing ? (
              <>
                <Pressable
                  onPress={handleCancel}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
                >
                  <Text className="text-sm font-medium text-slate-700">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSave()}
                  disabled={saving}
                  className={cn(
                    "flex-row items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 active:bg-blue-600",
                    saving && "opacity-70",
                  )}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Save size={16} color="#fff" />
                  )}
                  <Text className="text-sm font-semibold text-white">
                    {saving ? "Saving…" : "Save changes"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={startEditing}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Edit3 size={16} color="#475569" />
                <Text className="text-sm font-medium text-slate-700">Edit profile</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Usage overview */}
        {usageLoading ? (
          <View className="mt-4 items-center rounded-2xl border border-slate-200 bg-white py-10">
            <ActivityIndicator color="#3b82f6" />
          </View>
        ) : usageData ? (
          <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="mb-5 text-base font-semibold text-slate-900">
              Usage Overview
            </Text>
            <View className="gap-5">
              {(
                [
                  {
                    label: "Students",
                    used: usageData.usedStudents,
                    max: usageData.maxStudents,
                    pct: usageData.studentUsagePercentage,
                    remaining: usageData.remainingStudents,
                  },
                  {
                    label: "Users",
                    used: usageData.usedUsers,
                    max: usageData.maxUsers,
                    pct: usageData.userUsagePercentage,
                    remaining: usageData.remainingUsers,
                  },
                  {
                    label: "Storage",
                    used: usageData.usedStorageGB,
                    max: usageData.maxStorageGB,
                    pct: usageData.storageUsagePercentage,
                    remaining: usageData.remainingStorageGB,
                    unit: "GB",
                  },
                ] as const
              ).map((row) => (
                <View key={row.label}>
                  <View className="mb-2 flex-row justify-between">
                    <Text className="font-medium text-slate-900">{row.label}</Text>
                    <Text className="text-sm text-slate-500">
                      {row.used ?? 0}
                      {"unit" in row && row.unit ? ` ${row.unit}` : ""} / {row.max ?? 0}
                      {"unit" in row && row.unit ? ` ${row.unit}` : ""}
                    </Text>
                  </View>
                  <View className="h-3 w-full rounded-full bg-slate-100">
                    <View
                      className={cn(
                        "h-3 rounded-full",
                        getUsageColor(Number(row.pct) || 0),
                      )}
                      style={{
                        width: `${Math.min(100, Number(row.pct) || 0)}%`,
                      }}
                    />
                  </View>
                  {row.remaining != null ? (
                    <Text className="mt-1 text-xs text-slate-500">
                      Remaining: {row.remaining}
                      {"unit" in row && row.unit ? ` ${row.unit}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-4 active:bg-red-100"
        >
          <LogOut size={18} color="#dc2626" />
          <Text className="text-sm font-semibold text-red-600">Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
