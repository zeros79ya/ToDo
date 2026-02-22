const DB_NAME = 'local-tasks-db';
const DB_VERSION = 2; // Upgraded for native object storage
const STORE_NAME = 'kv'; // We will keep 'kv' for simplicity but store native objects

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = req.result;
            // Version 1 created the store, if we're upgrading or creating from scratch
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Set any value (string, object, array) natively into IndexedDB
export async function idbSet(key: string, value: any): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

// Get any value natively from IndexedDB
export async function idbGet<T = any>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    const db = await openDb();
    const value = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
}

export async function idbDelete(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

export async function idbGetAll(): Promise<Record<string, any>> {
    if (typeof window === 'undefined') return {};
    const db = await openDb();
    const result = await new Promise<Record<string, any>>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const out: Record<string, any> = {};

        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                out[String(cursor.key)] = cursor.value;
                cursor.continue();
            } else {
                resolve(out);
            }
        };
        req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
}

