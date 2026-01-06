"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { publicClient } from "@/wagmi.config";
import { formatEther } from "viem";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RealtimePanel } from "@/components/RealtimePanel";

export default function HomePage() {
  const router = useRouter();
  const { address } = useAccount();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  // Get user email from localStorage
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      setUserEmail(email);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("walletAddress");

    // Clear cookies
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'userId=; path=/; max-age=0';
    document.cookie = 'userEmail=; path=/; max-age=0';
    document.cookie = 'walletAddress=; path=/; max-age=0';

    router.push("/welcome");
  };

  const loadBalanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const loadBalance = useCallback(async () => {
    if (!address) return;
    try {
      const bal = await publicClient.getBalance({ address });
      setBalance(formatEther(bal));
    } catch (error) {
      console.error("Error loading balance:", error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      // Debounce balance loading
      if (loadBalanceTimeoutRef.current) {
        clearTimeout(loadBalanceTimeoutRef.current);
      }
      loadBalanceTimeoutRef.current = setTimeout(() => {
        loadBalance();
      }, 300);
    }
    return () => {
      if (loadBalanceTimeoutRef.current) {
        clearTimeout(loadBalanceTimeoutRef.current);
      }
    };
  }, [address, loadBalance]);

  const [change24h, setChange24h] = useState<string>("--");
  const priceCacheRef = useRef<{ data: string; timestamp: number } | null>(null);
  const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Check cache first
    const now = Date.now();
    if (priceCacheRef.current && (now - priceCacheRef.current.timestamp) < PRICE_CACHE_TTL) {
      setChange24h(priceCacheRef.current.data);
      return;
    }

    // Fetch real ETH price and 24h change from CoinGecko
    const fetchPriceData = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json();
        const change = data.ethereum.usd_24h_change;
        const formattedChange = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
        setChange24h(formattedChange);
        // Cache the result
        priceCacheRef.current = { data: formattedChange, timestamp: now };
      } catch (error) {
        console.error("Error fetching price data:", error);
      }
    };
    fetchPriceData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Home</h1>
          <p className="text-gray-600">
            {userEmail ? `Welcome back, ${userEmail}!` : "Welcome back!"}
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-100 mb-1">Total Balance</p>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <div className="h-12 w-48 bg-white/20 rounded animate-pulse" />
              ) : (
                <>
                  <h2 className="text-5xl font-bold">{parseFloat(balance).toFixed(4)}</h2>
                  <span className="text-2xl text-blue-100">ETH</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 mb-1 ${change24h.startsWith('+') ? 'text-green-300' : change24h.startsWith('-') ? 'text-red-300' : 'text-gray-300'}`}>
              {change24h.startsWith('+') ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="font-semibold">{change24h}</span>
            </div>
            <p className="text-sm text-blue-100">Last 24 hours</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            size="lg"
          >
            <ArrowUpRight className="mr-2 h-5 w-5" />
            Send
          </Button>
          <Button
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            size="lg"
          >
            <ArrowDownLeft className="mr-2 h-5 w-5" />
            Receive
          </Button>
          <Button
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Buy
          </Button>
        </div>
      </div>

      {/* Portfolio Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Portfolio</h3>
          <Link href="/dashboard/portfolio">
            <Button variant="ghost" size="sm">
              View All
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {/* Asset Item */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">ETH</span>
              </div>
              <div>
                <p className="font-medium">Ethereum</p>
                <p className="text-sm text-gray-500">{parseFloat(balance).toFixed(4)} ETH</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">${(parseFloat(balance) * 2400).toFixed(2)}</p>
              <p className={`text-sm flex items-center justify-end gap-1 ${change24h.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {change24h.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change24h}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Network Panel */}
      <RealtimePanel />

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Button variant="ghost" size="sm">
            See All
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="text-center py-8 text-gray-500">
          <p>No recent transactions</p>
          <p className="text-sm mt-1">Your transactions will appear here</p>
        </div>
      </div>
    </div>
  );
}

