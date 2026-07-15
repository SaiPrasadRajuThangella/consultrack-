import { useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { Text, TextInput } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type CommissionRecord = {
  id?: number;
  commissionRecordId?: number;
  message?: string;
  amount?: number | string;
  createdAt?: string;
};

type PendingRecord = {
  id?: number;
  message?: string;
  amount?: number | string;
};

type VisaApplication = {
  id?: number | string;
  applicationId?: number | string;
  university?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
};

export type StudentCommissionData = {
  applications?: VisaApplication[];
  commission?: {
    totalAmount?: number;
    commissionId?: number;
    currency?: string;
    commissionRecords?: CommissionRecord[];
  };
};

export type StudentCommissionTabProps = {
  student: StudentCommissionData;
  onRefresh: () => void | Promise<void>;
};

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "د.إ",
  JPY: "¥",
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatRecordDate(raw?: string) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function currencySymbol(code: string) {
  return CURRENCY_SYMBOL_MAP[code] || `${code} `;
}

function MetricCard({
  label,
  value,
  valueClassName,
  icon: Icon,
  iconWrap,
  iconColor,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon: typeof CircleDollarSign;
  iconWrap: string;
  iconColor: string;
}) {
  return (
    <View className="mb-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className="text-[10px] font-semibold uppercase text-slate-400"
            style={{ letterSpacing: 1.2 }}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            className={cn(
              "text-2xl font-semibold tracking-tight text-slate-900",
              valueClassName,
            )}
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
    </View>
  );
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function StudentCommissionTab({
  student,
  onRefresh,
}: StudentCommissionTabProps) {
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [commAmount, setCommAmount] = useState("");
  const [editRecordId, setEditRecordId] = useState<number | null>(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [updatingRecord, setUpdatingRecord] = useState(false);

  const hasVisaAccepted = student.applications?.some(
    (app) => app.status === "VISA_ACCEPTED",
  );

  const appCurrency = student.commission?.currency || "INR";
  const symbol = currencySymbol(appCurrency);

  if (!hasVisaAccepted) {
    return (
      <View className="mt-4 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <CircleDollarSign size={28} color="#94a3b8" strokeWidth={2} />
        </View>
        <Text className="text-base font-semibold text-slate-900">
          No commission records found
        </Text>
        <Text className="mt-1 max-w-sm text-center text-sm text-slate-400">
          Commission tracking becomes available once a visa-accepted application
          exists for this student.
        </Text>
      </View>
    );
  }

  const totalReceivable = student.commission?.totalAmount || 0;
  const allRecords = student.commission?.commissionRecords || [];
  const amountPaid = allRecords.reduce(
    (sum, record) => sum + (Number(record.amount) || 0),
    0,
  );
  const pendingInList = pendingRecords.reduce(
    (sum, record) => sum + (Number(record.amount) || 0),
    0,
  );
  const remainingBalance = totalReceivable - amountPaid - pendingInList;

  const visaApps =
    student.applications?.filter((app) => app.status === "VISA_ACCEPTED") ?? [];

  const remainingForInput = (() => {
    const enteredExcludedPending = pendingRecords.reduce((sum, record) => {
      if (editRecordId && record.id === editRecordId) return sum;
      return sum + (Number(record.amount) || 0);
    }, 0);
    return totalReceivable - amountPaid - enteredExcludedPending;
  })();

  const enteredAmount = Number(commAmount || 0);
  const amountExceeds = enteredAmount > remainingForInput;

  function resetForm() {
    setShowForm(false);
    setMessage("");
    setCommAmount("");
    setEditRecordId(null);
  }

  function openAddForm() {
    setMessage("");
    setCommAmount("");
    setEditRecordId(null);
    setShowForm(true);
  }

  function openEditForm(record: CommissionRecord) {
    setEditRecordId(record.id || record.commissionRecordId || null);
    setMessage(record.message || "");
    setCommAmount(String(record.amount ?? ""));
    setShowForm(true);
  }

  function removePending(idx: number) {
    setPendingRecords((prev) => prev.filter((_, i) => i !== idx));
  }

  async function savePendingRecords() {
    try {
      setSavingCommission(true);
      const visaApp = student.applications?.find(
        (a) => a.status === "VISA_ACCEPTED",
      );
      if (!visaApp) {
        Alert.alert("Error", "No accepted visa application found.");
        return;
      }
      for (const record of pendingRecords) {
        await axiosInstance.post(`/commission/records`, {
          commissionId: student.commission?.commissionId,
          message: record.message,
          currency: student.commission?.currency || "INR",
          amount: Number(record.amount),
        });
      }
      setPendingRecords([]);
      await onRefresh();
      Alert.alert(
        "Success",
        `${pendingRecords.length} record${pendingRecords.length === 1 ? "" : "s"} saved successfully!`,
      );
    } catch {
      Alert.alert("Error", "Failed to save commission records.");
    } finally {
      setSavingCommission(false);
    }
  }

  async function handleSubmitForm() {
    if (!message.trim() || !commAmount) {
      Alert.alert("Validation", "Enter both message and amount");
      return;
    }

    if (enteredAmount > remainingForInput) {
      Alert.alert(
        "Validation",
        `Amount cannot exceed remaining balance of ${symbol}${remainingForInput}`,
      );
      return;
    }

    if (editRecordId) {
      try {
        setUpdatingRecord(true);
        await axiosInstance.put(`/commission/records/${editRecordId}`, {
          message: message.trim(),
          amount: Number(commAmount),
        });
        resetForm();
        await onRefresh();
        Alert.alert("Success", "Record updated");
      } catch {
        Alert.alert("Error", "Failed to update record");
      } finally {
        setUpdatingRecord(false);
      }
      return;
    }

    setPendingRecords((prev) => [
      ...prev,
      {
        id: Date.now(),
        message: message.trim(),
        amount: commAmount,
      },
    ]);
    setMessage("");
    setCommAmount("");
  }

  return (
    <View className="mt-4 gap-4">
      {/* Header */}
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-slate-900">
              Commission
            </Text>
            <Text className="mt-1 text-sm text-slate-400">
              Track receivables, payment history, and installment records.
            </Text>
          </View>
          <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Text className="text-[10px] font-medium uppercase text-slate-400">
              Base currency
            </Text>
            <Text className="text-sm font-semibold text-slate-900">
              {appCurrency}
            </Text>
          </View>
        </View>
      </View>

      {/* Metrics */}
      <View>
        <MetricCard
          label={`Receivable (${appCurrency})`}
          value={`${symbol}${totalReceivable}`}
          icon={CircleDollarSign}
          iconWrap="bg-sky-50"
          iconColor="#0284c7"
        />
        <MetricCard
          label={`Received (${appCurrency})`}
          value={`${symbol}${amountPaid}`}
          valueClassName="text-emerald-600"
          icon={CheckCircle2}
          iconWrap="bg-emerald-50"
          iconColor="#059669"
        />
        {pendingInList > 0 ? (
          <MetricCard
            label="Pending in list"
            value={`${symbol}${pendingInList}`}
            valueClassName="text-amber-600"
            icon={Wallet}
            iconWrap="bg-amber-50"
            iconColor="#d97706"
          />
        ) : null}
        <MetricCard
          label={`Remaining balance (${appCurrency})`}
          value={`${symbol}${remainingBalance}`}
          valueClassName="text-orange-600"
          icon={TrendingUp}
          iconWrap="bg-orange-50"
          iconColor="#ea580c"
        />
      </View>

      {/* Visa-accepted applications */}
      {visaApps.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="flex-row items-start gap-3 border-b border-slate-100 px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Building2 size={20} color="#0284c7" strokeWidth={2} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-slate-900">
                Visa-accepted applications
              </Text>
              <Text className="mt-0.5 text-sm text-slate-400">
                Universities linked to commission eligibility.
              </Text>
            </View>
          </View>
          {visaApps.map((app, idx) => {
            const uniCurrency = String(
              app.currency ?? student.commission?.currency ?? appCurrency,
            );
            const sym = currencySymbol(uniCurrency);
            const expected =
              app.amount != null && Number(app.amount) > 0
                ? `${sym}${Number(app.amount).toLocaleString()}`
                : "—";
            return (
              <View
                key={String(app.id ?? app.applicationId ?? idx)}
                className="border-b border-slate-100 px-4 py-3.5"
              >
                <Text
                  className="font-medium text-slate-900"
                  numberOfLines={1}
                >
                  {String(app.university ?? "—")}
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-3">
                  <Text className="text-xs text-slate-400">{uniCurrency}</Text>
                  <Text className="text-sm font-semibold text-slate-800">
                    {expected}
                  </Text>
                  <View className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5">
                    <Text className="text-[11px] font-medium text-emerald-700">
                      Visa accepted
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Pending records */}
      {pendingRecords.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
          <View className="border-b border-amber-100 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-semibold text-amber-800">
              Pending records (not saved yet)
            </Text>
            <Text className="mt-0.5 text-xs text-amber-700/80">
              Review and save these entries to add them to payment history.
            </Text>
          </View>
          {pendingRecords.map((record, idx) => (
            <View
              key={record.id ?? idx}
              className="flex-row items-center border-b border-slate-100 px-4 py-3.5"
            >
              <View className="min-w-0 flex-1">
                <Text className="font-medium text-slate-900" numberOfLines={1}>
                  {record.message || "—"}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-amber-700">
                    {symbol}
                    {record.amount}
                  </Text>
                  <View className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5">
                    <Text className="text-[10px] font-medium text-amber-800">
                      Pending save
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => removePending(idx)}
                hitSlop={8}
                className="ml-2 h-9 w-9 items-center justify-center rounded-lg active:bg-red-50"
              >
                <Trash2 size={18} color="#ef4444" strokeWidth={2} />
              </Pressable>
            </View>
          ))}
          <View className="p-4">
            <Pressable
              onPress={() => void savePendingRecords()}
              disabled={savingCommission}
              className={cn(
                "flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 active:bg-emerald-700",
                savingCommission && "opacity-60",
              )}
            >
              {savingCommission ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Save size={16} color="#fff" strokeWidth={2.5} />
              )}
              <Text className="text-sm font-semibold text-white">
                {savingCommission ? "Saving..." : "Save record"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Payment history */}
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <View className="border-b border-slate-100 px-4 py-4">
          <Text className="text-base font-semibold text-slate-900">
            Payment history
          </Text>
          <Text className="mt-0.5 text-sm text-slate-400">
            Recorded commission payments and installment entries.
          </Text>
        </View>

        {allRecords.length > 0 ? (
          allRecords.map((record, idx) => (
            <View
              key={record.id ?? record.commissionRecordId ?? idx}
              className="flex-row items-center border-b border-slate-100 px-4 py-3.5"
            >
              <View className="min-w-0 flex-1">
                <Text className="font-medium text-slate-900" numberOfLines={2}>
                  {record.message || "No Message Provided"}
                </Text>
                <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
                  <Text className="text-sm font-semibold text-emerald-600">
                    {symbol}
                    {record.amount}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {formatRecordDate(record.createdAt)}
                  </Text>
                  <View className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">
                    <Text className="text-[10px] font-medium text-emerald-700">
                      Recorded
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => openEditForm(record)}
                hitSlop={8}
                className="ml-2 h-9 w-9 items-center justify-center rounded-lg active:bg-blue-50"
              >
                <Pencil size={16} color="#2563eb" strokeWidth={2} />
              </Pressable>
            </View>
          ))
        ) : (
          <View className="mx-4 my-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
            <Text className="text-center text-sm font-medium text-slate-400">
              No payment history found.
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Add a commission payment record below to get started.
            </Text>
          </View>
        )}

        <View className="px-4 pb-4 pt-2">
          {showForm ? (
            <View className="gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-900">
                {editRecordId ? "Edit payment record" : "Add payment record"}
              </Text>

              <View>
                <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Message
                </Text>
                <TextInput
                  placeholder="e.g. Installment 1"
                  placeholderTextColor="#94a3b8"
                  value={message}
                  onChangeText={setMessage}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Amount ({symbol})
                </Text>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={commAmount}
                  onChangeText={(t) => setCommAmount(t.replace(/[^\d.]/g, ""))}
                  className={cn(
                    "rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900",
                    amountExceeds ? "border-red-500" : "border-slate-200",
                  )}
                />
                {amountExceeds ? (
                  <View className="mt-1.5 flex-row items-center gap-1">
                    <AlertCircle size={14} color="#dc2626" strokeWidth={2} />
                    <Text className="flex-1 text-xs font-semibold text-red-600">
                      Amount exceeds remaining balance ({symbol}
                      {remainingForInput})
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row gap-2 pt-1">
                <Pressable
                  onPress={() => void handleSubmitForm()}
                  disabled={updatingRecord}
                  className={cn(
                    "flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 active:bg-blue-600",
                    updatingRecord && "opacity-60",
                  )}
                >
                  {updatingRecord ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : editRecordId ? (
                    <Pencil size={14} color="#fff" strokeWidth={2.5} />
                  ) : (
                    <Plus size={14} color="#fff" strokeWidth={2.5} />
                  )}
                  <Text className="text-sm font-semibold text-white">
                    {editRecordId ? "Update" : "Add"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={resetForm}
                  className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50"
                >
                  <Text className="text-sm font-semibold text-slate-700">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={openAddForm}
              className="flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-4 active:bg-emerald-100"
            >
              <Plus size={16} color="#047857" strokeWidth={2.5} />
              <Text className="text-sm font-medium text-emerald-700">
                Add commission payment record
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
