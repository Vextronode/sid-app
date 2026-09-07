import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import api from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // CHECK SESSION SAAT APP PERTAMA DIBUKA
  // ==========================================

  useEffect(() => {
    checkSession();
  }, []);

  // ==========================================
  // CHECK SESSION
  // ==========================================

  const checkSession = async () => {
    try {
      const response = await api.get("/api/user");

      setUser(response.data);

      return response.data;
    } catch (error) {
      // 401 = memang belum login.
      // Tidak perlu dianggap sebagai error aplikasi.
      if (error.response?.status !== 401) {
        console.error(
          "CHECK SESSION ERROR:",
          error
        );
      }

      setUser(null);

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const login = async (loggedUser = null) => {
    // User sudah didapat dari response POST /login
    if (loggedUser) {
      setUser(loggedUser);

      return loggedUser;
    }

    // Fallback jika login dipanggil tanpa user
    const response = await api.get("/api/user");

    setUser(response.data);

    return response.data;
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      await api.post("/api/logout");
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    } finally {
      setUser(null);
    }
  };

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () =>
  useContext(AuthContext);