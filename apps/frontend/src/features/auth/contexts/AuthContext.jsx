import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
const [user, setUser] = useState(null);
const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const checkSession = async () => {
          try {
              const { data } = await api.get("/api/user");
              setUser(data);
          } catch {
              setUser(null);
          } finally {
              setIsLoading(false);
          }
      };

      checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data } = await api.get("/api/user");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Mengambil data user yang sedang login dari session Laravel
  // kemudian menyimpannya ke AuthContext.
  // Data user juga dikembalikan agar bisa digunakan
  // untuk redirect berdasarkan role setelah login.
  const login = async () => {
    const { data } = await api.get("/api/user");

    setUser(data);

    return data;
  };

  const logout = async () => {
    await api.post("/api/logout");

    setUser(null);
  };

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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);