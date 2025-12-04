"use client";

/**
 * Real-Time Blockchain Analytics Panel
 * 
 * This component displays real-time blockchain data including:
 * - Network status and connection indicator
 * - Latest block information
 * - Gas price with trend visualization
 * - Transaction feed (if watching an address)
 * 
 * Updates dynamically without page reloads via SSE.
 */

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRealtimeBlockchain } from "@/lib/realtime/hooks/useRealtimeBlockchain";
import {
  Activity,
  Wifi,
  WifiOff,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Fuel,
  Box,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

interface RealtimePanelProps {
  className?: string;
  compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatGasPrice(gwei: number): string {
  // For L2s with very low gas (< 1 Gwei), show more precision
  if (gwei < 0.01) return gwei.toFixed(4);
  if (gwei < 0.1) return gwei.toFixed(3);
  if (gwei < 1) return gwei.toFixed(2);
  if (gwei < 10) return gwei.toFixed(1);
  return Math.round(gwei).toString();
}

function formatBlockNumber(num: bigint | undefined): string {
  if (!num) return "---";
  return num.toLocaleString();
}

// =============================================================================
// Sub-Components
// =============================================================================

function ConnectionStatus({ 
  status, 
  onReconnect 
}: { 
  status: string; 
  onReconnect: () => void;
}) {
  const statusConfig = {
    connected: { icon: Wifi, color: "text-green-500", bg: "bg-green-500", label: "Live" },
    disconnected: { icon: WifiOff, color: "text-gray-400", bg: "bg-gray-400", label: "Offline" },
    reconnecting: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500", label: "Reconnecting" },
    error: { icon: WifiOff, color: "text-red-500", bg: "bg-red-500", label: "Error" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
  const Icon = config.icon;
  const isReconnecting = status === "reconnecting";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className={`relative flex h-2 w-2`}>
          {status === "connected" && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bg} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg}`} />
        </span>
        <Icon className={`h-4 w-4 ${config.color} ${isReconnecting ? "animate-spin" : ""}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
      {(status === "error" || status === "disconnected") && (
        <Button variant="ghost" size="sm" onClick={onReconnect} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function GasTrend({ trend }: { trend: "rising" | "falling" | "stable" }) {
  const config = {
    rising: { icon: TrendingUp, color: "text-red-500", label: "Rising" },
    falling: { icon: TrendingDown, color: "text-green-500", label: "Falling" },
    stable: { icon: Minus, color: "text-gray-500", label: "Stable" },
  };

  const { icon: Icon, color, label } = config[trend];

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function NetworkLoadBar({ load }: { load: number }) {
  const getColor = (load: number) => {
    if (load < 50) return "bg-green-500";
    if (load < 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">Network Load</span>
        <span className="font-medium">{load}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(load)} transition-all duration-500`}
          style={{ width: `${load}%` }}
        />
      </div>
    </div>
  );
}

function GasChart({ history }: { history: Array<{ timestamp: number; gwei: number }> }) {
  if (!history || history.length < 2) return null;

  const maxGwei = Math.max(...history.map((h) => h.gwei));
  const minGwei = Math.min(...history.map((h) => h.gwei));
  const range = maxGwei - minGwei || 1;

  const points = history
    .slice(0, 20)
    .reverse()
    .map((h, i) => {
      const x = (i / 19) * 100;
      const y = 100 - ((h.gwei - minGwei) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-2">
      <svg viewBox="0 0 100 50" className="w-full h-12">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-blue-500"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{history.length > 0 ? `${Math.round(minGwei)}` : "-"}</span>
        <span>Gwei</span>
        <span>{history.length > 0 ? `${Math.round(maxGwei)}` : "-"}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Connection Lost Banner
// =============================================================================

function ConnectionLostBanner({ 
  status, 
  error, 
  onReconnect 
}: { 
  status: string; 
  error: string | null;
  onReconnect: () => void;
}) {
  if (status === "connected") return null;

  const isReconnecting = status === "reconnecting";

  return (
    <div className={`rounded-lg p-3 mb-4 ${
      isReconnecting ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isReconnecting ? (
            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <div>
            <p className={`text-sm font-medium ${isReconnecting ? "text-yellow-800" : "text-red-800"}`}>
              {isReconnecting ? "Reconnecting..." : "Connection Lost"}
            </p>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
        {!isReconnecting && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconnect}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        ⚠️ Real-time data may be unavailable. Displayed information could be stale.
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RealtimePanel({ className = "", compact = false }: RealtimePanelProps) {
  const { address } = useAccount();
  const [isClient, setIsClient] = useState(false);

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    isConnected,
    connectionStatus,
    error,
    latestBlock,
    gasInfo,
    recentTransactions,
    blocksReceived,
    eventsReceived,
    uptime,
    lastEventTime,
    reconnect,
  } = useRealtimeBlockchain({
    watchAddress: address,
    enabled: isClient,
  });

  if (!isClient) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
            {gasInfo && (
              <div className="flex items-center gap-1.5 text-sm">
                <Fuel className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{formatGasPrice(gasInfo.gasPriceGwei)}</span>
                <span className="text-gray-500">Gwei</span>
              </div>
            )}
            {latestBlock && (
              <div className="flex items-center gap-1.5 text-sm">
                <Box className="h-4 w-4 text-blue-500" />
                <span className="font-medium">#{formatBlockNumber(latestBlock.number)}</span>
              </div>
            )}
          </div>
          {lastEventTime && (
            <span className="text-xs text-gray-400">
              Updated {formatTimeAgo(lastEventTime)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Lost Banner */}
      <ConnectionLostBanner 
        status={connectionStatus} 
        error={error} 
        onReconnect={reconnect} 
      />

      {/* Main Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Real-Time Network</h3>
            </div>
            <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Latest Block */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Box className="h-4 w-4" />
              <span>Latest Block</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {latestBlock ? `#${formatBlockNumber(latestBlock.number)}` : "---"}
              </p>
              {latestBlock && (
                <p className="text-xs text-gray-500 mt-1">
                  {latestBlock.transactionCount} transactions
                </p>
              )}
            </div>
          </div>

          {/* Gas Price */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Fuel className="h-4 w-4" />
                <span>Gas Price</span>
              </div>
              {gasInfo && <GasTrend trend={gasInfo.trend} />}
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-gray-900">
                  {gasInfo ? formatGasPrice(gasInfo.gasPriceGwei) : "---"}
                </p>
                <span className="text-sm text-gray-500">Gwei</span>
              </div>
              {gasInfo?.baseFeeGwei && (
                <p className="text-xs text-gray-500 mt-1">
                  Base: {formatGasPrice(gasInfo.baseFeeGwei)} + Priority: {gasInfo.priorityFeeGwei}
                </p>
              )}
            </div>
            {gasInfo && <GasChart history={gasInfo.history} />}
          </div>

          {/* Network Load */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap className="h-4 w-4" />
              <span>Network Status</span>
            </div>
            {gasInfo && <NetworkLoadBar load={gasInfo.networkLoad} />}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-500">Blocks</p>
                <p className="font-medium">{blocksReceived}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-500">Events</p>
                <p className="font-medium">{eventsReceived}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Feed (if watching address) */}
        {address && recentTransactions.length > 0 && (
          <div className="border-t border-gray-100">
            <div className="px-6 py-3 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700">Recent Transactions</h4>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {recentTransactions.slice(0, 5).map((tx) => (
                <div key={tx.hash} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.direction === "incoming" ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {tx.direction === "incoming" ? "+" : "-"}{tx.valueEth} ETH
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    tx.status === "confirmed" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Uptime: {formatUptime(uptime)}</span>
          </div>
          {lastEventTime && (
            <span>Last update: {formatTimeAgo(lastEventTime)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RealtimePanel;

