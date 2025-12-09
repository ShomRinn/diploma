"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/authContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in via email/password
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    console.log('[DashboardLayout] Auth check:', {
      userId: !!userId,
      token: !!token,
      isConnected,
      timestamp: new Date().toISOString()
    });

    // User is authenticated if they have userId and token (email/password login)
    // OR if MetaMask is connected
    const authenticated = (userId && token) || isConnected;

    console.log('[DashboardLayout] Authentication result:', { authenticated });

    if (!authenticated) {
      // Not authenticated, redirect to welcome
      console.log('[DashboardLayout] Not authenticated - redirecting to welcome');
      router.push("/welcome");
    } else {
      console.log('[DashboardLayout] Authenticated - allowing access to dashboard');
    }

    setIsAuthenticated(authenticated);
    setIsLoading(false);
  }, [isConnected, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}



