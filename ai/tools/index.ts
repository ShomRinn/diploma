// Export all tools
export { balanceTool } from './balance';
export { 
  sendTransactionTool, 
  getTransactionHistoryTool,
  getTransactionStatusTool 
} from './transactions';
export { 
  getGasPriceTool, 
  estimateTransactionCostTool 
} from './gas';
export { 
  getTokenBalanceTool, 
  sendTokenTool 
} from './tokens';
export { 
  getCryptoPriceTool, 
  getPortfolioValueTool,
  getMarketAnalyticsTool 
} from './prices';
export { 
  getBlockInfoTool 
} from './blockchain';

// Import all tools
import { balanceTool } from './balance';
import { 
  sendTransactionTool, 
  getTransactionHistoryTool,
  getTransactionStatusTool 
} from './transactions';
import { 
  getGasPriceTool, 
  estimateTransactionCostTool 
} from './gas';
import { 
  getTokenBalanceTool, 
  sendTokenTool 
} from './tokens';
import { 
  getCryptoPriceTool, 
  getPortfolioValueTool,
  getMarketAnalyticsTool 
} from './prices';
import { 
  getBlockInfoTool 
} from './blockchain';

// Export all tools as a collection
export const tools = {
  // Balance
  displayBalance: balanceTool,
  
  // Transactions
  sendTransaction: sendTransactionTool,
  getTransactionHistory: getTransactionHistoryTool,
  getTransactionStatus: getTransactionStatusTool,
  
  // Gas
  getGasPrice: getGasPriceTool,
  estimateTransactionCost: estimateTransactionCostTool,
  
  // Tokens
  getTokenBalance: getTokenBalanceTool,
  sendToken: sendTokenTool,
  
  // Prices
  getCryptoPrice: getCryptoPriceTool,
  getPortfolioValue: getPortfolioValueTool,
  getMarketAnalytics: getMarketAnalyticsTool,
  
  // Blockchain
  getBlockInfo: getBlockInfoTool,
};

