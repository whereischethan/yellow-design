import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { restoreAuthToken, restoreUserFromStorage, saveUserToStorage, setAuthToken } from "../lib/api";

type User = {
  phone: string;
  name?: string;
  role?: string;
  isTestUser?: boolean; // Flag for users who logged in with test OTP 0000
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isTestUser: boolean; // Convenience getter
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void; // Update user data in context and storage
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await restoreAuthToken();
        if (token) {
          const savedUser = await restoreUserFromStorage();
          if (savedUser) {
            setUser(savedUser);
          }
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  function login(userData: User) {
    setUser(userData);
    saveUserToStorage(userData);
  }

  function updateUser(updates: Partial<User>) {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      saveUserToStorage(updatedUser);
    }
  }

  function logout() {
    setUser(null);
    // Clear the API auth token and storage
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        isTestUser: user?.isTestUser || false,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}