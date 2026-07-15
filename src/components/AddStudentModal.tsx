import { useEffect, useMemo, useState } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { City, State } from "country-state-city";
import axiosInstance from "@/src/api/axiosInstance";
import { useAuth } from "@/src/contexts/AuthContext";
import { BottomSheetSelect } from "@/src/components/BottomSheetSelect";
import { Text, TextInput } from "@/src/components/ui/Text";
import { getApiStatus, getDisplayStatus } from "@/src/lib/statusMapper";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const USER_ALLOWED_STATUSES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_RECEIVED",
  "OFFER_LETTER_CONDITIONAL",
  "OFFER_LETTER_UNCONDITIONAL",
  "VISA_APPROVED",
];

const ADMIN_EXTRA_STATUSES = ["VISA_ACCEPTED", "VISA_REJECTED", "CASE_CLOSED"];

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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type BasicInfo = {
  name: string;
  mail: string;
  phno: string;
  gender: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  passportNumber: string;
  b2bId: string;
  processingFeeStatus: string;
  amount: string;
  referredByType: string;
  agentId: string;
  refusalStatus: string;
};

type Application = {
  countryId: string;
  universityId: string;
  course: string;
  status: string;
  intakeMonth: string;
  intakeYear: string;
  commissionAmount: string;
  commissionCurrency: string;
};

type Agent = {
  id: number;
  name: string;
};

type B2B = {
  id: number;
  name: string;
};

type University = {
  id: number;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: { id: number; name: string }[];
  onCreated?: () => void;
};

// ─────────────────────────────────────────────
// EMPTY TEMPLATES
// ─────────────────────────────────────────────

const emptyBasic = (): BasicInfo => ({
  name: "",
  mail: "",
  phno: "",
  gender: "",
  state: "",
  district: "",
  city: "",
  pincode: "",
  passportNumber: "",
  b2bId: "",
  processingFeeStatus: "",
  amount: "",
  referredByType: "",
  agentId: "",
  refusalStatus: "",
});

const emptyApplication = (): Application => ({
  countryId: "",
  universityId: "",
  course: "",
  status: "",
  intakeMonth: "",
  intakeYear: "",
  commissionAmount: "",
  commissionCurrency: "",
});

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function AddStudentModal({ open, onOpenChange, countries, onCreated }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const role = user?.role;
  const isSales = role === "SALES";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [basic, setBasic] = useState<BasicInfo>(emptyBasic());
  const [applications, setApplications] = useState<Application[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [b2bList, setB2bList] = useState<B2B[]>([]);
  const [universities, setUniversities] = useState<Record<string, University[]>>({});
  const [loading, setLoading] = useState(false);
  const [passportChecking, setPassportChecking] = useState(false);

  // Load agents and B2B when modal opens
  useEffect(() => {
    if (!open) {
      setBasic(emptyBasic());
      setApplications([]);
      setUniversities({});
      return;
    }

    if (isSales) return;

    const fetchData = async () => {
      try {
        const [agentsRes, b2bRes] = await Promise.all([
          axiosInstance.get("/agents").catch(() => ({ data: null })),
          axiosInstance
            .get("/b2b?page=0&size=100&sortBy=createdAt&direction=DESC")
            .catch(() => ({ data: null })),
        ]);

        const agentsData = agentsRes.data?.content ?? agentsRes.data?.data ?? agentsRes.data;
        setAgents(Array.isArray(agentsData) ? agentsData : []);

        const b2bData = b2bRes.data?.content ?? b2bRes.data;
        setB2bList(Array.isArray(b2bData) ? b2bData : []);
      } catch (err) {
        console.error("Failed to fetch agents/B2B", err);
      }
    };

    void fetchData();
  }, [open, isSales]);

  // State/District options
  const stateOptions = useMemo(() => {
    const states = State.getStatesOfCountry("IN");
    return [
      { label: "Select State", value: "" },
      ...states.map((s) => ({ label: s.name, value: s.isoCode })),
    ];
  }, []);

  const districtOptions = useMemo(() => {
    if (!basic.state) return [{ label: "Select District", value: "" }];
    const cities = City.getCitiesOfState("IN", basic.state);
    return [
      { label: "Select District", value: "" },
      ...cities.map((c) => ({ label: c.name, value: c.name })),
    ];
  }, [basic.state]);

  // Gender options
  const genderOptions = [
    { label: "Select Gender", value: "" },
    { label: "Male", value: "MALE" },
    { label: "Female", value: "FEMALE" },
  ];

  // Refusal options
  const refusalOptions = [
    { label: "Select Refusal Status", value: "" },
    { label: "Yes", value: "YES" },
    { label: "No", value: "NO" },
  ];

  // Processing fee options
  const processingFeeOptions = [
    { label: "Select Processing Fee Status", value: "" },
    { label: "Paid", value: "PAID" },
    { label: "Not Paid", value: "NOT_PAID" },
  ];

  // Referred by type options
  const referredByTypeOptions = [
    { label: "Select Referred By", value: "" },
    { label: "Agent", value: "AGENT" },
    { label: "Employee", value: "EMPLOYEE" },
  ];

  // Agent options
  const agentOptions = useMemo(
    () => [
      { label: "Select Agent", value: "" },
      ...agents.map((a) => ({ label: a.name, value: String(a.id) })),
    ],
    [agents],
  );

  // B2B options
  const b2bOptions = useMemo(
    () => [
      { label: "None", value: "" },
      ...b2bList.map((b) => ({ label: b.name, value: String(b.id) })),
    ],
    [b2bList],
  );

  // Status options
  const statusOptions = useMemo(() => {
    const allowedStatuses = isAdmin
      ? [...USER_ALLOWED_STATUSES, ...ADMIN_EXTRA_STATUSES]
      : USER_ALLOWED_STATUSES;
    return [
      { label: "Select Status", value: "" },
      ...allowedStatuses.map((s) => ({
        label: getDisplayStatus(s).replace(/_/g, " "),
        value: s,
      })),
    ];
  }, [isAdmin]);

  // Month options
  const monthOptions = [
    { label: "Select Month", value: "" },
    ...MONTHS.map((m) => ({ label: m, value: m })),
  ];

  // Year options
  const yearOptions = [
    { label: "Select Year", value: "" },
    ...YEARS.map((y) => ({ label: y, value: y })),
  ];

  // Country options for applications
  const countryOptions = useMemo(
    () => [
      { label: "Select Country", value: "" },
      ...countries.map((c) => ({ label: c.name, value: String(c.id) })),
    ],
    [countries],
  );

  // Currency options
  const currencyOptions = [
    { label: "Select Currency", value: "" },
    { label: "INR", value: "INR" },
    { label: "USD", value: "USD" },
    { label: "EUR", value: "EUR" },
    { label: "GBP", value: "GBP" },
    { label: "CAD", value: "CAD" },
    { label: "AUD", value: "AUD" },
  ];

  // Fetch universities when country changes
  const fetchUniversities = async (countryId: string) => {
    if (!countryId || universities[countryId]) return;
    try {
      const res = await axiosInstance.get(`/universities/country/${countryId}`);
      const unis = Array.isArray(res.data) ? res.data : [];
      setUniversities((prev) => ({ ...prev, [countryId]: unis }));
    } catch (err) {
      console.error("Failed to fetch universities", err);
      setUniversities((prev) => ({ ...prev, [countryId]: [] }));
    }
  };

  // Check passport uniqueness
  const checkPassport = async (passport: string) => {
    if (!passport || passport.length < 3) return;
    setPassportChecking(true);
    try {
      const res = await axiosInstance.get(`/students/check-passport/${passport}`);
      if (res.data === false) {
        Alert.alert("Error", "Passport number already exists");
        setBasic((prev) => ({ ...prev, passportNumber: "" }));
      }
    } catch (err) {
      console.error("Failed to check passport", err);
    } finally {
      setPassportChecking(false);
    }
  };

  // Validation
  const validateBasic = (): string | null => {
    if (!basic.name.trim()) return "Name is required";
    if (!/^[A-Za-z\s]+$/.test(basic.name)) return "Name must contain only letters";
    if (!basic.mail.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basic.mail)) return "Invalid email format";
    if (!basic.phno.trim()) return "Phone number is required";
    if (!/^\d+$/.test(basic.phno)) return "Phone number must be numeric";
    if (basic.phno.length > 10) return "Phone number must be max 10 digits";
    if (!basic.gender) return "Gender is required";
    if (!basic.state) return "State is required";
    if (!basic.district) return "District is required";
    if (!basic.city.trim()) return "City is required";
    if (!/^[A-Za-z\s]+$/.test(basic.city)) return "City must contain only letters";
    if (!basic.pincode.trim()) return "Pincode is required";
    if (!/^\d{6}$/.test(basic.pincode)) return "Pincode must be 6 digits";
    if (!basic.passportNumber.trim()) return "Passport number is required";
    if (!/^[A-Z0-9]+$/.test(basic.passportNumber))
      return "Passport must be uppercase letters and numbers";
    if (!basic.refusalStatus) return "Refusal status is required";

    if (!isSales) {
      if (!basic.processingFeeStatus) return "Processing fee status is required";
      if (basic.processingFeeStatus === "PAID" && !basic.amount.trim())
        return "Amount is required when paid";
      if (basic.amount && !/^\d+(\.\d+)?$/.test(basic.amount))
        return "Amount must be a valid number";
      if (!basic.referredByType) return "Referred by type is required";
      if (basic.referredByType === "AGENT" && !basic.agentId)
        return "Agent is required when referred by agent";
    }

    return null;
  };

  const validateApplications = (): string | null => {
    if (isSales) {
      if (applications.length === 0) return "At least one application is required";
      const firstApp = applications[0];
      if (!firstApp.countryId) return "Country is required for application";
      return null;
    }

    if (applications.length === 0) return null;

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      if (!app.countryId) return `Application ${i + 1}: Country is required`;
      if (!app.universityId) return `Application ${i + 1}: University is required`;
      if (!app.course.trim()) return `Application ${i + 1}: Course is required`;
      if (!app.status) return `Application ${i + 1}: Status is required`;
      if (!app.intakeMonth) return `Application ${i + 1}: Intake month is required`;
      if (!app.intakeYear) return `Application ${i + 1}: Intake year is required`;

      if (isAdmin && app.status === "VISA_ACCEPTED") {
        if (!app.commissionAmount.trim())
          return `Application ${i + 1}: Commission amount required for VISA_ACCEPTED`;
        if (!/^\d+(\.\d+)?$/.test(app.commissionAmount))
          return `Application ${i + 1}: Commission amount must be a valid number`;
        if (!app.commissionCurrency)
          return `Application ${i + 1}: Commission currency required for VISA_ACCEPTED`;
      }
    }

    return null;
  };

  // Submit handler
  const handleSubmit = async () => {
    const basicError = validateBasic();
    if (basicError) {
      Alert.alert("Validation Error", basicError);
      return;
    }

    const appsError = validateApplications();
    if (appsError) {
      Alert.alert("Validation Error", appsError);
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: basic.name.trim(),
        mail: basic.mail.trim(),
        phno: basic.phno.trim(),
        gender: basic.gender,
        state: basic.state,
        district: basic.district,
        city: basic.city.trim(),
        pincode: basic.pincode.trim(),
        passportNumber: basic.passportNumber.trim().toUpperCase(),
        refusalStatus: basic.refusalStatus,
      };

      if (!isSales) {
        payload.b2bId = basic.b2bId ? Number(basic.b2bId) : null;
        payload.processingFeeStatus = basic.processingFeeStatus;
        payload.amount = basic.amount ? Number(basic.amount) : null;
        payload.referredByType = basic.referredByType;
        payload.agentId =
          basic.referredByType === "AGENT" && basic.agentId ? Number(basic.agentId) : null;

        payload.applications = applications.map((app) => {
          const appPayload: any = {
            countryId: Number(app.countryId),
            universityId: Number(app.universityId),
            course: app.course.trim(),
            status: getApiStatus(app.status),
            intakeMonth: app.intakeMonth,
            intakeYear: Number(app.intakeYear),
          };
          if (isAdmin && app.status === "VISA_ACCEPTED") {
            appPayload.commissionAmount = Number(app.commissionAmount);
            appPayload.commissionCurrency = app.commissionCurrency;
          }
          return appPayload;
        });
      }

      if (isSales) {
        payload.countryId = applications[0]?.countryId
          ? Number(applications[0].countryId)
          : null;
      }

      const endpoint = isSales ? "/leads" : "/students";
      await axiosInstance.post(endpoint, payload);

      Alert.alert("Success", `${isSales ? "Lead" : "Student"} created successfully`);
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? err.message ?? "Failed to create student";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // Add/Remove applications
  const addApplication = () => {
    setApplications([...applications, emptyApplication()]);
  };

  const removeApplication = (index: number) => {
    setApplications(applications.filter((_, i) => i !== index));
  };

  const updateApplication = (index: number, field: keyof Application, value: string) => {
    setApplications(
      applications.map((app, i) => {
        if (i !== index) return app;
        const updated = { ...app, [field]: value };
        // Clear university when country changes
        if (field === "countryId") {
          updated.universityId = "";
          if (value) void fetchUniversities(value);
        }
        // Clear commission when status changes away from VISA_ACCEPTED
        if (field === "status" && value !== "VISA_ACCEPTED") {
          updated.commissionAmount = "";
          updated.commissionCurrency = "";
        }
        return updated;
      }),
    );
  };

  // Initialize one application for Sales
  useEffect(() => {
    if (open && isSales && applications.length === 0) {
      setApplications([emptyApplication()]);
    }
  }, [open, isSales, applications.length]);

  if (!open) return null;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <Pressable
              onPress={() => onOpenChange(false)}
              disabled={loading}
              className="active:opacity-60"
              hitSlop={8}
            >
              <Text className="text-base font-medium text-slate-600">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-slate-900">
              Add {isSales ? "Lead" : "Student"}
            </Text>
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={loading}
              className={cn("active:opacity-60", loading && "opacity-40")}
              hitSlop={8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text className="text-base font-semibold text-blue-500">Create</Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="p-5 pb-10"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information */}
            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
              <Text className="mb-4 text-lg font-semibold text-slate-900">
                Basic Information
              </Text>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">Name *</Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="user" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="Full name"
                    placeholderTextColor="#94a3b8"
                    value={basic.name}
                    onChangeText={(v) => setBasic({ ...basic, name: v })}
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">Email *</Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="mail" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="email@example.com"
                    placeholderTextColor="#94a3b8"
                    value={basic.mail}
                    onChangeText={(v) => setBasic({ ...basic, mail: v.toLowerCase() })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">
                  Phone Number *
                </Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="phone" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="10 digit number"
                    placeholderTextColor="#94a3b8"
                    value={basic.phno}
                    onChangeText={(v) => setBasic({ ...basic, phno: v.replace(/\D/g, "") })}
                    keyboardType="number-pad"
                    maxLength={10}
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                </View>
              </View>

              <View className="mb-3">
                <BottomSheetSelect
                  label="Gender *"
                  placeholder="Select Gender"
                  options={genderOptions}
                  value={basic.gender}
                  onChange={(v) => setBasic({ ...basic, gender: v })}
                />
              </View>

              <View className="mb-3">
                <BottomSheetSelect
                  label="State *"
                  placeholder="Select State"
                  options={stateOptions}
                  value={basic.state}
                  onChange={(v) => setBasic({ ...basic, state: v, district: "" })}
                />
              </View>

              <View className="mb-3">
                <BottomSheetSelect
                  label="District *"
                  placeholder="Select District"
                  options={districtOptions}
                  value={basic.district}
                  onChange={(v) => setBasic({ ...basic, district: v })}
                  disabled={!basic.state}
                />
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">City *</Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="map-pin" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="City name"
                    placeholderTextColor="#94a3b8"
                    value={basic.city}
                    onChangeText={(v) => setBasic({ ...basic, city: v })}
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">
                  Pincode *
                </Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="hash" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="6 digit pincode"
                    placeholderTextColor="#94a3b8"
                    value={basic.pincode}
                    onChangeText={(v) => setBasic({ ...basic, pincode: v.replace(/\D/g, "") })}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-slate-500">
                  Passport Number *
                </Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                  <Feather name="credit-card" size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="Passport number (uppercase)"
                    placeholderTextColor="#94a3b8"
                    value={basic.passportNumber}
                    onChangeText={(v) => setBasic({ ...basic, passportNumber: v.toUpperCase() })}
                    onBlur={() => void checkPassport(basic.passportNumber)}
                    autoCapitalize="characters"
                    className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                  />
                  {passportChecking ? (
                    <ActivityIndicator size="small" color="#94a3b8" />
                  ) : null}
                </View>
              </View>

              <View className="mb-3">
                <BottomSheetSelect
                  label="Refusal Status *"
                  placeholder="Select Refusal Status"
                  options={refusalOptions}
                  value={basic.refusalStatus}
                  onChange={(v) => setBasic({ ...basic, refusalStatus: v })}
                />
              </View>

              {!isSales ? (
                <>
                  <View className="mb-3">
                    <BottomSheetSelect
                      label="B2B (Optional)"
                      placeholder="Select B2B"
                      options={b2bOptions}
                      value={basic.b2bId}
                      onChange={(v) => setBasic({ ...basic, b2bId: v })}
                    />
                  </View>

                  <View className="mb-3">
                    <BottomSheetSelect
                      label="Processing Fee Status *"
                      placeholder="Select Processing Fee Status"
                      options={processingFeeOptions}
                      value={basic.processingFeeStatus}
                      onChange={(v) =>
                        setBasic({ ...basic, processingFeeStatus: v, amount: "" })
                      }
                    />
                  </View>

                  {basic.processingFeeStatus === "PAID" ? (
                    <View className="mb-3">
                      <Text className="mb-1.5 text-xs font-medium text-slate-500">
                        Amount *
                      </Text>
                      <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                        <Feather name="dollar-sign" size={18} color="#94a3b8" />
                        <TextInput
                          placeholder="Amount"
                          placeholderTextColor="#94a3b8"
                          value={basic.amount}
                          onChangeText={(v) => setBasic({ ...basic, amount: v })}
                          keyboardType="decimal-pad"
                          className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                        />
                      </View>
                    </View>
                  ) : null}

                  <View className="mb-3">
                    <BottomSheetSelect
                      label="Referred By *"
                      placeholder="Select Referred By"
                      options={referredByTypeOptions}
                      value={basic.referredByType}
                      onChange={(v) => setBasic({ ...basic, referredByType: v, agentId: "" })}
                    />
                  </View>

                  {basic.referredByType === "AGENT" ? (
                    <View className="mb-0">
                      <BottomSheetSelect
                        label="Agent *"
                        placeholder="Select Agent"
                        options={agentOptions}
                        value={basic.agentId}
                        onChange={(v) => setBasic({ ...basic, agentId: v })}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>

            {/* Applications */}
            {!isSales ? (
              <View className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-slate-900">Applications</Text>
                  <Pressable
                    onPress={addApplication}
                    className="flex-row items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600"
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text className="text-xs font-semibold text-white">Add</Text>
                  </Pressable>
                </View>

                {applications.length === 0 ? (
                  <Text className="py-6 text-center text-sm text-slate-400">
                    No applications added yet
                  </Text>
                ) : null}

                {applications.map((app, idx) => {
                  const uniOptions = [
                    { label: "Select University", value: "" },
                    ...(universities[app.countryId] ?? []).map((u) => ({
                      label: u.name,
                      value: String(u.id),
                    })),
                  ];

                  const showCommission = isAdmin && app.status === "VISA_ACCEPTED";

                  return (
                    <View
                      key={idx}
                      className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-slate-700">
                          Application {idx + 1}
                        </Text>
                        {applications.length > 1 ? (
                          <Pressable
                            onPress={() => removeApplication(idx)}
                            className="active:opacity-60"
                            hitSlop={4}
                          >
                            <Feather name="trash-2" size={16} color="#ef4444" />
                          </Pressable>
                        ) : null}
                      </View>

                      <View className="mb-3">
                        <BottomSheetSelect
                          label="Country *"
                          placeholder="Select Country"
                          options={countryOptions}
                          value={app.countryId}
                          onChange={(v) => updateApplication(idx, "countryId", v)}
                        />
                      </View>

                      <View className="mb-3">
                        <BottomSheetSelect
                          label="University *"
                          placeholder="Select University"
                          options={uniOptions}
                          value={app.universityId}
                          onChange={(v) => updateApplication(idx, "universityId", v)}
                          disabled={!app.countryId}
                        />
                      </View>

                      <View className="mb-3">
                        <Text className="mb-1.5 text-xs font-medium text-slate-500">
                          Course *
                        </Text>
                        <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                          <Feather name="book" size={18} color="#94a3b8" />
                          <TextInput
                            placeholder="Course name"
                            placeholderTextColor="#94a3b8"
                            value={app.course}
                            onChangeText={(v) => updateApplication(idx, "course", v)}
                            className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                          />
                        </View>
                      </View>

                      <View className="mb-3">
                        <BottomSheetSelect
                          label="Status *"
                          placeholder="Select Status"
                          options={statusOptions}
                          value={app.status}
                          onChange={(v) => updateApplication(idx, "status", v)}
                        />
                      </View>

                      <View className="mb-3">
                        <BottomSheetSelect
                          label="Intake Month *"
                          placeholder="Select Month"
                          options={monthOptions}
                          value={app.intakeMonth}
                          onChange={(v) => updateApplication(idx, "intakeMonth", v)}
                        />
                      </View>

                      <View className={cn("mb-0", showCommission && "mb-3")}>
                        <BottomSheetSelect
                          label="Intake Year *"
                          placeholder="Select Year"
                          options={yearOptions}
                          value={app.intakeYear}
                          onChange={(v) => updateApplication(idx, "intakeYear", v)}
                        />
                      </View>

                      {showCommission ? (
                        <>
                          <View className="mb-3">
                            <Text className="mb-1.5 text-xs font-medium text-slate-500">
                              Commission Amount *
                            </Text>
                            <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
                              <Feather name="dollar-sign" size={18} color="#94a3b8" />
                              <TextInput
                                placeholder="Amount"
                                placeholderTextColor="#94a3b8"
                                value={app.commissionAmount}
                                onChangeText={(v) =>
                                  updateApplication(idx, "commissionAmount", v)
                                }
                                keyboardType="decimal-pad"
                                className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                              />
                            </View>
                          </View>

                          <View className="mb-0">
                            <BottomSheetSelect
                              label="Commission Currency *"
                              placeholder="Select Currency"
                              options={currencyOptions}
                              value={app.commissionCurrency}
                              onChange={(v) => updateApplication(idx, "commissionCurrency", v)}
                            />
                          </View>
                        </>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                <Text className="mb-4 text-lg font-semibold text-slate-900">
                  Country of Interest
                </Text>
                <BottomSheetSelect
                  label="Country"
                  placeholder="Select Country"
                  options={countryOptions}
                  value={applications[0]?.countryId ?? ""}
                  onChange={(v) =>
                    setApplications([{ ...emptyApplication(), countryId: v }])
                  }
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
