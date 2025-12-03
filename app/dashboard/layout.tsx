"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!isConnected) {
      router.push("/welcome");
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null; // or a loading spinner
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



