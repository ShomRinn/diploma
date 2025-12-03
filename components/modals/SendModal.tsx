"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowRight } from "lucide-react";
import { useSendTransaction } from "wagmi";
import { parseEther } from "viem";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [asset, setAsset] = useState("ETH");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { sendTransaction, data: hash, isPending } = useSendTransaction();

  if (!isOpen) return null;

  const handleSend = () => {
    if (!recipient || !amount) return;

    try {
      sendTransaction({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
      });
      setStep(3);
    } catch (error) {
      console.error("Transaction error:", error);
    }
  };

  const handleClose = () => {
    setStep(1);
    setRecipient("");
    setAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Send Crypto</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  s <= step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    s < step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Asset */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ETH">ETH - Ethereum</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1" 
                size="lg"
              >
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1" size="lg">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Recipient & Amount */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Recipient Address
              </label>
              <Input
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <Input
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: 0.0 {asset}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!recipient || !amount || isPending}
                  className="flex-1"
                >
                  {isPending ? "Confirming..." : "Send"}
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700"
                disabled={isPending}
              >
                Cancel Transaction
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-xl font-semibold">Transaction Sent!</h3>
            {hash && (
              <p className="text-sm text-gray-600 break-all">
                Hash: {hash.substring(0, 10)}...{hash.substring(hash.length - 8)}
              </p>
            )}
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};


