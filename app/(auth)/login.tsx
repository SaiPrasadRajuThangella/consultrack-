import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text, TextInput } from "@/src/components/ui/Text";
import { router } from "expo-router";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      router.replace("/(admin)/dashboard");
    } else {
      setError(res.error ?? "Login failed");
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-8 text-3xl font-bold text-slate-900">Admin Login</Text>

      {error ? <Text className="mb-3 text-sm text-red-500">{error}</Text> : null}

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="mb-4 rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="mb-6 rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        className="items-center rounded-xl bg-blue-600 py-3.5"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">Sign In</Text>
        )}
      </Pressable>
    </View>
  );
}