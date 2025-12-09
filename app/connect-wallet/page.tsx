'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConnect, useAccount } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRight, Check, Shield, Lock } from 'lucide-react';
import Link from 'next/link';

export default function ConnectWalletPage() {
  const router = useRouter();
  const { connect, isPending } = useConnect();
  const { isConnected, address } = useAccount();
  const [userEmail, setUserEmail] = useState('');

  // Get user email from localStorage
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  // Log page load
  useEffect(() => {
    console.log('[ConnectWallet] Page loaded', { isConnected, address });
  }, []);

  // Log connection status changes
  useEffect(() => {
    console.log('[ConnectWallet] Connection status changed:', {
      isConnected,
      address,
      hasAddress: !!address,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, address]);

  // Redirect to dashboard if wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      console.log('[ConnectWallet] ✅ Wallet connected! Storing wallet address:', address);
      // Store wallet address
      localStorage.setItem('walletAddress', address);

      // Also store in cookie for middleware access
      document.cookie = `walletAddress=${address}; path=/; max-age=${7 * 24 * 60 * 60}`;

      console.log('[ConnectWallet] Starting 2-second timer before redirect...');
      // Redirect to dashboard after showing success
      const timer = setTimeout(() => {
        console.log('[ConnectWallet] Timer completed - redirecting to dashboard using window.location.href...');
        // Use window.location.href to force a full page reload, ensuring Wagmi state is properly refreshed
        window.location.href = '/dashboard';
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      console.log('[ConnectWallet] ❌ Not ready for redirect yet:', { isConnected, address });
    }
  }, [isConnected, address]);

  const handleConnectMetaMask = () => {
    console.log('[ConnectWallet] Button clicked - initiating MetaMask connection...');
    connect({ connector: metaMask() });
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            AI Bank
          </h1>
          <p className="text-gray-600">Connect your wallet to get started</p>
        </div>

        {isConnected && address ? (
          // Success State
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-green-100 rounded-full p-6">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Wallet Connected!</h2>
            <p className="text-gray-600 mb-6">
              Your MetaMask wallet has been successfully connected.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-8 break-all">
              <p className="text-sm text-gray-600 mb-2">Connected Wallet:</p>
              <p className="text-lg font-mono text-gray-900">{address}</p>
            </div>
            <p className="text-gray-600 mb-2">Redirecting to dashboard...</p>
            <div className="flex justify-center gap-2 mb-6">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
            </div>
            {/* Manual redirect button if auto-redirect fails */}
            <Link href="/dashboard">
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Dashboard Now
              </Button>
            </Link>
          </div>
        ) : (
          // Main Content
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Benefits */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">View Your Assets</h3>
                    <p className="text-gray-600 mt-1">See all your token balances and portfolio value in real-time</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-100">
                      <Lock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Secure Transactions</h3>
                    <p className="text-gray-600 mt-1">Send and receive crypto securely with MetaMask protection</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-100">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Your Keys, Your Coins</h3>
                    <p className="text-gray-600 mt-1">Non-custodial wallet - you control your private keys</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Connection Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
                  <Wallet className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600">
                  Connect your MetaMask wallet to enable blockchain features
                </p>
              </div>

              {userEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">Logged in as</p>
                  <p className="text-lg font-semibold text-blue-600">{userEmail}</p>
                </div>
              )}

              <Button
                onClick={handleConnectMetaMask}
                disabled={isPending}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mb-4"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-5 w-5" />
                    Connect MetaMask
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <Button
                onClick={handleSkip}
                variant="outline"
                size="lg"
                className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50"
              >
                Skip for Now
              </Button>

              <p className="text-xs text-gray-500 text-center mt-6">
                You can connect your wallet anytime from settings
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">
              Go to Dashboard
            </Link>
            {' '} • {' '}
            <button
              onClick={() => {
                // Clear localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('walletAddress');

                // Clear cookies
                document.cookie = 'token=; path=/; max-age=0';
                document.cookie = 'userId=; path=/; max-age=0';
                document.cookie = 'userEmail=; path=/; max-age=0';
                document.cookie = 'walletAddress=; path=/; max-age=0';

                router.push('/welcome');
              }}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Logout
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
