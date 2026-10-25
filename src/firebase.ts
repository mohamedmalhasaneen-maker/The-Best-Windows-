import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SavedQuote, CustomerInfo, SavedCustomer } from './types';

// Initialize Firebase App safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

// Initialize Firestore with long-polling to prevent 10s connection timeout in browser/iframe
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId);
} catch (e) {
  firestoreDb = getFirestore(app, dbId);
}
export const db = firestoreDb;

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

const QUOTES_COLLECTION = 'quotes';
const CUSTOMERS_COLLECTION = 'customers';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Normalizes any phone number format (converts Arabic numerals, removes symbols, normalizes Egyptian country code)
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  let cleaned = phone.toString().trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(arabicDigits[i], i.toString());
  }
  let digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('0020')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('20') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && (digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15'))) {
    digits = '0' + digits;
  }
  return digits;
}

const defaultCustomer: CustomerInfo = {
  name: '',
  phone: '',
  address: '',
  date: new Date().toLocaleDateString('ar-EG'),
  notes: '',
};

/**
 * Save or update a quotation in Firestore Cloud.
 * Automatically persists the customer's name, phone, and address into the customers directory as well.
 */
export async function saveQuoteToCloud(quote: SavedQuote): Promise<void> {
  try {
    const docRef = doc(db, QUOTES_COLLECTION, quote.id);
    await setDoc(docRef, {
      ...quote,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`[Firestore] Saved quote ${quote.id} to cloud successfully`);

    // Automatically index customer in the customers directory
    if (quote.customer && quote.customer.name && quote.customer.name.trim()) {
      try {
        await saveCustomerToCloud({
          name: quote.customer.name.trim(),
          phone: quote.customer.phone?.trim() || '',
          address: quote.customer.address?.trim() || '',
        });
        console.log(`[Firestore] Automatically indexed customer ${quote.customer.name} from quote ${quote.id}`);
      } catch (custErr) {
        console.warn('[Firestore] Automatic customer index warning:', custErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${QUOTES_COLLECTION}/${quote.id}`);
  }
}

/**
 * Fetch all saved quotations from Firestore Cloud
 */
export async function fetchQuotesFromCloud(): Promise<SavedQuote[]> {
  try {
    const quotesQuery = query(collection(db, QUOTES_COLLECTION), orderBy('serverUpdatedAt', 'desc'));
    const snapshot = await getDocs(quotesQuery).catch(async () => {
      // Fallback query if serverUpdatedAt index isn't ready
      return await getDocs(collection(db, QUOTES_COLLECTION));
    });

    const quotes: SavedQuote[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<SavedQuote>;
      const customerData: CustomerInfo = {
        ...defaultCustomer,
        ...(data.customer || {}),
        date: data.customer?.date || data.date || new Date().toLocaleDateString('ar-EG'),
      };

      quotes.push({
        id: data.id || docSnap.id,
        name: data.name || 'عرض سعر بدون اسم',
        customer: customerData,
        items: Array.isArray(data.items) ? data.items : [],
        totalPrice: Number(data.totalPrice) || 0,
        date: data.date || new Date().toLocaleDateString('ar-EG'),
      });
    });

    return quotes;
  } catch (error) {
    console.error('[Firestore] Error fetching quotes from cloud:', error);
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, QUOTES_COLLECTION);
    }
    return [];
  }
}

/**
 * Delete a quotation from Firestore Cloud
 */
export async function deleteQuoteFromCloud(quoteId: string): Promise<void> {
  try {
    const docRef = doc(db, QUOTES_COLLECTION, quoteId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Deleted quote ${quoteId} from cloud`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${QUOTES_COLLECTION}/${quoteId}`);
  }
}

/**
 * Real-time listener for quotes
 */
export function subscribeToQuotes(onUpdate: (quotes: SavedQuote[]) => void): () => void {
  try {
    const q = collection(db, QUOTES_COLLECTION);
    return onSnapshot(q, (snapshot) => {
      const quotes: SavedQuote[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<SavedQuote>;
        const customerData: CustomerInfo = {
          ...defaultCustomer,
          ...(data.customer || {}),
          date: data.customer?.date || data.date || new Date().toLocaleDateString('ar-EG'),
        };

        quotes.push({
          id: data.id || docSnap.id,
          name: data.name || 'عرض سعر بدون اسم',
          customer: customerData,
          items: Array.isArray(data.items) ? data.items : [],
          totalPrice: Number(data.totalPrice) || 0,
          date: data.date || new Date().toLocaleDateString('ar-EG'),
        });
      });
      onUpdate(quotes);
    }, (err) => {
      console.warn('[Firestore] Realtime subscription issue:', err);
      if (err && err.message && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.LIST, QUOTES_COLLECTION);
      }
    });
  } catch (error) {
    console.warn('[Firestore] Subscribe init failed:', error);
    return () => {};
  }
}

/**
 * Save or update a registered customer in Firestore Cloud
 */
export async function saveCustomerToCloud(customer: Partial<SavedCustomer> & { name: string; phone?: string }): Promise<SavedCustomer> {
  try {
    const trimmedName = customer.name.trim();
    const rawPhone = (customer.phone || '').trim();
    const cleanDigits = normalizePhoneNumber(rawPhone);
    
    // Deterministic customerId: normalize clean phone digits (or stable name slug)
    const customerId = cleanDigits.length >= 7 
      ? `cust_${cleanDigits}` 
      : (customer.id && !customer.id.startsWith('cust_name_')
          ? customer.id
          : `cust_name_${encodeURIComponent(trimmedName.toLowerCase().replace(/\s+/g, '_')).slice(0, 30)}`);
    const nowIso = new Date().toISOString();

    const customerRecord: SavedCustomer = {
      id: customerId,
      name: trimmedName,
      phone: cleanDigits ? cleanDigits : rawPhone,
      address: customer.address?.trim() || '',
      notes: customer.notes?.trim() || '',
      createdAt: customer.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    await setDoc(docRef, {
      ...customerRecord,
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });

    console.log(`[Firestore] Saved customer ${customerId} (${trimmedName}) to cloud`);
    return customerRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CUSTOMERS_COLLECTION}/${customer.name}`);
  }
}

function deduplicateCustomers(list: SavedCustomer[]): SavedCustomer[] {
  const map = new Map<string, SavedCustomer>();
  for (const c of list) {
    const cleanDigits = normalizePhoneNumber(c.phone);
    const key = cleanDigits.length >= 7 ? `phone_${cleanDigits}` : `name_${c.name.trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        ...c,
        phone: cleanDigits || c.phone,
      });
    } else {
      const existing = map.get(key)!;
      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const currentTime = new Date(c.updatedAt || 0).getTime();
      if (currentTime >= existingTime) {
        map.set(key, {
          ...c,
          phone: cleanDigits || c.phone || existing.phone,
          address: c.address || existing.address,
          notes: c.notes || existing.notes,
        });
      } else {
        map.set(key, {
          ...existing,
          phone: cleanDigits || existing.phone || c.phone,
          address: existing.address || c.address,
          notes: existing.notes || c.notes,
        });
      }
    }
  }
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return result;
}

/**
 * Fetch all registered customers from Firestore Cloud
 */
export async function fetchCustomersFromCloud(): Promise<SavedCustomer[]> {
  try {
    const customersQuery = query(collection(db, CUSTOMERS_COLLECTION), orderBy('serverUpdatedAt', 'desc'));
    const snapshot = await getDocs(customersQuery).catch(async () => {
      // Fallback query if serverUpdatedAt index is missing
      return await getDocs(collection(db, CUSTOMERS_COLLECTION));
    });

    const customers: SavedCustomer[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<SavedCustomer>;
      if (data.name && (data.phone || data.id)) {
        customers.push({
          id: data.id || docSnap.id,
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });

    return deduplicateCustomers(customers);
  } catch (error) {
    console.error('[Firestore] Error fetching customers from cloud:', error);
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, CUSTOMERS_COLLECTION);
    }
    return [];
  }
}

/**
 * Delete a registered customer from Firestore Cloud
 */
export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Deleted customer ${customerId} from cloud`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CUSTOMERS_COLLECTION}/${customerId}`);
  }
}

/**
 * Real-time listener for registered customers
 */
export function subscribeToCustomers(onUpdate: (customers: SavedCustomer[]) => void): () => void {
  try {
    const q = collection(db, CUSTOMERS_COLLECTION);
    return onSnapshot(q, (snapshot) => {
      const customers: SavedCustomer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<SavedCustomer>;
        if (data.name && (data.phone || data.id)) {
          customers.push({
            id: data.id || docSnap.id,
            name: data.name || '',
            phone: data.phone || '',
            address: data.address || '',
            notes: data.notes || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        }
      });
      const uniqueCustomers = deduplicateCustomers(customers);
      onUpdate(uniqueCustomers);
    }, (err) => {
      console.warn('[Firestore] Customers realtime subscription issue:', err);
      if (err && err.message && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.LIST, CUSTOMERS_COLLECTION);
      }
    });
  } catch (error) {
    console.warn('[Firestore] Customers subscribe init failed:', error);
    return () => {};
  }
}
