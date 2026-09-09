
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
  // NORMALIZE USER RESPONSE
  // ==========================================
  // API /api/user mengembalikan:
  //
  // {
  //   data: {
  //     id: 12,
  //     name: "...",
  //     role: "rt",
  //     ...
  //   }
  // }
  //
  // Frontend membutuhkan:
  //
  // {
  //   id: 12,
  //   name: "...",
  //   role: "rt",
  //   ...
  // }
  //
  const normalizeUser = (response) => {
    return response?.data?.data ?? response?.data ?? null;
  };

  // ==========================================
  // CHECK SESSION SAAT APP PERTAMA DIBUKA
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const response = await api.get("/api/user");

        const authenticatedUser = normalizeUser(response);

        console.log("=================================");
        console.log("AUTH SESSION CHECK");
        console.log("RAW RESPONSE:", response.data);
        console.log("AUTH USER:", authenticatedUser);
        console.log("USER ROLE:", authenticatedUser?.role);
        console.log("=================================");

        if (isMounted) {
          setUser(authenticatedUser);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(
            "CHECK SESSION ERROR:",
            error.response?.status,
            error.response?.data || error.message
          );
        }

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // CHECK SESSION
  // ==========================================

  const checkSession = async () => {
    try {
      const response = await api.get("/api/user");

      const authenticatedUser = normalizeUser(response);

      console.log("=================================");
      console.log("MANUAL SESSION CHECK");
      console.log("RAW RESPONSE:", response.data);
      console.log("AUTH USER:", authenticatedUser);
      console.log("USER ROLE:", authenticatedUser?.role);
      console.log("=================================");

      setUser(authenticatedUser);

      return authenticatedUser;
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error(
          "CHECK SESSION ERROR:",
          error.response?.status,
          error.response?.data || error.message
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
    // ==========================================
    // USER DARI RESPONSE LOGIN
    // ==========================================

    if (loggedUser) {
      const authenticatedUser =
        loggedUser?.data ?? loggedUser;

      console.log("=================================");
      console.log("LOGIN USER");
      console.log("AUTH USER:", authenticatedUser);
      console.log("ROLE:", authenticatedUser?.role);
      console.log("=================================");

      setUser(authenticatedUser);

      return authenticatedUser;
    }

    // ==========================================
    // FALLBACK
    // ==========================================

    try {
      const response = await api.get("/api/user");

      const authenticatedUser = normalizeUser(response);

      console.log("=================================");
      console.log("LOGIN FALLBACK USER");
      console.log("AUTH USER:", authenticatedUser);
      console.log("ROLE:", authenticatedUser?.role);
      console.log("=================================");

      setUser(authenticatedUser);

      return authenticatedUser;
    } catch (error) {
      console.error(
        "LOGIN SESSION ERROR:",
        error.response?.status,
        error.response?.data || error.message
      );

      setUser(null);

      return null;
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      await api.post("/api/logout");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
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
export const useAuth = () => useContext(AuthContext);
