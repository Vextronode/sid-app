import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // state buat ngasih nilai default belum lohin (null)
  const [user, setUser] = useState(null);

  // dummy buat simulasi login sukses
  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
