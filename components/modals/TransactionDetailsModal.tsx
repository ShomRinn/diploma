"use client";

import { Button } from "@/components/ui/button";
import { X, ExternalLink, Copy, Check } from "lucide-react";
import { Transaction } from "@/lib/types";
import { useState } from "react";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const TransactionDetailsModal = ({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailsModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "send":
        return "Sent";
      case "receive":
        return "Received";
      case "swap":
        return "Swapped";
      default:
        return "Transaction";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
              transaction.status
            )}`}
          >
            {transaction.status.toUpperCase()}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Type</label>
            <p className="font-medium">{getTypeLabel(transaction.type)}</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Amount</label>
            <p className="font-medium text-lg">
              {transaction.amount} {transaction.asset}
            </p>
          </div>

          {/* From */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">From</label>
            <p className="font-mono text-sm break-all">{transaction.from}</p>
          </div>

          {/* To */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">To</label>
            <p className="font-mono text-sm break-all">{transaction.to}</p>
          </div>

          {/* Transaction Hash */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Transaction Hash
            </label>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm break-all flex-1">
                {transaction.hash.substring(0, 10)}...
                {transaction.hash.substring(transaction.hash.length - 8)}
              </p>
              <button
                onClick={copyHash}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Time</label>
            <p className="font-medium">
              {new Date(transaction.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Fee */}
          {transaction.fee && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Fee</label>
              <p className="font-medium">{transaction.fee} ETH</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              window.open(
                `https://sepolia.lineascan.build/tx/${transaction.hash}`,
                "_blank"
              )
            }
          >
            View on Explorer
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};



