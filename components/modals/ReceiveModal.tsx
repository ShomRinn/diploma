"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Copy, Check, QrCode } from "lucide-react";
import { useAccount } from "wagmi";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal = ({ isOpen, onClose }: ReceiveModalProps) => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Receive Crypto</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-6">
          <div className="bg-white rounded-lg p-8 flex items-center justify-center">
            <QrCode className="h-48 w-48 text-gray-300" />
          </div>
          <p className="text-center text-sm text-gray-600 mt-4">
            QR Code generation coming soon
          </p>
        </div>

        {/* Wallet Address */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Wallet Address
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 break-all text-sm font-mono">
                {address}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyAddress}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Only send assets on the <strong>Linea Sepolia</strong> network
              to this address
            </p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};


