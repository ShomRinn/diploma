"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnect, useAccount } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { Wallet, Zap, Shield, TrendingUp } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  const handleConnect = () => {
    connect({ connector: metaMask() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Bank
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The Future of Banking with AI-Powered Cryptocurrency Management
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Assistant</h3>
            <p className="text-gray-600">
              Chat with AI to manage your crypto, get insights, and execute transactions
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Decentralized</h3>
            <p className="text-gray-600">
              Your keys, your crypto. Full control with MetaMask integration
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-Time Analytics</h3>
            <p className="text-gray-600">
              Track your portfolio with live prices and performance insights
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Get Started</h2>
              <p className="text-gray-600">
                Connect your wallet to access AI Bank
              </p>
            </div>

            <Button
              onClick={handleConnect}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect with MetaMask
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By connecting, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>Powered by MetaMask SDK • Linea Network • OpenAI</p>
        </div>
      </div>
    </div>
  );
}



