"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { useDisconnect } from "wagmi";
import {
  Home,
  MessageSquare,
  MessageCircle,
  PieChart,
  Settings,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "AI Assistant", href: "/dashboard/ai", icon: MessageSquare },
  { name: "Chats", href: "/dashboard/chats", icon: MessageCircle },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: PieChart },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    disconnect();
    logout();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AI Bank
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-gray-800">
          <div
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer mb-2"
            onClick={() => router.push("/dashboard/settings")}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold">
                {user.name?.[0]?.toUpperCase() || user.address.substring(2, 4).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || "Anonymous User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.email || `${user.address.substring(0, 6)}...${user.address.substring(user.address.length - 4)}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
};


