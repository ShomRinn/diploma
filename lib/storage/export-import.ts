/**
 * Export/Import Functionality
 * Allows users to export and import their data
 */

import * as db from './indexeddb/service';
import { safeParseExportData } from './schemas';
import type { ExportData, User } from './types';

/**
 * Export all user data as JSON
 */
export async function exportUserData(userId: string): Promise<ExportData> {
  // Verify user exists
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Collect all user data
  const [
    chatSessions,
    contacts,
    transactionLabels,
    userSettings,
    portfolioSnapshots,
    customTokens,
  ] = await Promise.all([
    db.getChatSessionsByUserId(userId),
    db.getContactsByUserId(userId),
    db.getTransactionLabelsByUserId(userId),
    db.getUserSettings(userId),
    db.getPortfolioSnapshotsByUserId(userId),
    db.getCustomTokensByUserId(userId),
  ]);

  // Create default user settings if not exists
  const settings = userSettings || {
    userId,
    profile: {
      name: user.name || '',
      email: user.email,
    },
    preferences: {
      currency: 'USD',
      language: 'en',
      theme: 'light',
      notifications: true,
      autoLock: 30,
    },
    updatedAt: Date.now(),
  };

  const exportData: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    userId,
    data: {
      chat_sessions: chatSessions,
      contacts,
      transaction_labels: transactionLabels,
      user_settings: settings,
      portfolio_snapshots: portfolioSnapshots,
      custom_tokens: customTokens,
    },
  };

  return exportData;
}

/**
 * Export user data as downloadable file (Blob)
 */
export async function exportUserDataAsFile(userId: string): Promise<Blob> {
  const data = await exportUserData(userId);
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Export and download user data as JSON file
 */
export async function downloadUserData(userId: string, filename?: string): Promise<void> {
  const blob = await exportUserDataAsFile(userId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `wallet-agent-export-${userId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import user data from JSON
 */
export async function importUserData(data: unknown): Promise<{
  imported: number;
  errors: string[];
}> {
  // Validate export data format
  const validationResult = safeParseExportData(data);
  if (!validationResult.success) {
    throw new Error(
      `Invalid export data: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  const exportData = validationResult.data;

  // Verify user exists
  const user = await db.getUserById(exportData.userId);
  if (!user) {
    throw new Error('User account does not exist for import');
  }

  let importedCount = 0;
  const errors: string[] = [];

  try {
    // Import chat sessions
    for (const session of exportData.data.chat_sessions) {
      try {
        await db.createChatSession(session);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import chat session ${session.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Import contacts
    for (const contact of exportData.data.contacts) {
      try {
        await db.createContact(contact);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import contact ${contact.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Import transaction labels
    for (const label of exportData.data.transaction_labels) {
      try {
        await db.createTransactionLabel(label);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import transaction label ${label.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Import user settings
    try {
      await db.createOrUpdateUserSettings(exportData.data.user_settings);
      importedCount++;
    } catch (error) {
      errors.push(
        `Failed to import user settings: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Import portfolio snapshots
    for (const snapshot of exportData.data.portfolio_snapshots) {
      try {
        await db.createPortfolioSnapshot(snapshot);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import portfolio snapshot ${snapshot.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // Import custom tokens
    for (const token of exportData.data.custom_tokens) {
      try {
        await db.createCustomToken(token);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import custom token ${token.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  } catch (error) {
    throw new Error(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return { imported: importedCount, errors };
}

/**
 * Import user data from file (Blob)
 */
export async function importUserDataFromFile(file: File): Promise<{
  imported: number;
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = event.target?.result;
        if (typeof json !== 'string') {
          throw new Error('Invalid file content');
        }

        const data = JSON.parse(json);
        const result = await importUserData(data);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Clear all data for a user (except user account itself)
 */
export async function clearUserData(userId: string): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await db.deleteAllUserData(userId);
}

/**
 * Delete user account and all associated data
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  // Delete all user data first
  await clearUserData(userId);

  // Delete user account
  await db.deleteUser(userId);
}

/**
 * Get user data statistics
 */
export async function getUserDataStats(userId: string): Promise<{
  userId: string;
  email: string;
  createdAt: number;
  lastLogin?: number;
  stats: {
    chatSessions: number;
    contacts: number;
    transactionLabels: number;
    portfolioSnapshots: number;
    customTokens: number;
    authSessions: number;
  };
}> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const [
    chatSessions,
    contacts,
    transactionLabels,
    portfolioSnapshots,
    customTokens,
  ] = await Promise.all([
    db.getChatSessionsByUserId(userId),
    db.getContactsByUserId(userId),
    db.getTransactionLabelsByUserId(userId),
    db.getPortfolioSnapshotsByUserId(userId),
    db.getCustomTokensByUserId(userId),
  ]);

  const activeSessions = await db.getActiveSessionsByUserId(userId);

  return {
    userId,
    email: user.email,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    stats: {
      chatSessions: chatSessions.length,
      contacts: contacts.length,
      transactionLabels: transactionLabels.length,
      portfolioSnapshots: portfolioSnapshots.length,
      customTokens: customTokens.length,
      authSessions: activeSessions.length,
    },
  };
}

/**
 * Generate a data summary for privacy/GDPR purposes
 */
export async function generatePrivacySummary(userId: string): Promise<string> {
  const stats = await getUserDataStats(userId);
  const user = await db.getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const summary = `
# Personal Data Summary - GDPR/Privacy Request

Generated: ${new Date().toISOString()}

## Account Information
- User ID: ${stats.userId}
- Email: ${stats.email}
- Account Created: ${new Date(stats.createdAt).toISOString()}
- Last Login: ${stats.lastLogin ? new Date(stats.lastLogin).toISOString() : 'Never'}
- Account Status: ${user.isActive ? 'Active' : 'Disabled'}

## Data Summary
- Chat Sessions: ${stats.stats.chatSessions}
- Contacts: ${stats.stats.contacts}
- Transaction Labels: ${stats.stats.transactionLabels}
- Portfolio Snapshots: ${stats.stats.portfolioSnapshots}
- Custom Tokens: ${stats.stats.customTokens}
- Active Sessions: ${stats.stats.authSessions}

## Privacy Notice
This is a summary of personal data held in the wallet-agent database.

For full data access or deletion requests, please use:
- Download Data: Export all personal information
- Delete Data: Permanently remove account and all data

Total Records: ${
    stats.stats.chatSessions +
    stats.stats.contacts +
    stats.stats.transactionLabels +
    stats.stats.portfolioSnapshots +
    stats.stats.customTokens
  }
  `;

  return summary;
}
