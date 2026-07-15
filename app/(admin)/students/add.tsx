import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { City, State } from "country-state-city";
import axiosInstance from "@/src/api/axiosInstance";
import { useAuth } from "@/src/contexts/AuthContext";
import { BottomSheetSelect } from "@/src/components/BottomSheetSelect";
import { Text, TextInput } from "@/src/components/ui/Text";
import { getApiStatus, getDisplayStatus } from "@/src/lib/statusMapper";
import { cn } from "@/src/lib/utils";

const USER_ALLOWED_STATUSES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_RECEIVED",
  "OFFER_LETTER_CONDITIONAL",
  "OFFER_LETTER_UNCONDITIONAL",
  "CASE_CLOSED",
  "VISA_APPROVED",
];

const ADMIN_EXTRA_STATUSES = [
  "VISA_ACCEPTED",
  "VISA_REJECTED",
  "COMMISSION_RECEIVED",
];

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

const YEARS = Array.from({ length: 6 }, (_, index) =>
  String(new Date().getFullYear() - index),
);

type BasicInfo = {
  name: string;
  mail: string;
  phno: string;
  passportNumber: string;
  address: string;
  gender: string;
  refusal: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  agentId: string;
  referredEmployeeId: string;
  referredConsultancyId: string;
  b2bId: string;
  processingFeePaid: boolean;
  processingAmount: string;
};

type Application = {
  universityId: string;
  course: string;
  countryId: string;
  status: string;
  amount: string;
  currency: string;
  processingFeePaid: boolean;
  processingAmount: string;
  intakeMonth: string;
  intakeYear: string;
};

type Country = {
  id: number;
  name: string;
};

type Agent = {
  id: number;
  name: string;
};

type B2BPartner = {
  id: number;
  name: string;
};

type University = {
  id: number;
  name?: string;
  universityName?: string;
};

const emptyBasic = (): BasicInfo => ({
  name: "",
  mail: "",
  phno: "",
  passportNumber: "",
  address: "",
  gender: "",
  refusal: "",
  state: "",
  district: "",
  city: "",
  pincode: "",
  agentId: "",
  referredEmployeeId: "",
  referredConsultancyId: "",
  b2bId: "",
  processingFeePaid: false,
  processingAmount: "",
});

const emptyApplication = (): Application => ({
  universityId: "",
  course: "",
  countryId: "",
  status: "",
  amount: "",
  currency: "INR",
  processingFeePaid: false,
  processingAmount: "",
  intakeMonth: "",
  intakeYear: "",
});

export default function AddStudentScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const role = user?.role;
  const isSales = role === "SALES";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const userId = user?.userId ?? user?.userid;

  const [basic, setBasic] = useState<BasicInfo>(emptyBasic);
  const [applications, setApplications] = useState<Application[]>([
    emptyApplication(),
  ]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [b2bPartners, setB2bPartners] = useState<B2BPartner[]>([]);
  const [universitiesByCountry, setUniversitiesByCountry] = useState<
    Record<string, University[]>
  >({});
  const [referredByType, setReferredByType] = useState<
    "AGENT" | "EMPLOYEE" | ""
  >("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [passportChecking, setPassportChecking] = useState(false);
  const [passportStatus, setPassportStatus] = useState<
    "accepted" | "exists" | null
  >(null);

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const countryRequest =
          isSales || isAdmin
            ? axiosInstance.get("/countries")
            : axiosInstance.get(`/countries/user/${userId}`);

        const [countriesRes, agentsRes, b2bRes] = await Promise.all([
          countryRequest,
          isSales
            ? Promise.resolve({ data: [] })
            : axiosInstance.get("/agents").catch(() => ({ data: [] })),
          axiosInstance
            .get("/b2b?page=0&size=100&sortBy=createdAt&direction=DESC")
            .catch(() => ({ data: { content: [] } })),
        ]);

        if (!active) return;

        const countryData =
          countriesRes.data?.content ??
          countriesRes.data?.data ??
          countriesRes.data;
        const agentData =
          agentsRes.data?.content ?? agentsRes.data?.data ?? agentsRes.data;
        const b2bData =
          b2bRes.data?.content ?? b2bRes.data?.data ?? b2bRes.data;

        setCountries(Array.isArray(countryData) ? countryData : []);
        setAgents(Array.isArray(agentData) ? agentData : []);
        setB2bPartners(Array.isArray(b2bData) ? b2bData : []);
      } catch (error) {
        console.error("Failed to load add-student options", error);
        if (active) {
          Alert.alert(
            "Unable to load form",
            "Some form options could not be loaded. Please try again.",
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    };

    if (user && (isSales || isAdmin || userId != null)) {
      void loadOptions();
    } else {
      setLoadingOptions(false);
    }

    return () => {
      active = false;
    };
  }, [isAdmin, isSales, user, userId]);

  const states = useMemo(() => State.getStatesOfCountry("IN"), []);

  const stateOptions = useMemo(
    () => [
      { label: "Select State", value: "" },
      ...states.map((state) => ({
        label: state.name,
        value: state.name,
      })),
    ],
    [states],
  );

  const districtOptions = useMemo(() => {
    const selectedState = states.find((state) => state.name === basic.state);
    if (!selectedState) {
      return [{ label: "Select State First", value: "" }];
    }

    return [
      { label: "Select District", value: "" },
      ...City.getCitiesOfState("IN", selectedState.isoCode).map((district) => ({
        label: district.name,
        value: district.name,
      })),
    ];
  }, [basic.state, states]);

  const countryOptions = useMemo(
    () => [
      { label: "Select Country", value: "" },
      ...countries.map((country) => ({
        label: country.name,
        value: String(country.id),
      })),
    ],
    [countries],
  );

  const agentOptions = useMemo(
    () => [
      { label: "Select Agent", value: "" },
      ...agents.map((agent) => ({
        label: agent.name,
        value: String(agent.id),
      })),
    ],
    [agents],
  );

  const b2bOptions = useMemo(
    () => [
      { label: "No B2B Partner", value: "" },
      ...b2bPartners.map((partner) => ({
        label: partner.name,
        value: String(partner.id),
      })),
    ],
    [b2bPartners],
  );

  const statusOptions = useMemo(() => {
    const statuses = isAdmin
      ? [
          ...USER_ALLOWED_STATUSES,
          ...ADMIN_EXTRA_STATUSES.filter(
            (status) => !USER_ALLOWED_STATUSES.includes(status),
          ),
        ]
      : USER_ALLOWED_STATUSES;

    return [
      { label: "Select Status", value: "" },
      ...statuses.map((status) => ({
        label: getDisplayStatus(status).replace(/_/g, " "),
        value: status,
      })),
    ];
  }, [isAdmin]);

  const updateBasic = <K extends keyof BasicInfo>(
    key: K,
    value: BasicInfo[K],
  ) => {
    setBasic((previous) => ({ ...previous, [key]: value }));
  };

  const updateApplication = (
    index: number,
    key: keyof Application,
    value: string | boolean,
  ) => {
    setApplications((previous) =>
      previous.map((application, appIndex) =>
        appIndex === index
          ? ({ ...application, [key]: value } as Application)
          : application,
      ),
    );
  };

  const fetchUniversitiesByCountry = async (countryId: string) => {
    if (!countryId || universitiesByCountry[countryId]) return;

    try {
      const response = await axiosInstance.get(
        `/universities/country/${countryId}`,
      );
      const data = response.data?.content ?? response.data;
      setUniversitiesByCountry((previous) => ({
        ...previous,
        [countryId]: Array.isArray(data) ? data : [],
      }));
    } catch (error) {
      console.error("Failed to load universities", error);
      setUniversitiesByCountry((previous) => ({
        ...previous,
        [countryId]: [],
      }));
    }
  };

  const changeApplicationCountry = (index: number, countryId: string) => {
    setApplications((previous) =>
      previous.map((application, appIndex) =>
        appIndex === index
          ? { ...application, countryId, universityId: "" }
          : application,
      ),
    );
    if (countryId) void fetchUniversitiesByCountry(countryId);
  };

  const checkPassport = async (passport: string) => {
    const normalized = passport.trim().toUpperCase();
    if (normalized.length < 5) {
      setPassportStatus(null);
      return;
    }

    setPassportChecking(true);
    try {
      const response = await axiosInstance.get(
        `/students/check-passport/${encodeURIComponent(normalized)}`,
      );
      setPassportStatus(response.data ? "exists" : "accepted");
    } catch (error) {
      console.error("Passport check failed", error);
      setPassportStatus(null);
    } finally {
      setPassportChecking(false);
    }
  };

  const validate = () => {
    if (!basic.name.trim()) return "Full name is required";
    if (!basic.phno.trim()) return "Phone number is required";
    if (!/^\d{10}$/.test(basic.phno))
      return "Enter a valid 10-digit phone number";
    if (!basic.gender) return "Please select gender";
    if (!basic.refusal) return "Please select refusal status";
    if (passportStatus === "exists") return "Passport number already exists";

    if (isSales) {
      if (!applications[0]?.countryId) return "Please select a country";
      return null;
    }

    if (applications.length === 0)
      return "At least one academic application is required";

    for (let index = 0; index < applications.length; index += 1) {
      if (!applications[index].countryId) {
        return `Application ${index + 1}: Please select a country`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert("Validation Error", validationError);
      return;
    }

    setLoading(true);
    try {
      const referredConsultancyId = user?.referredConsultancyId;
      if (referredConsultancyId != null) {
        const limitResponse = await axiosInstance.get(
          `/api/validation/limits/students/${referredConsultancyId}`,
        );
        if (limitResponse.data === false) {
          Alert.alert("Limit Reached", "Student limit reached");
          return;
        }
      }

      const cleanedPhoneNumber = basic.phno.replace(/\s+/g, "").trim();
      const endpoint = isSales ? "/leads" : "/students";

      const payload = isSales
        ? {
            name: basic.name.trim(),
            mail: basic.mail.trim(),
            phno: Number(cleanedPhoneNumber),
            passport: basic.passportNumber.trim() || null,
            district: basic.district,
            state: basic.state,
            city: basic.city.trim(),
            address: basic.address.trim(),
            gender: basic.gender,
            refusal: basic.refusal,
            b2bId: basic.b2bId ? Number(basic.b2bId) : null,
            pincode: basic.pincode ? Number(basic.pincode) : null,
            status: "LEAD",
            countryId: applications[0]?.countryId
              ? Number(applications[0].countryId)
              : null,
          }
        : {
            name: basic.name.trim(),
            mail: basic.mail.trim(),
            phno: cleanedPhoneNumber,
            passportNumber: basic.passportNumber.trim() || "",
            address: basic.address.trim(),
            gender: basic.gender,
            refusal: basic.refusal,
            state: basic.state,
            district: basic.district,
            city: basic.city.trim(),
            pincode: basic.pincode ? Number(basic.pincode) : null,
            agentId: basic.agentId ? Number(basic.agentId) : null,
            referredEmployeeId: basic.referredEmployeeId
              ? Number(basic.referredEmployeeId)
              : null,
            referredConsultancyId: basic.referredConsultancyId
              ? Number(basic.referredConsultancyId)
              : null,
            b2bId: basic.b2bId ? Number(basic.b2bId) : null,
            processingFeePaid: basic.processingFeePaid,
            processingAmount: basic.processingFeePaid
              ? Number(basic.processingAmount)
              : null,
            applications: applications.map((application) => ({
              university_id: application.universityId
                ? Number(application.universityId)
                : null,
              course: application.course.trim(),
              countryId: Number(application.countryId),
              status: application.status
                ? getApiStatus(application.status)
                : null,
              amount:
                isAdmin &&
                application.status === "VISA_ACCEPTED" &&
                application.amount
                  ? Number(application.amount)
                  : null,
              currency:
                isAdmin && application.status === "VISA_ACCEPTED"
                  ? application.currency
                  : null,
              processingFeePaid: application.processingFeePaid,
              processingAmount: application.processingFeePaid
                ? Number(application.processingAmount)
                : null,
              intakeMonth: application.intakeMonth || null,
              intakeYear: application.intakeYear
                ? Number(application.intakeYear)
                : null,
            })),
          };

      await axiosInstance.post(endpoint, payload);
      Alert.alert(
        "Success",
        `${isSales ? "Lead" : "Student"} created successfully`,
      );
      router.back();
    } catch (error: any) {
      const message =
        error.response?.data?.error ??
        error.response?.data?.message ??
        "Failed to add student. Please check all required fields.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const addApplication = () => {
    setApplications((previous) => [...previous, emptyApplication()]);
  };

  const removeApplication = (index: number) => {
    setApplications((previous) =>
      previous.length > 1
        ? previous.filter((_, appIndex) => appIndex !== index)
        : previous,
    );
  };

  const monthOptions = [
    { label: "Select Month", value: "" },
    ...MONTHS.map((month) => ({ label: month, value: month })),
  ];
  const yearOptions = [
    { label: "Select Year", value: "" },
    ...YEARS.map((year) => ({ label: year, value: year })),
  ];
  const currencyOptions = [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "AUD",
    "CAD",
    "SGD",
    "AED",
    "JPY",
  ].map((currency) => ({ label: currency, value: currency }));

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <Pressable
            onPress={() => router.back()}
            disabled={loading}
            className="flex-row items-center active:opacity-60"
            hitSlop={8}
          >
            <Feather name="chevron-left" size={20} color="#475569" />
            <Text className="text-base font-medium text-slate-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-slate-900">
            Add {isSales ? "Lead" : "Student"}
          </Text>
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={loading || loadingOptions}
            className={cn(
              "min-w-14 items-end active:opacity-60",
              (loading || loadingOptions) && "opacity-40",
            )}
            hitSlop={8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text className="text-base font-semibold text-blue-500">
                Create
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loadingOptions ? (
            <View className="mb-5 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white p-5">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="ml-2 text-sm text-slate-500">
                Loading form options...
              </Text>
            </View>
          ) : null}

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-slate-900">
              Basic Information
            </Text>

            <View className="mb-3">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Full Name *
              </Text>
              <View className="flex-row items-center rounded-xl border border-slate-200 px-3.5">
                <Feather name="user" size={18} color="#94a3b8" />
                <TextInput
                  value={basic.name}
                  onChangeText={(value) => {
                    if (/^[A-Za-z\s]*$/.test(value)) updateBasic("name", value);
                  }}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                />
              </View>
            </View>

            <View className="mb-3">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Email Address
              </Text>
              <View className="flex-row items-center rounded-xl border border-slate-200 px-3.5">
                <Feather name="mail" size={18} color="#94a3b8" />
                <TextInput
                  value={basic.mail}
                  onChangeText={(value) =>
                    updateBasic("mail", value.replace(/\s/g, ""))
                  }
                  placeholder="email@example.com"
                  placeholderTextColor="#94a3b8"
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
              <View className="flex-row items-center rounded-xl border border-slate-200 px-3.5">
                <Feather name="phone" size={18} color="#94a3b8" />
                <TextInput
                  value={basic.phno}
                  onChangeText={(value) =>
                    updateBasic("phno", value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit phone number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={10}
                  className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                />
              </View>
            </View>

            <View className="mb-3">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Passport Number
              </Text>
              <View
                className={cn(
                  "flex-row items-center rounded-xl border px-3.5",
                  passportStatus === "exists"
                    ? "border-red-400"
                    : "border-slate-200",
                )}
              >
                <Feather name="credit-card" size={18} color="#94a3b8" />
                <TextInput
                  value={basic.passportNumber}
                  onChangeText={(value) => {
                    const normalized = value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "");
                    updateBasic("passportNumber", normalized);
                    setPassportStatus(null);
                  }}
                  onBlur={() => void checkPassport(basic.passportNumber)}
                  placeholder="Passport number"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  className="flex-1 px-3 py-3.5 text-sm text-slate-900"
                />
                {passportChecking ? (
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : null}
              </View>
              {passportStatus ? (
                <Text
                  className={cn(
                    "mt-1 text-xs font-medium",
                    passportStatus === "exists"
                      ? "text-red-500"
                      : "text-emerald-600",
                  )}
                >
                  {passportStatus === "exists"
                    ? "Passport already exists"
                    : "Passport accepted"}
                </Text>
              ) : null}
            </View>

            <View className="mb-3">
              <BottomSheetSelect
                label="Gender *"
                placeholder="Select gender"
                options={[
                  { label: "Select Gender", value: "" },
                  { label: "Male", value: "MALE" },
                  { label: "Female", value: "FEMALE" },
                ]}
                value={basic.gender}
                onChange={(value) => updateBasic("gender", value)}
              />
            </View>

            <BottomSheetSelect
              label="Refusal *"
              placeholder="Select refusal status"
              options={[
                { label: "Select Refusal Status", value: "" },
                { label: "Yes", value: "YES" },
                { label: "No", value: "NO" },
              ]}
              value={basic.refusal}
              onChange={(value) => updateBasic("refusal", value)}
            />
          </View>

          <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-slate-900">
              Address
            </Text>

            <View className="mb-3">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Street Address
              </Text>
              <TextInput
                value={basic.address}
                onChangeText={(value) => updateBasic("address", value)}
                placeholder="Enter address"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-20 rounded-xl border border-slate-200 px-3.5 py-3.5 text-sm text-slate-900"
              />
            </View>

            <View className="mb-3">
              <BottomSheetSelect
                label="State"
                placeholder="Select state"
                options={stateOptions}
                value={basic.state}
                onChange={(value) =>
                  setBasic((previous) => ({
                    ...previous,
                    state: value,
                    district: "",
                  }))
                }
              />
            </View>

            <View className="mb-3">
              <BottomSheetSelect
                label="District"
                placeholder={
                  basic.state ? "Select district" : "Select state first"
                }
                options={districtOptions}
                value={basic.district}
                onChange={(value) => updateBasic("district", value)}
                disabled={!basic.state}
              />
            </View>

            <View className="mb-3">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                City
              </Text>
              <TextInput
                value={basic.city}
                onChangeText={(value) => {
                  if (/^[A-Za-z\s]*$/.test(value)) updateBasic("city", value);
                }}
                placeholder="Enter city"
                placeholderTextColor="#94a3b8"
                className="rounded-xl border border-slate-200 px-3.5 py-3.5 text-sm text-slate-900"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Pincode
              </Text>
              <TextInput
                value={basic.pincode}
                onChangeText={(value) =>
                  updateBasic(
                    "pincode",
                    value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder="6-digit pincode"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={6}
                className="rounded-xl border border-slate-200 px-3.5 py-3.5 text-sm text-slate-900"
              />
            </View>
          </View>

          <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="mb-4 text-lg font-semibold text-slate-900">
              Additional Information
            </Text>

            <View className={cn(!isSales && "mb-3")}>
              <BottomSheetSelect
                label="B2B Partner"
                placeholder="Select B2B partner"
                options={b2bOptions}
                value={basic.b2bId}
                onChange={(value) => updateBasic("b2bId", value)}
              />
            </View>

            {!isSales ? (
              <>
                <View className="mb-3">
                  <BottomSheetSelect
                    label="Processing Fee Paid"
                    placeholder="Select option"
                    options={[
                      { label: "No", value: "NO" },
                      { label: "Yes", value: "YES" },
                    ]}
                    value={basic.processingFeePaid ? "YES" : "NO"}
                    onChange={(value) =>
                      setBasic((previous) => ({
                        ...previous,
                        processingFeePaid: value === "YES",
                        processingAmount:
                          value === "YES" ? previous.processingAmount : "",
                      }))
                    }
                  />
                </View>

                {basic.processingFeePaid ? (
                  <View className="mb-3">
                    <Text className="mb-1.5 text-xs font-medium text-slate-500">
                      Processing Amount
                    </Text>
                    <TextInput
                      value={basic.processingAmount}
                      onChangeText={(value) =>
                        updateBasic(
                          "processingAmount",
                          value.replace(/[^0-9.]/g, ""),
                        )
                      }
                      placeholder="Enter amount"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      className="rounded-xl border border-slate-200 px-3.5 py-3.5 text-sm text-slate-900"
                    />
                  </View>
                ) : null}

                <View className="mb-3">
                  <BottomSheetSelect
                    label="Referred By"
                    placeholder="Select referral type"
                    options={[
                      { label: "No Referral", value: "" },
                      { label: "Agent", value: "AGENT" },
                      { label: "Employee", value: "EMPLOYEE" },
                    ]}
                    value={referredByType}
                    onChange={(value) => {
                      setReferredByType(
                        value as "AGENT" | "EMPLOYEE" | "",
                      );
                      setBasic((previous) => ({
                        ...previous,
                        agentId: value === "AGENT" ? previous.agentId : "",
                        referredEmployeeId:
                          value === "EMPLOYEE"
                            ? previous.referredEmployeeId
                            : "",
                      }));
                    }}
                  />
                </View>

                {referredByType === "AGENT" ? (
                  <BottomSheetSelect
                    label="Agent"
                    placeholder="Select agent"
                    options={agentOptions}
                    value={basic.agentId}
                    onChange={(value) => updateBasic("agentId", value)}
                  />
                ) : null}

                {referredByType === "EMPLOYEE" ? (
                  <Text className="text-xs text-slate-400">
                    Employee assignment is handled by the consultancy.
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>

          {isSales ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <Text className="mb-4 text-lg font-semibold text-slate-900">
                Country of Interest
              </Text>
              <BottomSheetSelect
                label="Country *"
                placeholder="Select country"
                options={countryOptions}
                value={applications[0]?.countryId ?? ""}
                onChange={(value) =>
                  setApplications([
                    { ...emptyApplication(), countryId: value },
                  ])
                }
              />
            </View>
          ) : (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-slate-900">
                  Applications
                </Text>
                <Pressable
                  onPress={addApplication}
                  className="flex-row items-center rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600"
                >
                  <Feather name="plus" size={16} color="#ffffff" />
                  <Text className="ml-1.5 text-xs font-semibold text-white">
                    Add University
                  </Text>
                </Pressable>
              </View>

              {applications.map((application, index) => {
                const universityOptions = [
                  { label: "Select University", value: "" },
                  ...(universitiesByCountry[application.countryId] ?? []).map(
                    (university) => ({
                      label:
                        university.universityName ??
                        university.name ??
                        "Unknown University",
                      value: String(university.id),
                    }),
                  ),
                ];
                const showCommission =
                  isAdmin && application.status === "VISA_ACCEPTED";

                return (
                  <View
                    key={index}
                    className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-slate-700">
                        Application {index + 1}
                      </Text>
                      {applications.length > 1 ? (
                        <Pressable
                          onPress={() => removeApplication(index)}
                          hitSlop={8}
                          className="active:opacity-60"
                        >
                          <Feather
                            name="trash-2"
                            size={17}
                            color="#ef4444"
                          />
                        </Pressable>
                      ) : null}
                    </View>

                    <View className="mb-3">
                      <BottomSheetSelect
                        label="Country *"
                        placeholder="Select country"
                        options={countryOptions}
                        value={application.countryId}
                        onChange={(value) =>
                          changeApplicationCountry(index, value)
                        }
                      />
                    </View>

                    <View className="mb-3">
                      <BottomSheetSelect
                        label="University"
                        placeholder={
                          application.countryId
                            ? "Select university"
                            : "Select country first"
                        }
                        options={universityOptions}
                        value={application.universityId}
                        onChange={(value) =>
                          updateApplication(index, "universityId", value)
                        }
                        disabled={!application.countryId}
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="mb-1.5 text-xs font-medium text-slate-500">
                        Course
                      </Text>
                      <TextInput
                        value={application.course}
                        onChangeText={(value) =>
                          updateApplication(index, "course", value)
                        }
                        placeholder="Course name"
                        placeholderTextColor="#94a3b8"
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 text-sm text-slate-900"
                      />
                    </View>

                    <View className="mb-3">
                      <BottomSheetSelect
                        label="Status"
                        placeholder="Select status"
                        options={statusOptions}
                        value={application.status}
                        onChange={(value) => {
                          updateApplication(index, "status", value);
                          if (value !== "VISA_ACCEPTED") {
                            updateApplication(index, "amount", "");
                          }
                        }}
                      />
                    </View>

                    <View className="mb-3">
                      <BottomSheetSelect
                        label="Intake Month"
                        placeholder="Select month"
                        options={monthOptions}
                        value={application.intakeMonth}
                        onChange={(value) =>
                          updateApplication(index, "intakeMonth", value)
                        }
                      />
                    </View>

                    <View className={cn(showCommission && "mb-3")}>
                      <BottomSheetSelect
                        label="Intake Year"
                        placeholder="Select year"
                        options={yearOptions}
                        value={application.intakeYear}
                        onChange={(value) =>
                          updateApplication(index, "intakeYear", value)
                        }
                      />
                    </View>

                    {showCommission ? (
                      <>
                        <View className="mb-3">
                          <Text className="mb-1.5 text-xs font-medium text-slate-500">
                            Commission Amount
                          </Text>
                          <TextInput
                            value={application.amount}
                            onChangeText={(value) =>
                              updateApplication(
                                index,
                                "amount",
                                value.replace(/[^0-9.]/g, ""),
                              )
                            }
                            placeholder="Enter amount"
                            placeholderTextColor="#94a3b8"
                            keyboardType="decimal-pad"
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 text-sm text-slate-900"
                          />
                        </View>

                        <BottomSheetSelect
                          label="Currency"
                          placeholder="Select currency"
                          options={currencyOptions}
                          value={application.currency}
                          onChange={(value) =>
                            updateApplication(index, "currency", value)
                          }
                        />
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={loading || loadingOptions}
            className={cn(
              "mt-5 flex-row items-center justify-center rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600",
              (loading || loadingOptions) && "opacity-50",
            )}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Create {isSales ? "Lead" : "Student"}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
