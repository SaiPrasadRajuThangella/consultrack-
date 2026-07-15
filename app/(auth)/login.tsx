import { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  type KeyboardEvent,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TextInput } from "@/src/components/ui/Text";
import { useAuth } from "@/src/contexts/AuthContext";
import { cn } from "@/src/lib/utils";

const KEYBOARD_SCROLL_Y = 100;

export default function Login() {
  const { login } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const canSubmit = trimmedEmail.length > 0 && trimmedPassword.length > 0 && !loading;
  const isKeyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: KEYBOARD_SCROLL_Y, animated: true });
      });
    };

    const onHide = () => {
      setKeyboardHeight(0);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    const res = await login(trimmedEmail, trimmedPassword);
    setLoading(false);
    if (res.success) {
      router.replace("/(admin)/dashboard");
    } else {
      setError(res.error ?? "Login failed");
    }
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#f3f1fb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientRoot}
    >
      <SafeAreaView className="flex-1" style={styles.transparentBg}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.scrollContent,
                isKeyboardOpen && styles.scrollContentKeyboardOpen,
                { paddingBottom: 32 + (Platform.OS === "android" ? keyboardHeight : 0) },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={isKeyboardOpen}
            >
              <View className="items-center px-2 pb-8 pt-6">
                <Image
                  className="rounded-2xl"
                  source={require("../../assets/images/consultrak-logo.png")}
                  style={styles.logo}
                  contentFit="cover"
                  accessibilityLabel="ConsulTrak"
                />
              </View>

              <View
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-5 py-16"
                style={styles.card}
              >
                <Text className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Sign in to continue to your admin dashboard
                </Text>

                {error ? (
                  <View className="mt-4 flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <Feather
                      name="alert-circle"
                      size={16}
                      color="#ef4444"
                      style={styles.errorIcon}
                    />
                    <Text className="flex-1 text-sm text-red-600">{error}</Text>
                  </View>
                ) : null}

                <View className="mt-6">
                  <Text className="mb-1.5 text-xs font-medium text-slate-500">Email</Text>
                  <View
                    className={cn(
                      "flex-row items-center rounded-xl border bg-white px-3.5",
                      focused === "email" ? "border-blue-500" : "border-slate-200",
                    )}
                  >
                    <Feather
                      name="mail"
                      size={18}
                      color={focused === "email" ? "#3b82f6" : "#94a3b8"}
                    />
                    <TextInput
                      placeholder="you@company.com"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocused("email")}
                      onBlur={() => {
                        setFocused(null);
                        setEmail((v) => v.trim());
                      }}
                      returnKeyType="next"
                      className="flex-1 px-3 py-5 text-sm text-slate-900"
                    />
                  </View>
                </View>

                <View className="mt-4">
                  <Text className="mb-1.5 text-xs font-medium text-slate-500">Password</Text>
                  <View
                    className={cn(
                      "flex-row items-center rounded-xl border bg-white px-3.5",
                      focused === "password" ? "border-blue-500" : "border-slate-200",
                    )}
                  >
                    <Feather
                      name="lock"
                      size={18}
                      color={focused === "password" ? "#3b82f6" : "#94a3b8"}
                    />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocused("password")}
                      onBlur={() => {
                        setFocused(null);
                        setPassword((v) => v.trim());
                      }}
                      onSubmitEditing={() => void handleLogin()}
                      returnKeyType="go"
                      className="flex-1 px-3 py-5 text-sm text-slate-900"
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      className="p-1 active:opacity-70"
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#94a3b8"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => void handleLogin()}
                  disabled={!canSubmit}
                  className={cn(
                    "mt-6 items-center rounded-xl bg-blue-500 py-5 active:bg-blue-600",
                    !canSubmit && "opacity-60",
                  )}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Sign In</Text>
                  )}
                </Pressable>
              </View>

              <Text className="mt-8 text-center text-xs text-slate-400">
                ConsulTrak · Complete Consultancy Management
              </Text>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  transparentBg: {
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrollContentKeyboardOpen: {
    justifyContent: "flex-start",
    paddingTop: 12,
  },
  logo: {
    width: 300,
    height: 88,
  },
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  errorIcon: {
    marginTop: 2,
  },
});