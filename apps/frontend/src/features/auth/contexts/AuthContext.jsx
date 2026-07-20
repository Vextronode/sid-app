/* eslint-disable no-unused-vars */
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
 
  const [user, setUser] = useState({ role: 'rt', wilayah_kode: '001', wilayah_label: 'RT 001, RW001 - Desa Cibenda' });

  // State loading buat nungguin response dari server
  // Default false dulu soale API belum ada kaciw
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Nanti kalau API dari be Laravel udah beres, uncomment ini terus sesuain bae
  /*
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/user'); 
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);
  */

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);