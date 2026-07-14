import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/src/types";
import axiosInstance from "@/src/api/axiosInstance";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("userdata");
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 19);

      const response = await axiosInstance.post("/auth/login", {
        email,
        password,
        loginTime: localISOTime,
      });

      const data = response.data;
      if (!data.token) return { success: false, error: "invalid" };

      if (data.role !== "ADMIN") {
        return { success: false, error: "This app is for admins only." };
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      await AsyncStorage.setItem("userdata", JSON.stringify(data));

      setUser(data);
      return { success: true };
    } catch (err: any) {
      const backendMsg = err.response?.data?.error;
      return { success: false, error: backendMsg || "invalid" };
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.multiRemove(["token", "refreshToken", "userdata"]);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};