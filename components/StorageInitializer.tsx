'use client';

import { useEffect } from 'react';
import { getDatabase } from '@/lib/storage/indexeddb/service';
import { isIndexedDBAvailable } from '@/lib/storage/indexeddb/db';

/**
 * Client-side component that initializes IndexedDB storage on app startup
 * This must be in a client component to access browser APIs
 */
export function StorageInitializer() {
  useEffect(() => {
    const init = async () => {
      try {
        // Check if IndexedDB is available
        if (!isIndexedDBAvailable()) {
          console.error('[Storage] IndexedDB is not available in this browser');
          return;
        }

        // Initialize the database (this will auto-initialize on first call)
        const db = await getDatabase();
        console.log('[Storage] ✅ IndexedDB initialized successfully');
        console.log('[Storage] Available stores:', Array.from(db.objectStoreNames));
      } catch (error) {
        console.error('[Storage] Failed to initialize IndexedDB:', error);
      }
    };

    init();
  }, []);

  // Component doesn't render anything
  return null;
}
