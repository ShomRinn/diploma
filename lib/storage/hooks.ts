/**
 * React Hooks for IndexedDB Storage
 * Provides convenient React hooks for database operations
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import * as authService from './auth';
import * as exportImportService from './export-import';
import * as dbService from './indexeddb/service';
import type {
  User,
  ChatSession,
  Contact,
  TransactionLabel,
  UserSettings,
  PortfolioSnapshot,
  CustomToken,
} from './types';

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

/**
 * Hook for user authentication
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authService.registerUser({
          email,
          password,
          confirmPassword: password,
          name,
        });
        setUser({ id: result.userId, email } as User);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.loginUser({ email, password });
      const userData = await dbService.getUserById(result.userId);
      if (userData) {
        setUser(userData);
      }
      setToken(result.token);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (user) {
        await authService.logoutAllSessions(user.id);
      }
      setUser(null);
      setToken(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) throw new Error('User not authenticated');
        await authService.updatePassword(user.id, currentPassword, newPassword);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password update failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  return {
    user,
    token,
    isLoading,
    error,
    register,
    login,
    logout,
    updatePassword,
  };
}

// ============================================================================
// CHAT SESSION HOOKS
// ============================================================================

/**
 * Hook for managing chat sessions
 */
export function useChatSessions(userId?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dbService.getChatSessionsByUserId(id);
      setSessions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (session: ChatSession) => {
    setError(null);
    try {
      const id = await dbService.createChatSession(session);
      setSessions((prev) => [...prev, { ...session, id }]);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
      throw err;
    }
  }, []);

  const updateSession = useCallback(async (session: ChatSession) => {
    setError(null);
    try {
      await dbService.updateChatSession(session);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update session';
      setError(message);
      throw err;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      await dbService.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete session';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadSessions(userId);
    }
  }, [userId, loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
  };
}

// ============================================================================
// CONTACTS HOOKS
// ============================================================================

/**
 * Hook for managing contacts
 */
export function useContacts(userId?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dbService.getContactsByUserId(id);
      setContacts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contacts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createContact = useCallback(async (contact: Contact) => {
    setError(null);
    try {
      const id = await dbService.createContact(contact);
      setContacts((prev) => [...prev, { ...contact, id }]);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create contact';
      setError(message);
      throw err;
    }
  }, []);

  const updateContact = useCallback(async (contact: Contact) => {
    setError(null);
    try {
      await dbService.updateContact(contact);
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update contact';
      setError(message);
      throw err;
    }
  }, []);

  const deleteContact = useCallback(async (contactId: string) => {
    setError(null);
    try {
      await dbService.deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete contact';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadContacts(userId);
    }
  }, [userId, loadContacts]);

  return {
    contacts,
    isLoading,
    error,
    loadContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

// ============================================================================
// EXPORT/IMPORT HOOKS
// ============================================================================

/**
 * Hook for data export/import operations
 */
export function useDataExportImport(userId?: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      if (!userId) throw new Error('User not authenticated');
      return await exportImportService.exportUserData(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [userId]);

  const downloadData = useCallback(async (filename?: string) => {
    setIsExporting(true);
    setError(null);
    try {
      if (!userId) throw new Error('User not authenticated');
      await exportImportService.downloadUserData(userId, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [userId]);

  const importData = useCallback(async (file: File) => {
    setIsImporting(true);
    setError(null);
    try {
      return await exportImportService.importUserDataFromFile(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    setError(null);
    try {
      if (!userId) throw new Error('User not authenticated');
      return await exportImportService.getUserDataStats(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stats';
      setError(message);
      throw err;
    }
  }, [userId]);

  return {
    isExporting,
    isImporting,
    error,
    exportData,
    downloadData,
    importData,
    getStats,
  };
}

// ============================================================================
// USER SETTINGS HOOKS
// ============================================================================

/**
 * Hook for managing user settings
 */
export function useUserSettings(userId?: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dbService.getUserSettings(id);
      setSettings(data || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    setError(null);
    try {
      await dbService.createOrUpdateUserSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadSettings(userId);
    }
  }, [userId, loadSettings]);

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSettings,
  };
}

// ============================================================================
// PORTFOLIO HOOKS
// ============================================================================

/**
 * Hook for managing portfolio snapshots
 */
export function usePortfolioSnapshots(userId?: string) {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshots = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dbService.getPortfolioSnapshotsByUserId(id);
      setSnapshots(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load snapshots';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSnapshot = useCallback(async (snapshot: PortfolioSnapshot) => {
    setError(null);
    try {
      const id = await dbService.createPortfolioSnapshot(snapshot);
      setSnapshots((prev) => [{ ...snapshot, id }, ...prev]);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create snapshot';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadSnapshots(userId);
    }
  }, [userId, loadSnapshots]);

  return {
    snapshots,
    isLoading,
    error,
    loadSnapshots,
    createSnapshot,
  };
}
