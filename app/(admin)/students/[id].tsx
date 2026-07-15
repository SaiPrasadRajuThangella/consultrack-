import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react-native";
import axiosInstance from "@/src/api/axiosInstance";
import { useAuth } from "@/src/contexts/AuthContext";
import { BottomSheetSelect } from "@/src/components/BottomSheetSelect";
import {
  StudentDocumentsTab,
  pickDocumentFile,
  type PickedDocFile,
} from "@/src/components/StudentDocumentsTab";
import { StudentCommissionTab } from "@/src/components/StudentCommissionTab";
import { APP_HEADER_ROW_HEIGHT } from "@/src/components/AppHeader";
import { Text, TextInput } from "@/src/components/ui/Text";
import { getApiStatus, getDisplayStatus } from "@/src/lib/statusMapper";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────
// TYPES / HELPERS
// ─────────────────────────────────────────────

type SectionId =
  | "details"
  | "applications"
  | "documents"
  | "commission"
  | "comments"
  | "chat";

type Agent = { id: number; name: string };
type B2bPartner = { id: number; name: string };
type CountryOption = { id: number; name: string };
type University = { id: number; universityName?: string };
type Comment = {
  cmntId?: number | string;
  userName?: string;
  text?: string;
  createdAt?: string;
};
type ChatMessage = {
  msgId?: number | string;
  sentByName?: string;
  status?: string;
  text?: string;
};
type StudentDoc = {
  documentType?: string;
  url?: string;
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  size?: number;
};
type Application = {
  id?: number | string;
  university?: string;
  university_id?: number | null;
  course?: string;
  status?: string;
  intakeMonth?: string;
  intakeYear?: string | number;
  feesPaid?: string;
  amount?: number | string;
  agentCommissionAmount?: number | string;
  currency?: string;
  countryName?: string;
  countryname?: string;
  countryId?: number;
  payout?: number | string;
};
type AcademicForm = {
  universityId?: number | null;
  countryId?: number | string | null;
  course?: string;
  status?: string;
  feesPaid?: string;
  amount?: string;
  agentCommissionAmount?: string;
  currency?: string;
  intakeMonth?: string;
  intakeYear?: string;
};

type Student = Record<string, unknown> & {
  id?: number | string;
  studentId?: number | string;
  name?: string;
  mail?: string;
  phno?: string | number;
  passportNumber?: string;
  gender?: string;
  refusal?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  district?: string;
  referredBy?: string;
  agentId?: number | null;
  referredEmployeeId?: number | null;
  b2bID?: number | null;
  processingFeePaid?: boolean;
  processingAmount?: number;
  profileCompletionRate?: number;
  documentsSubmited?: boolean;
  documentSubmited?: boolean;
  currentStatus?: string;
  applications?: Application[];
  documentUrls?: StudentDoc[];
  comments?: Comment[];
  whatsappMessages?: ChatMessage[];
  commission?: {
    totalAmount?: number;
    commissionId?: number;
    currency?: string;
    commissionRecords?: Array<{
      id?: number;
      commissionRecordId?: number;
      message?: string;
      amount?: number | string;
      createdAt?: string;
    }>;
  };
};

const MANDATORY_DOCS = [
  "PASSPORT",
  "SSC",
  "INTER",
  "BACHELORS",
  "OFFICIAL TRANSCRIPTS",
  "LOR",
  "UPDATED RESUME",
];

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

const YES_NO_OPTIONS = [
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
];

const FEE_PAID_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const USER_ALLOWED_STATUSES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_RECEIVED",
  "OFFER_LETTER_CONDITIONAL",
  "OFFER_LETTER_UNCONDITIONAL",
  "VISA_APPROVED",
  "CASE_CLOSED",
];

const ADMIN_EXTRA_STATUSES = ["VISA_ACCEPTED", "VISA_REJECTED", "CASE_CLOSED"];

const ADMIN_ONLY_VIEW_STATUSES = ["VISA_ACCEPTED", "VISA_REJECTED", "CASE_CLOSED"];

const INTAKE_MONTHS = [
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

const CURRENCY_OPTIONS = [
  { label: "₹ INR", value: "INR" },
  { label: "$ USD", value: "USD" },
  { label: "€ EUR", value: "EUR" },
  { label: "£ GBP", value: "GBP" },
  { label: "A$ AUD", value: "AUD" },
  { label: "C$ CAD", value: "CAD" },
  { label: "S$ SGD", value: "SGD" },
  { label: "د.إ AED", value: "AED" },
  { label: "¥ JPY", value: "JPY" },
  { label: "Others", value: "OTHERS" },
];

const UNI_FEES_OPTIONS = [
  { label: "Not Paid", value: "NO" },
  { label: "Paid", value: "YES" },
];

const emptyAcademicForm = (): AcademicForm => ({
  universityId: null,
  countryId: null,
  course: "",
  status: "",
  amount: "",
  agentCommissionAmount: "",
  feesPaid: "NO",
  intakeMonth: "",
  intakeYear: "",
  currency: "",
});

function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeMail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function strField(value: unknown): string {
  return String(value ?? "").trim();
}

function toBool(value: unknown): boolean {
  return value === true || value === "true";
}

function asDisplay(value: unknown, fallback = "N/A") {
  const s = strField(value);
  return s || fallback;
}

function deriveReferredByType(
  student: Record<string, unknown>,
): "AGENT" | "EMPLOYEE" | "" {
  if (student.agentId != null && student.agentId !== "") return "AGENT";
  if (student.referredEmployeeId != null && student.referredEmployeeId !== "") {
    return "EMPLOYEE";
  }
  return "";
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1 text-xs font-medium text-slate-500">{children}</Text>
  );
}

function FieldValue({ children }: { children: string }) {
  return (
    <Text className="text-sm font-medium text-slate-900">{children}</Text>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View className="h-2 overflow-hidden rounded-full bg-slate-100">
      <View
        className="h-full rounded-full bg-blue-500"
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}

function AppFieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1.5 text-xs font-medium text-slate-500">{children}</Text>
  );
}

type ApplicationEditFieldsProps = {
  isAdmin: boolean;
  statuses: string[];
  countries: CountryOption[];
  universities: University[];
  academicForm: AcademicForm;
  setAcademicForm: (
    value: AcademicForm | ((prev: AcademicForm) => AcademicForm),
  ) => void;
  otherCurrency: string;
  setOtherCurrency: (v: string) => void;
  onCountryChange: (countryId: number) => void;
};

function ApplicationEditFields({
  isAdmin,
  statuses,
  countries,
  universities,
  academicForm,
  setAcademicForm,
  otherCurrency,
  setOtherCurrency,
  onCountryChange,
}: ApplicationEditFieldsProps) {
  const isRestricted =
    typeof academicForm.status === "string" &&
    ADMIN_ONLY_VIEW_STATUSES.includes(academicForm.status);

  const countryOptions = countries.map((c) => ({
    label: c.name,
    value: String(c.id),
  }));
  const universityOptions = universities.map((u) => ({
    label: u.universityName || "Unknown University",
    value: String(u.id),
  }));
  const statusOptions = statuses.map((s) => ({
    label: getDisplayStatus(s).replace(/_/g, " "),
    value: s,
  }));
  const monthOptions = INTAKE_MONTHS.map((m) => ({ label: m, value: m }));
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const year = (new Date().getFullYear() - i).toString();
    return { label: year, value: year };
  });

  return (
    <View className="gap-3">
      <BottomSheetSelect
        label="Country"
        placeholder="Select country"
        options={countryOptions}
        value={academicForm.countryId ? String(academicForm.countryId) : ""}
        onChange={(v) => {
          const countryId = Number(v);
          setAcademicForm((prev) => ({
            ...prev,
            countryId,
            universityId: null,
          }));
          onCountryChange(countryId);
        }}
      />

      <BottomSheetSelect
        label="University"
        placeholder={
          academicForm.countryId ? "Select university" : "Select country first"
        }
        options={universityOptions}
        value={
          academicForm.universityId != null
            ? String(academicForm.universityId)
            : ""
        }
        onChange={(v) =>
          setAcademicForm((prev) => ({
            ...prev,
            universityId: Number(v),
          }))
        }
        disabled={!academicForm.countryId}
      />

      <View>
        <AppFieldLabel>Course</AppFieldLabel>
        <TextInput
          placeholder="Course Name"
          placeholderTextColor="#94a3b8"
          value={String(academicForm.course ?? "")}
          onChangeText={(t) =>
            setAcademicForm((prev) => ({ ...prev, course: t }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
        />
      </View>

      <BottomSheetSelect
        label="Intake Month"
        placeholder="Select month"
        options={monthOptions}
        value={academicForm.intakeMonth ? String(academicForm.intakeMonth) : ""}
        onChange={(v) =>
          setAcademicForm((prev) => ({ ...prev, intakeMonth: v }))
        }
      />

      <BottomSheetSelect
        label="Intake Year"
        placeholder="Select year"
        options={yearOptions}
        value={academicForm.intakeYear ? String(academicForm.intakeYear) : ""}
        onChange={(v) =>
          setAcademicForm((prev) => ({ ...prev, intakeYear: v }))
        }
      />

      <BottomSheetSelect
        label="University Fees"
        placeholder="Fees status"
        options={UNI_FEES_OPTIONS}
        value={String(academicForm.feesPaid ?? "NO")}
        onChange={(v) =>
          setAcademicForm((prev) => ({ ...prev, feesPaid: v }))
        }
      />

      <BottomSheetSelect
        label="Status"
        placeholder={
          !isAdmin && isRestricted ? "Handled by Admin" : "Select status"
        }
        options={statusOptions}
        value={String(academicForm.status ?? "")}
        onChange={(v) =>
          setAcademicForm((prev) => ({ ...prev, status: v }))
        }
        disabled={!isAdmin && isRestricted}
      />

      {isAdmin && academicForm.status === "VISA_ACCEPTED" ? (
        <>
          <View>
            <AppFieldLabel>Commission Amount</AppFieldLabel>
            <TextInput
              placeholder="Enter amount"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={String(academicForm.amount ?? "")}
              onChangeText={(t) =>
                setAcademicForm((prev) => ({
                  ...prev,
                  amount: t.replace(/[^\d.]/g, ""),
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
            />
          </View>
          <View>
            <AppFieldLabel>Agent commission amount</AppFieldLabel>
            <TextInput
              placeholder="Enter agent commission"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={String(academicForm.agentCommissionAmount ?? "")}
              onChangeText={(t) =>
                setAcademicForm((prev) => ({
                  ...prev,
                  agentCommissionAmount: t.replace(/[^\d.]/g, ""),
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
            />
          </View>
          <BottomSheetSelect
            label="Currency"
            placeholder="Select currency"
            options={CURRENCY_OPTIONS}
            value={String(academicForm.currency ?? "")}
            onChange={(v) => {
              setAcademicForm((prev) => ({ ...prev, currency: v }));
              if (v !== "OTHERS") setOtherCurrency("");
            }}
          />
          {academicForm.currency === "OTHERS" ? (
            <View>
              <AppFieldLabel>Other currency</AppFieldLabel>
              <TextInput
                placeholder="MYR"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={otherCurrency}
                onChangeText={(t) => setOtherCurrency(t.toUpperCase())}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const isAdmin = user?.role === "ADMIN";
  const consultancyId = user?.consultancyId as number | string | undefined;
  const userId = user?.userId ?? user?.userid;

  const [student, setStudent] = useState<Student | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [b2bPartners, setB2bPartners] = useState<B2bPartner[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("details");

  const [editingStudent, setEditingStudent] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student>({});
  const [referredByType, setReferredByType] = useState<"AGENT" | "EMPLOYEE" | "">(
    "",
  );
  const baselineReady = useRef(false);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [editingAcademicId, setEditingAcademicId] = useState<
    number | string | null
  >(null);
  const [academicForm, setAcademicForm] = useState<AcademicForm>({});
  const [otherCurrency, setOtherCurrency] = useState("");
  const [savingAcademic, setSavingAcademic] = useState(false);

  const [docFiles, setDocFiles] = useState<Record<string, PickedDocFile | null>>(
    {},
  );
  const [extraDocs, setExtraDocs] = useState<string[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const statuses = isAdmin
    ? [
        ...USER_ALLOWED_STATUSES,
        ...ADMIN_EXTRA_STATUSES.filter((s) => !USER_ALLOWED_STATUSES.includes(s)),
      ]
    : USER_ALLOWED_STATUSES;

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const scrollToInputArea = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === "android" ? 100 : 50);
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (activeSection === "comments" || activeSection === "chat") {
        scrollToInputArea();
      }
    };

    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [activeSection, scrollToInputArea]);

  const fetchStudent = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      let res;
      if (isAdmin) {
        res = await axiosInstance.get(`/students/admin/${id}`);
      } else {
        const countryIds = Array.isArray(user?.countryId)
          ? (user.countryId as number[]).join(",")
          : user?.countryId ?? "";
        res = await axiosInstance.get(
          `/students/user/${id}?countryIds=${countryIds}`,
        );
      }

      const sanitized: Student = {
        ...res.data,
        applications: (res.data.applications ?? []).map((app: Application) => ({
          ...app,
        })),
      };
      setStudent(sanitized);
      setMessages(sanitized.whatsappMessages || []);
      if (!baselineReady.current) {
        setEditedStudent(sanitized);
      }
    } catch {
      setError("Failed to fetch student profile");
      setStudent(null);
    }
  }, [id, isAdmin, user?.countryId]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/agents");
      const data = res.data;
      if (Array.isArray(data)) setAgents(data);
      else if (Array.isArray(data?.data)) setAgents(data.data);
      else if (Array.isArray(data?.content)) setAgents(data.content);
      else setAgents([]);
    } catch {
      setAgents([]);
    }
  }, []);

  const fetchB2bPartners = useCallback(async () => {
    try {
      const res = await axiosInstance.get(
        "/b2b?page=0&size=100&sortBy=createdAt&direction=DESC",
      );
      setB2bPartners(res.data.content ?? []);
    } catch {
      setB2bPartners([]);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const endpoint = isAdmin
        ? "/countries"
        : `/countries/user/${userId}`;
      const res = await axiosInstance.get(endpoint);
      setCountries(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCountries([]);
    }
  }, [isAdmin, userId]);

  const fetchUniversitiesByCountry = useCallback(async (countryId: number) => {
    if (!countryId) {
      setUniversities([]);
      return;
    }
    try {
      const res = await axiosInstance.get(`/universities/country/${countryId}`);
      setUniversities(res.data || []);
    } catch {
      setUniversities([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudent(),
        fetchAgents(),
        fetchB2bPartners(),
        fetchCountries(),
      ]);
      setLoading(false);
    };
    void load();
  }, [fetchStudent, fetchAgents, fetchB2bPartners, fetchCountries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStudent();
    setRefreshing(false);
  }, [fetchStudent]);

  const beginEdit = () => {
    if (!student) return;
    setEditedStudent({
      ...student,
      phno: normalizePhone(student.phno),
      mail: normalizeMail(student.mail) || student.mail,
      state: strField(student.state),
      district: strField(student.district),
      processingFeePaid: toBool(student.processingFeePaid),
    });
    setReferredByType(deriveReferredByType(student));
    baselineReady.current = true;
    setEditingStudent(true);
  };

  const cancelEdit = () => {
    baselineReady.current = false;
    setReferredByType("");
    setEditingStudent(false);
    if (student) setEditedStudent(student);
  };

  const saveStudentDetails = async () => {
    if (!student || !id) return;
    if (!baselineReady.current) {
      Alert.alert("Edit session expired", "Please tap Edit profile again.");
      return;
    }
    if (toBool(editedStudent.processingFeePaid)) {
      if (
        !editedStudent.processingAmount ||
        Number(editedStudent.processingAmount) <= 0
      ) {
        Alert.alert(
          "Validation",
          "Processing Amount is required when fee is paid",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const studentUpdateData = {
        id: Number(student.id ?? id),
        name: editedStudent.name || "",
        mail: normalizeMail(editedStudent.mail),
        phno: normalizePhone(editedStudent.phno),
        passportNumber: editedStudent.passportNumber || "",
        gender: editedStudent.gender || "",
        refusal: editedStudent.refusal || "",
        address: editedStudent.address || "",
        city: editedStudent.city || "",
        pincode: editedStudent.pincode || "",
        referredBy: editedStudent.referredBy || "",
        b2bID: editedStudent.b2bID || null,
        state: editedStudent.state || "",
        district: editedStudent.district || "",
        agentId:
          referredByType === "AGENT" ? editedStudent.agentId || null : null,
        referredEmployeeId:
          referredByType === "EMPLOYEE"
            ? editedStudent.referredEmployeeId || null
            : null,
        processingFeePaid: toBool(editedStudent.processingFeePaid),
        processingAmount: Number(editedStudent.processingAmount || 0),
      };

      await axiosInstance.put(`/students/${id}`, studentUpdateData);
      baselineReady.current = false;
      setReferredByType("");
      setEditingStudent(false);
      await fetchStudent();
      Alert.alert("Success", "Profile updated");
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message,
            )
          : "Update failed";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const cancelAcademicEdit = () => {
    setEditingAcademicId(null);
    setAcademicForm({});
    setOtherCurrency("");
    setUniversities([]);
  };

  const startNewApplication = () => {
    setEditingAcademicId("NEW");
    setAcademicForm(emptyAcademicForm());
    setOtherCurrency("");
    setUniversities([]);
  };

  const startEditApplication = (app: Application) => {
    setEditingAcademicId(app.id ?? null);
    const rawMonth = String(app.intakeMonth ?? "");
    const rawYear = app.intakeYear ? String(app.intakeYear) : "";
    const countryId = app.countryId ? Number(app.countryId) : null;
    setAcademicForm({
      universityId: app.university_id ?? null,
      countryId: countryId ?? undefined,
      course: app.course ?? "",
      status:
        app.status === "N/A" || !app.status ? undefined : app.status,
      feesPaid: app.feesPaid || "NO",
      amount: app.amount != null ? String(app.amount) : "",
      agentCommissionAmount:
        app.agentCommissionAmount != null
          ? String(app.agentCommissionAmount)
          : app.payout != null
            ? String(app.payout)
            : "",
      currency: app.currency || student?.commission?.currency || "",
      intakeMonth: rawMonth && rawMonth !== "N/A" ? rawMonth : "",
      intakeYear: rawYear,
    });
    setOtherCurrency("");
    if (countryId) void fetchUniversitiesByCountry(countryId);
    else setUniversities([]);
  };

  const saveAcademicDetails = async () => {
    if (!id || !editingAcademicId) return;

    const isNew = editingAcademicId === "NEW";

    if (academicForm.status === "VISA_ACCEPTED") {
      if (!academicForm.amount || Number(academicForm.amount) <= 0) {
        Alert.alert(
          "Validation",
          "Commission amount is required when status is VISA ACCEPTED",
        );
        return;
      }
      if (!academicForm.agentCommissionAmount) {
        Alert.alert("Validation", "Agent commission amount is required");
        return;
      }
      const amount = Number(academicForm.amount);
      const agentCommissionAmount = Number(academicForm.agentCommissionAmount);
      if (agentCommissionAmount <= 0) {
        Alert.alert(
          "Validation",
          "Agent commission amount must be greater than 0",
        );
        return;
      }
      if (agentCommissionAmount > amount) {
        Alert.alert(
          "Validation",
          "Agent commission amount cannot be greater than commission amount",
        );
        return;
      }
      if (!academicForm.currency) {
        Alert.alert(
          "Validation",
          "Currency is required when status is VISA ACCEPTED",
        );
        return;
      }
      if (academicForm.currency === "OTHERS" && !otherCurrency.trim()) {
        Alert.alert("Validation", "Please enter currency");
        return;
      }
    }

    if (isNew && !academicForm.countryId) {
      Alert.alert("Validation", "Please select a country");
      return;
    }

    const payload: Record<string, unknown> = {
      university_id: academicForm.universityId,
      course: academicForm.course,
      status: getApiStatus(academicForm.status || "APPLICATION_SUBMITTED"),
      feesPaid: academicForm.feesPaid || "NO",
      intakeMonth: academicForm.intakeMonth || null,
      intakeYear: academicForm.intakeYear
        ? String(academicForm.intakeYear)
        : null,
      amount: academicForm.amount ? Number(academicForm.amount) : null,
      agentCommissionAmount: academicForm.agentCommissionAmount
        ? Number(academicForm.agentCommissionAmount)
        : null,
      currency:
        academicForm.currency === "OTHERS"
          ? otherCurrency
          : academicForm.currency || "INR",
    };
    if (isNew) payload.countryId = Number(academicForm.countryId);

    setSavingAcademic(true);
    try {
      if (isNew) {
        await axiosInstance.post(`/students/applications/${id}`, payload);
      } else {
        await axiosInstance.put(
          `/students/applications/${editingAcademicId}`,
          payload,
        );
      }
      cancelAcademicEdit();
      await fetchStudent();
      Alert.alert("Success", isNew ? "Application added" : "Application updated");
    } catch (err: unknown) {
      const errorData =
        err &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;
      if (errorData && typeof errorData === "object") {
        const messages = Object.values(errorData as Record<string, unknown>)
          .map((msg) => String(msg))
          .filter(Boolean);
        Alert.alert(
          "Error",
          messages.length > 0
            ? messages.join("\n")
            : "Failed to save application",
        );
      } else {
        Alert.alert("Error", "Failed to save application. Please try again.");
      }
    } finally {
      setSavingAcademic(false);
    }
  };

  const addComment = async () => {
    if (!commentText.trim() || !id) return;
    setPostingComment(true);
    try {
      await axiosInstance.post(`/students/comments/${id}`, {
        text: commentText.trim(),
        userId,
      });
      setCommentText("");
      await fetchStudent();
    } catch {
      Alert.alert("Error", "Could not post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !id) return;
    setSendingChat(true);
    try {
      const res = await axiosInstance.post(`/students/messages/${id}`, {
        studentId: Number(id),
        text: chatMessage.trim(),
      });
      setMessages(res.data);
      setChatMessage("");
    } catch {
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  };

  const openDoc = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document");
    }
  };

  const appendDocToFormData = (
    formData: FormData,
    file: PickedDocFile,
    documentType: string,
  ) => {
    formData.append("files", {
      uri: file.uri,
      name: file.name || "document",
      type: file.mimeType || "application/octet-stream",
    } as unknown as Blob);
    formData.append("documentType", documentType);
  };

  const checkStorageLimit = async (totalFileSizeBytes: number) => {
    if (!consultancyId) return true;
    try {
      const storageRes = await axiosInstance.get(
        `/api/validation/limits/storage/${consultancyId}`,
        { params: { newFileSizeBytes: totalFileSizeBytes } },
      );
      return storageRes.data === true;
    } catch {
      // If validation endpoint fails, allow upload attempt
      return true;
    }
  };

  const pickDocFile = async (docType: string) => {
    try {
      const picked = await pickDocumentFile();
      if (!picked) return;
      setDocFiles((prev) => ({ ...prev, [docType]: picked }));
    } catch {
      Alert.alert("Error", "Could not open file picker");
    }
  };

  const uploadDocuments = async (specificType?: string) => {
    if (!id) return;
    const typesToUpload = specificType
      ? [specificType]
      : Object.keys(docFiles).filter((key) => docFiles[key] !== null);

    if (typesToUpload.length === 0) {
      Alert.alert("No files", "No files selected");
      return;
    }

    setUploadingDocs(true);
    try {
      const formData = new FormData();
      let totalFileSizeBytes = 0;

      for (const type of typesToUpload) {
        const file = docFiles[type];
        if (!file) continue;
        appendDocToFormData(formData, file, type);
        totalFileSizeBytes += file.size ?? 0;
      }

      const allowed = await checkStorageLimit(totalFileSizeBytes);
      if (!allowed) {
        Alert.alert("Storage limit", "Storage limit exceeded");
        return;
      }

      await axiosInstance.post(`/documents/${id}`, formData);

      Alert.alert("Success", "Upload successful");
      setDocFiles((prev) => {
        const next = { ...prev };
        typesToUpload.forEach((t) => {
          delete next[t];
        });
        return next;
      });
      await fetchStudent();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Upload failed.";
      Alert.alert("Error", message);
    } finally {
      setUploadingDocs(false);
    }
  };

  const addDocumentUpload = async (name: string, file: PickedDocFile) => {
    if (!id) return false;
    setUploadingDocs(true);
    try {
      const formData = new FormData();
      appendDocToFormData(formData, file, name);

      const allowed = await checkStorageLimit(file.size ?? 0);
      if (!allowed) {
        Alert.alert("Storage limit", "Storage limit exceeded");
        return false;
      }

      await axiosInstance.post(`/documents/${id}`, formData);

      setExtraDocs((prev) =>
        prev.includes(name) ? prev : [...prev, name],
      );
      Alert.alert("Success", `${name} uploaded successfully`);
      await fetchStudent();
      return true;
    } catch {
      Alert.alert("Error", "Failed to upload the new document.");
      return false;
    } finally {
      setUploadingDocs(false);
    }
  };

  const agentName = useMemo(
    () => agents.find((a) => a.id === student?.agentId)?.name,
    [agents, student?.agentId],
  );

  const b2bName = useMemo(
    () => b2bPartners.find((p) => p.id === student?.b2bID)?.name,
    [b2bPartners, student?.b2bID],
  );

  const primaryApp = student?.applications?.[0];
  const statusRaw = student?.currentStatus || primaryApp?.status;
  const statusLabel = statusRaw
    ? getDisplayStatus(statusRaw).replace(/_/g, " ")
    : null;

  const locationLine = [student?.city, student?.district, student?.state]
    .filter(Boolean)
    .join(", ");

  const educationLine = [primaryApp?.course, primaryApp?.university]
    .filter(Boolean)
    .join(" — ");

  const intakeLine = [primaryApp?.intakeMonth, primaryApp?.intakeYear]
    .filter(Boolean)
    .join(" ");

  const profilePct =
    typeof student?.profileCompletionRate === "number"
      ? Math.min(100, Math.max(0, student.profileCompletionRate))
      : null;

  const docsSubmitted = Boolean(
    student?.documentsSubmited ?? student?.documentSubmited,
  );

  const docTypes = useMemo(() => {
    const uploaded =
      student?.documentUrls?.map((d) => d.documentType).filter(Boolean) ?? [];
    return Array.from(
      new Set([...MANDATORY_DOCS, ...extraDocs, ...uploaded]),
    ) as string[];
  }, [student?.documentUrls, extraDocs]);

  const uploadedDocCount =
    student?.documentUrls?.filter((d) => d.url)?.length ?? 0;
  const documentsProgress =
    docTypes.length > 0
      ? Math.round((uploadedDocCount / docTypes.length) * 100)
      : null;

  const chatEnabled =
    consultancyId === 1 ||
    consultancyId === 2604872627 ||
    String(consultancyId) === "1" ||
    String(consultancyId) === "2604872627";

  const sectionTabs: { id: SectionId; label: string }[] = [
    { id: "details", label: "Overview" },
    { id: "applications", label: "Applications" },
    { id: "documents", label: "Documents" },
    ...(isAdmin ? [{ id: "commission" as const, label: "Commission" }] : []),
    { id: "comments", label: "Internal Notes" },
    { id: "chat", label: "WhatsApp Chat" },
  ];

  const setEdited = (key: string, value: unknown) => {
    setEditedStudent((prev) => ({ ...prev, [key]: value }));
  };

  if (loading && !student) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-3 text-sm text-slate-500">Loading profile…</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View className="flex-1 bg-slate-50">
        <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 px-4 active:opacity-70"
            style={{ height: APP_HEADER_ROW_HEIGHT }}
          >
            <ArrowLeft size={18} color="#64748b" />
            <Text className="text-sm font-medium text-slate-600">
              Back to students
            </Text>
          </Pressable>
        </SafeAreaView>
        <View className="m-4 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-10">
          <Text className="text-sm text-red-500">
            {error ?? "Student not found"}
          </Text>
        </View>
      </View>
    );
  }

  const initial = (student.name || "?").charAt(0).toUpperCase();
  const source = editingStudent ? editedStudent : student;
  const isPaid = editingStudent
    ? String(editedStudent.processingFeePaid) === "true" ||
      editedStudent.processingFeePaid === true
    : student.processingFeePaid === true;

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 px-4 active:opacity-70"
          style={{ height: APP_HEADER_ROW_HEIGHT }}
        >
          <ArrowLeft size={18} color="#64748b" />
          <Text className="text-sm font-medium text-slate-600">
            Back to students
          </Text>
        </Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 20}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="p-4 pb-12"
          contentContainerStyle={{
            paddingBottom:
              48 + (Platform.OS === "android" ? keyboardHeight : 0),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Hero */}
          <LinearGradient
            colors={["#ffffff", "#f3f1fb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(226,232,240,0.8)",
              padding: 16,
              overflow: "hidden",
            }}
          >
            <View className="flex-row items-start gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                <Text className="text-2xl font-bold text-blue-700">
                  {initial}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-xl font-jakarta-bold tracking-tight text-slate-900"
                  numberOfLines={2}
                >
                  {asDisplay(student.name)}
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {statusLabel ? (
                    <View className="rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-0.5">
                      <Text className="text-[10px] font-medium text-emerald-800">
                        {statusLabel}
                      </Text>
                    </View>
                  ) : null}
                  {profilePct !== null ? (
                    <View className="rounded-full border border-blue-500/40 bg-blue-50 px-2.5 py-0.5">
                      <Text className="text-[10px] font-medium text-blue-700">
                        Profile {profilePct}%
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {(student.referredBy || agentName) && (
              <Text className="mt-3 text-sm text-slate-500">
                {[
                  student.referredBy
                    ? `Referred by ${student.referredBy}`
                    : null,
                  agentName ? `Agent (${agentName})` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}

            <View className="mt-4 gap-2.5">
              {student.mail ? (
                <View className="flex-row items-start gap-2.5">
                  <Mail size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    {String(student.mail)}
                  </Text>
                </View>
              ) : null}
              {student.phno ? (
                <View className="flex-row items-start gap-2.5">
                  <Phone size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    {String(student.phno)}
                  </Text>
                </View>
              ) : null}
              {locationLine ? (
                <View className="flex-row items-start gap-2.5">
                  <MapPin size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    {locationLine}
                  </Text>
                </View>
              ) : null}
              {educationLine ? (
                <View className="flex-row items-start gap-2.5">
                  <User size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    {educationLine}
                  </Text>
                </View>
              ) : null}
              {student.passportNumber ? (
                <View className="flex-row items-start gap-2.5">
                  <FileText size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    Passport — {String(student.passportNumber)}
                  </Text>
                </View>
              ) : null}
              {intakeLine ? (
                <View className="flex-row items-start gap-2.5">
                  <Calendar size={16} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-slate-700">
                    {intakeLine} intake
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-4 flex-row gap-2">
              {profilePct !== null ? (
                <View className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Profile
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-blue-600">
                    {profilePct}%
                  </Text>
                </View>
              ) : null}
              <View className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Documents
                </Text>
                <Text
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    docsSubmitted ? "text-emerald-600" : "text-amber-600",
                  )}
                >
                  {docsSubmitted ? "Submitted" : "Pending"}
                </Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Fee
                </Text>
                <Text className="mt-1 text-sm font-semibold text-slate-800">
                  {student.processingFeePaid ? "Paid" : "Unpaid"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Section tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2"
          >
            {sectionTabs.map((tab) => {
              const active = activeSection === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveSection(tab.id)}
                  className={cn(
                    "rounded-full px-4 py-2",
                    active
                      ? "bg-blue-500"
                      : "border border-slate-200 bg-white",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-white" : "text-slate-600",
                    )}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* OVERVIEW */}
          {activeSection === "details" ? (
            <View className="mt-4 gap-4">
              <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-semibold text-slate-900">
                      Personal information
                    </Text>
                    {editingStudent ? (
                      <View className="rounded-md bg-slate-100 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-slate-600">
                          Editing
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {!editingStudent ? (
                    <Pressable
                      onPress={beginEdit}
                      className="flex-row items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 active:bg-blue-100"
                    >
                      <Feather name="edit-2" size={14} color="#2563eb" />
                      <Text className="text-xs font-semibold text-blue-600">
                        Edit
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={cancelEdit}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5"
                      >
                        <Text className="text-xs font-semibold text-red-600">
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void saveStudentDetails()}
                        disabled={saving}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5"
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#059669" />
                        ) : (
                          <Text className="text-xs font-semibold text-emerald-700">
                            Save
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>

                <View className="gap-4 p-4">
                  {(
                    [
                      { key: "name", label: "Full Name", type: "text" },
                      { key: "mail", label: "Email Address", type: "email" },
                      { key: "phno", label: "Phone Number", type: "text" },
                      {
                        key: "passportNumber",
                        label: "Passport Number",
                        type: "text",
                      },
                      {
                        key: "gender",
                        label: "Gender",
                        type: "select",
                        options: GENDER_OPTIONS,
                      },
                      {
                        key: "refusal",
                        label: "Refusal",
                        type: "select",
                        options: YES_NO_OPTIONS,
                      },
                      { key: "address", label: "Address", type: "text" },
                      { key: "state", label: "State", type: "text" },
                      { key: "district", label: "District", type: "text" },
                      { key: "city", label: "City", type: "text" },
                      { key: "pincode", label: "Pincode", type: "text" },
                      {
                        key: "processingFeePaid",
                        label: "Processing Fee Paid",
                        type: "select",
                        options: FEE_PAID_OPTIONS,
                      },
                      {
                        key: "processingAmount",
                        label: "Total Processing Amount",
                        type: "number",
                      },
                    ] as const
                  ).map((field) => {
                    if (field.key === "processingAmount" && !isPaid) return null;

                    const rawValue = source[field.key];
                    let displayValue = asDisplay(rawValue);
                    if (field.key === "processingFeePaid") {
                      displayValue =
                        source.processingFeePaid === true
                          ? "Yes"
                          : source.processingFeePaid === false
                            ? "No"
                            : "N/A";
                    }

                    return (
                      <View key={field.key}>
                        <FieldLabel>{field.label}</FieldLabel>
                        {editingStudent ? (
                          field.type === "select" ? (
                            <BottomSheetSelect
                              label=""
                              placeholder="Select"
                              options={[...(field.options ?? [])]}
                              value={
                                field.key === "processingFeePaid"
                                  ? editedStudent.processingFeePaid === true
                                    ? "true"
                                    : editedStudent.processingFeePaid === false
                                      ? "false"
                                      : ""
                                  : String(editedStudent[field.key] ?? "")
                              }
                              onChange={(v) => {
                                if (field.key === "processingFeePaid") {
                                  setEdited("processingFeePaid", v === "true");
                                } else {
                                  setEdited(field.key, v);
                                }
                              }}
                            />
                          ) : (
                            <TextInput
                              value={String(editedStudent[field.key] ?? "")}
                              onChangeText={(t) => setEdited(field.key, t)}
                              keyboardType={
                                field.type === "number"
                                  ? "numeric"
                                  : field.type === "email"
                                    ? "email-address"
                                    : "default"
                              }
                              autoCapitalize={
                                field.type === "email" ? "none" : "sentences"
                              }
                              placeholder={`Enter ${field.label}`}
                              placeholderTextColor="#94a3b8"
                              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                            />
                          )
                        ) : (
                          <FieldValue>{displayValue}</FieldValue>
                        )}
                      </View>
                    );
                  })}

                  {/* Referred By */}
                  <View>
                    <FieldLabel>Referred By</FieldLabel>
                    {editingStudent ? (
                      <BottomSheetSelect
                        label=""
                        placeholder="Select referral type"
                        options={[
                          { label: "Agent", value: "AGENT" },
                          { label: "Employee", value: "EMPLOYEE" },
                        ]}
                        value={referredByType}
                        onChange={(v) => {
                          const next = v as "AGENT" | "EMPLOYEE";
                          setReferredByType(next);
                          if (next === "AGENT") {
                            setEdited("referredEmployeeId", null);
                          } else {
                            setEdited("agentId", null);
                          }
                        }}
                      />
                    ) : (
                      <FieldValue>
                        {student.agentId
                          ? "Agent"
                          : student.referredEmployeeId
                            ? "Employee"
                            : "N/A"}
                      </FieldValue>
                    )}
                  </View>

                  {(editingStudent
                    ? referredByType === "AGENT"
                    : !!student.agentId) && (
                    <View>
                      <FieldLabel>Agent</FieldLabel>
                      {editingStudent ? (
                        <BottomSheetSelect
                          label=""
                          placeholder="Select Agent"
                          options={agents.map((a) => ({
                            label: a.name,
                            value: String(a.id),
                          }))}
                          value={String(editedStudent.agentId ?? "")}
                          onChange={(v) => setEdited("agentId", Number(v))}
                        />
                      ) : (
                        <FieldValue>{agentName || "N/A"}</FieldValue>
                      )}
                    </View>
                  )}

                  <View>
                    <FieldLabel>B2B Partner</FieldLabel>
                    {editingStudent ? (
                      <BottomSheetSelect
                        label=""
                        placeholder="Select B2B Partner"
                        options={b2bPartners.map((p) => ({
                          label: p.name,
                          value: String(p.id),
                        }))}
                        value={String(editedStudent.b2bID ?? "")}
                        onChange={(v) => setEdited("b2bID", Number(v))}
                      />
                    ) : (
                      <FieldValue>{b2bName || "N/A"}</FieldValue>
                    )}
                  </View>
                </View>
              </View>

              {(profilePct !== null || documentsProgress !== null) && (
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
                  <Text className="mb-4 text-base font-semibold text-slate-900">
                    Application progress
                  </Text>
                  {profilePct !== null ? (
                    <View className="mb-4 gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm font-medium text-slate-700">
                          Profile
                        </Text>
                        <Text className="text-sm text-slate-400">
                          {profilePct}%
                        </Text>
                      </View>
                      <ProgressBar value={profilePct} />
                    </View>
                  ) : null}
                  {documentsProgress !== null ? (
                    <View className="mb-4 gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm font-medium text-slate-700">
                          Documents
                        </Text>
                        <Text className="text-sm text-slate-400">
                          {documentsProgress}%
                        </Text>
                      </View>
                      <ProgressBar value={documentsProgress} />
                    </View>
                  ) : null}
                  {(student.applications?.length ?? 0) > 0 ? (
                    <View className="gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm font-medium text-slate-700">
                          Applications
                        </Text>
                        <Text className="text-sm text-slate-400">
                          {student.applications!.length} record
                          {student.applications!.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <ProgressBar
                        value={Math.min(
                          100,
                          (student.applications!.filter((a) => a.status).length /
                            student.applications!.length) *
                            100,
                        )}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          {/* APPLICATIONS */}
          {activeSection === "applications" ? (
            <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <View className="flex-row items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-slate-900">
                    University applications
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-400">
                    Track stage, fees, and visa status.
                  </Text>
                </View>
                {!editingAcademicId ? (
                  <Pressable
                    onPress={startNewApplication}
                    className="flex-row items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2 active:bg-blue-600"
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text className="text-xs font-semibold text-white">
                      New
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {editingAcademicId === "NEW" ? (
                <View className="border-b border-dashed border-slate-200 bg-slate-50/80 px-4 py-4">
                  <View className="mb-3 flex-row items-center justify-between gap-2">
                    <Text className="text-sm font-semibold text-slate-900">
                      Add application
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => void saveAcademicDetails()}
                        disabled={savingAcademic}
                        className={cn(
                          "rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600",
                          savingAcademic && "opacity-60",
                        )}
                      >
                        {savingAcademic ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text className="text-xs font-semibold text-white">
                            Add
                          </Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={cancelAcademicEdit}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
                      >
                        <Text className="text-xs font-semibold text-slate-600">
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <ApplicationEditFields
                    isAdmin={isAdmin}
                    statuses={statuses}
                    countries={countries}
                    universities={universities}
                    academicForm={academicForm}
                    setAcademicForm={setAcademicForm}
                    otherCurrency={otherCurrency}
                    setOtherCurrency={setOtherCurrency}
                    onCountryChange={(countryId) =>
                      void fetchUniversitiesByCountry(countryId)
                    }
                  />
                </View>
              ) : null}

              {(student.applications?.length ?? 0) === 0 &&
              editingAcademicId !== "NEW" ? (
                <View className="items-center px-4 py-10">
                  <Text className="text-sm font-medium text-slate-700">
                    No applications yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-slate-400">
                    Add a university application to start tracking progress.
                  </Text>
                  <Pressable
                    onPress={startNewApplication}
                    className="mt-4 flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 active:bg-slate-50"
                  >
                    <Feather name="plus" size={14} color="#2563eb" />
                    <Text className="text-xs font-semibold text-blue-600">
                      New application
                    </Text>
                  </Pressable>
                </View>
              ) : (
                (student.applications ?? []).map((app, idx) => {
                  const appId = app.id;
                  const isEditing = editingAcademicId === appId;
                  const isRestrictedStatus = ADMIN_ONLY_VIEW_STATUSES.includes(
                    String(app.status ?? ""),
                  );
                  const countryLabel =
                    app.countryName || app.countryname || null;
                  const intakeLabel = [app.intakeMonth, app.intakeYear]
                    .filter(Boolean)
                    .join(" ");

                  if (isEditing) {
                    return (
                      <View
                        key={`${appId ?? idx}-edit`}
                        className="border-b border-slate-100 bg-slate-50/80 px-4 py-4"
                      >
                        <View className="mb-3 flex-row items-center justify-between gap-2">
                          <Text className="text-sm font-semibold text-slate-900">
                            Edit application
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => void saveAcademicDetails()}
                              disabled={savingAcademic}
                              className={cn(
                                "rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600",
                                savingAcademic && "opacity-60",
                              )}
                            >
                              {savingAcademic ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text className="text-xs font-semibold text-white">
                                  Save
                                </Text>
                              )}
                            </Pressable>
                            <Pressable
                              onPress={cancelAcademicEdit}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
                            >
                              <Text className="text-xs font-semibold text-slate-600">
                                Cancel
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                        <ApplicationEditFields
                          isAdmin={isAdmin}
                          statuses={statuses}
                          countries={countries}
                          universities={universities}
                          academicForm={academicForm}
                          setAcademicForm={setAcademicForm}
                          otherCurrency={otherCurrency}
                          setOtherCurrency={setOtherCurrency}
                          onCountryChange={(countryId) =>
                            void fetchUniversitiesByCountry(countryId)
                          }
                        />
                      </View>
                    );
                  }

                  return (
                    <View
                      key={`${appId ?? idx}`}
                      className="border-b border-slate-100 px-4 py-3.5"
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="min-w-0 flex-1">
                          <Text
                            className="font-semibold text-slate-900"
                            numberOfLines={1}
                          >
                            {asDisplay(app.university, "University N/A")}
                          </Text>
                          <Text
                            className="mt-0.5 text-sm text-slate-500"
                            numberOfLines={1}
                          >
                            {asDisplay(app.course, "Untitled course")}
                          </Text>
                          <Text className="mt-1 text-xs text-slate-400">
                            {[
                              appId != null ? `App #${appId}` : null,
                              countryLabel,
                              intakeLabel || null,
                              app.feesPaid
                                ? `Fees: ${app.feesPaid === "YES" ? "Paid" : "Not paid"}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </View>
                        <View className="items-end gap-2">
                          {!isAdmin &&
                          (isRestrictedStatus ||
                            app.status === "VISA_ACCEPTED") ? (
                            <View className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5">
                              <Text className="text-[10px] font-medium italic text-amber-700">
                                Handled by Admin
                              </Text>
                            </View>
                          ) : app.status ? (
                            <View className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                              <Text className="text-[10px] font-medium capitalize text-slate-600">
                                {getDisplayStatus(app.status).replace(
                                  /_/g,
                                  " ",
                                )}
                              </Text>
                            </View>
                          ) : null}
                          <Pressable
                            onPress={() => startEditApplication(app)}
                            className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white active:bg-slate-50"
                          >
                            <Feather name="edit-2" size={14} color="#64748b" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}

          {/* DOCUMENTS */}
          {activeSection === "documents" ? (
            <StudentDocumentsTab
              student={student}
              mandatoryDocTypes={MANDATORY_DOCS}
              extraDocs={extraDocs}
              files={docFiles}
              uploading={uploadingDocs}
              onPickFile={pickDocFile}
              onUploadDocuments={uploadDocuments}
              onViewDocument={(url) => void openDoc(url)}
              onAddDocumentUpload={addDocumentUpload}
            />
          ) : null}

          {/* COMMISSION */}
          {activeSection === "commission" && isAdmin ? (
            <StudentCommissionTab
              student={student}
              onRefresh={fetchStudent}
            />
          ) : null}

          {/* COMMENTS */}
          {activeSection === "comments" ? (
            <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-3 text-base font-semibold text-slate-900">
                Internal Notes
              </Text>
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: 280 }}
                className="mb-4"
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {(student.comments?.length ?? 0) === 0 ? (
                  <Text className="py-6 text-center text-sm text-slate-400">
                    No comments yet.
                  </Text>
                ) : (
                  student.comments!.map((c, idx) => (
                    <View
                      key={`${c.cmntId ?? idx}`}
                      className="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <View className="mb-1 flex-row items-center justify-between">
                        <Text className="text-xs font-semibold text-blue-600">
                          {c.userName ?? "User"}
                        </Text>
                        <Text className="text-[10px] text-slate-400">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                      <Text className="text-sm text-slate-800">{c.text}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                placeholderTextColor="#94a3b8"
                multiline
                onFocus={scrollToInputArea}
                className="min-h-[80px] rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
              />
              <Pressable
                onPress={() => void addComment()}
                disabled={postingComment || !commentText.trim()}
                className={cn(
                  "mt-3 items-center rounded-xl bg-blue-500 py-3 active:bg-blue-600",
                  (!commentText.trim() || postingComment) && "opacity-60",
                )}
              >
                {postingComment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Post Comment
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* CHAT */}
          {activeSection === "chat" ? (
            <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-3 text-base font-semibold text-slate-900">
                WhatsApp Chat
              </Text>
              {chatEnabled ? (
                <>
                  <ScrollView
                    nestedScrollEnabled
                    style={{ maxHeight: 320 }}
                    className="mb-3 rounded-xl border border-slate-200 p-3"
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                  >
                    {messages.length === 0 ? (
                      <Text className="py-10 text-center text-sm text-slate-400">
                        No messages yet.
                      </Text>
                    ) : (
                      messages.map((msg, idx) => (
                        <View
                          key={`${msg.msgId ?? idx}`}
                          className="mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-semibold text-slate-800">
                              {msg.sentByName ?? "User"}
                            </Text>
                            <Text className="text-[10px] text-slate-400">
                              {msg.status}
                            </Text>
                          </View>
                          <Text className="mt-1.5 text-sm text-slate-700">
                            {msg.text}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={chatMessage}
                      onChangeText={setChatMessage}
                      placeholder="Type a message..."
                      placeholderTextColor="#94a3b8"
                      onSubmitEditing={() => void sendChatMessage()}
                      onFocus={scrollToInputArea}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
                    />
                    <Pressable
                      onPress={() => void sendChatMessage()}
                      disabled={sendingChat || !chatMessage.trim()}
                      className={cn(
                        "rounded-xl bg-blue-500 px-4 py-3 active:bg-blue-600",
                        (!chatMessage.trim() || sendingChat) && "opacity-60",
                      )}
                    >
                      {sendingChat ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-sm font-semibold text-white">
                          Send
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <View className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Text className="font-semibold text-amber-800">
                    Chat Feature Not Available
                  </Text>
                  <Text className="mt-2 text-sm text-amber-700">
                    You do not have access to the Student Chat feature. Please
                    upgrade your plan to use this feature.
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
