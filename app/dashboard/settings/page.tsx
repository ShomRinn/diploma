"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  User,
  Globe,
  Shield,
  LogOut,
  Copy,
  Check,
  Moon,
  Sun,
} from "lucide-react";

export default function SettingsPage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (address) {
      // Load saved profile
      const saved = localStorage.getItem(`profile-${address}`);
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    }
  }, [address]);

  const handleSaveProfile = () => {
    if (address) {
      localStorage.setItem(`profile-${address}`, JSON.stringify(profile));
      alert("Profile saved successfully!");
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/welcome");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold">Account</h2>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="your.email@example.com"
            />
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connected Wallet
            </label>
            <div className="flex gap-2">
              <Input value={address || ""} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={copyAddress}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
            Save Profile
          </Button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Globe className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Network Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Network</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Network
            </label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Linea Sepolia</p>
                  <p className="text-sm text-gray-500">Testnet</p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            To switch networks, use your MetaMask wallet extension.
          </p>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-1">Connected dApps</p>
            <p className="text-sm text-gray-600">
              Manage connected applications in your MetaMask wallet
            </p>
          </div>

          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={handleDisconnect}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}



