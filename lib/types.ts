// Core types for the AI Bank application

export interface User {
  address: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  value: number;
  price: number;
  change24h: number;
  logo?: string;
}

export interface Transaction {
  id: string;
  type: "send" | "receive" | "swap" | "other";
  from: string;
  to: string;
  amount: string;
  asset: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  hash: string;
  fee?: string;
}

export interface Contact {
  id: string;
  address: string;
  name: string;
  ensName?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "contact";
  content: string;
  timestamp: number;
  type?: "text" | "payment_request" | "payment";
}



