"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAccount } from "wagmi";

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    address: string;
    name?: string;
    email?: string;
  } | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<AuthContextType["user"]>(null);

  useEffect(() => {
    if (isConnected && address) {
      // Load user profile from localStorage
      const savedProfile = localStorage.getItem(`profile-${address}`);
      const profile = savedProfile ? JSON.parse(savedProfile) : {};
      
      setUser({
        address,
        name: profile.name,
        email: profile.email,
      });
    } else {
      setUser(null);
    }
  }, [isConnected, address]);

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isConnected && !!user,
        user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};



