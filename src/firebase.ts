import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SavedQuote, CustomerInfo, SavedCustomer, Profile, Addon, PricingConfig } from './types';

// Initialize Firebase App safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

// Initialize Firestore with long-polling to prevent 10s connection timeout in browser/iframe
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    dbId
  );
} catch (e) {
  firestoreDb = getFirestore(app, dbId);
}
export const db = firestoreDb;

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const QUOTES_COLLECTION = 'quotes';
const CUSTOMERS_COLLECTION = 'customers';
const SETTINGS_COLLECTION = 'settings';
const PRICING_DOC_ID = 'pricing';
const ADMIN_GATE_COLLECTION = 'admin_gate';

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
      displayName?: string | null;
      email?: string | null;
      photoUrl?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errMessage = error instanceof Error ? error.message : String(error);
  const currentUser = auth.currentUser;
  return {
    error: errMessage,
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) ?? [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) {
          result[k] = stripUndefinedDeep(v);
        }
      }
      return result as T;
    }
  }
  return value;
}

/**
 * Pure-JS SHA-256 fallback for environments where WebCrypto subtle.digest is unavailable
 */
function sha256PureHex(asciiInput: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(asciiInput);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = bytes.length * 8;
  const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((word) => word.toString(16).padStart(8, '0')).join('');
}

/**
 * Computes the one-way client proof token from the admin passcode.
 * No plain-text password or expected server digest exists in frontend code;
 * verification occurs exclusively inside Firestore Security Rules on the server.
 */
export async function computeAdminProof(passcode: string): Promise<string> {
  const payload = `tbw_client_v1:${passcode.trim()}`;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();
  }
  return sha256PureHex(payload).toLowerCase();
}

export async function verifyAdminPasscode(
  passcode: string
): Promise<{ ok: boolean; proof?: string; errorType?: 'invalid_passcode' | 'network' }> {
  const trimmed = passcode.trim();
  if (!trimmed) {
    return { ok: false, errorType: 'invalid_passcode' };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, errorType: 'network' };
  }

  try {
    const proof = await computeAdminProof(trimmed);
    const gateRef = doc(db, ADMIN_GATE_COLLECTION, 'auth_check');
    await withTimeout(
      setDoc(gateRef, {
        proof,
        verifiedAt: serverTimestamp(),
      }),
      12000,
      'انتهت مهلة الاتصال بقاعدة البيانات أثناء التحقق من الرمز السري.'
    );
    return { ok: true, proof };
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const code = (error as { code?: string })?.code?.toLowerCase() || '';
    if (
      code.includes('permission-denied') ||
      msg.includes('permission-denied') ||
      msg.includes('missing or insufficient permissions')
    ) {
      return { ok: false, errorType: 'invalid_passcode' };
    }
    console.error(
      'Admin verification network error:',
      JSON.stringify(buildFirestoreErrorInfo(error, OperationType.WRITE, `${ADMIN_GATE_COLLECTION}/auth_check`))
    );
    return { ok: false, errorType: 'network' };
  }
}

export function sanitizeAndValidatePricing(
  rawProfiles: Record<string, Profile>,
  rawAddons: Record<string, Addon>
): {
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  profileOrder: string[];
  addonOrder: string[];
} {
  if (!rawProfiles || typeof rawProfiles !== 'object') {
    throw new Error('بيانات القطاعات غير صالحة.');
  }

  const profileEntries = Object.entries(rawProfiles);
  if (profileEntries.length === 0) {
    throw new Error('يجب وجود قطاع واحد على الأقل قبل الحفظ.');
  }

  const profiles: Record<string, Profile> = {};
  const profileOrder: string[] = [];

  for (const [key, item] of profileEntries) {
    const id = (item?.id || key || '').trim();
    const name = (item?.name || '').trim();
    const numericPrice = Number(item?.price);

    if (!id) {
      throw new Error('يوجد قطاع بدون معرّف صالح.');
    }
    if (!name) {
      throw new Error('يرجى التأكد من عدم ترك اسم أي قطاع فارغاً.');
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      throw new Error(`سعر القطاع "${name}" غير صالح. يجب أن يكون رقماً موجباً أو صفراً.`);
    }

    const cleanProfile: Profile = {
      id,
      name,
      price: numericPrice,
    };
    if (item?.isFlat) {
      cleanProfile.isFlat = true;
      cleanProfile.unit = (item.unit || 'للقطعة').trim();
    }

    profiles[id] = cleanProfile;
    profileOrder.push(id);
  }

  const addons: Record<string, Addon> = {};
  const addonOrder: string[] = [];

  if (rawAddons && typeof rawAddons === 'object') {
    for (const [key, item] of Object.entries(rawAddons)) {
      const id = (item?.id || key || '').trim();
      const name = (item?.name || '').trim();
      const numericPrice = Number(item?.price);

      if (!id) {
        throw new Error('توجد إضافة بدون معرّف صالح.');
      }
      if (!name) {
        throw new Error('يرجى التأكد من عدم ترك اسم أي إضافة فارغاً.');
      }
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new Error(`سعر الإضافة "${name}" غير صالح. يجب أن يكون رقماً موجباً أو صفراً.`);
      }

      const cleanAddon: Addon = {
        id,
        name,
        price: numericPrice,
      };
      if (item?.isFlat) {
        cleanAddon.isFlat = true;
        cleanAddon.unit = (item.unit || 'للقطعة').trim();
      }

      addons[id] = cleanAddon;
      addonOrder.push(id);
    }
  }

  return { profiles, addons, profileOrder, addonOrder };
}

function reconstructOrderedPricing(data: Record<string, any>): PricingConfig {
  const rawProfiles = (data.profiles && typeof data.profiles === 'object' ? data.profiles : {}) as Record<
    string,
    Profile
  >;
  const rawAddons = (data.addons && typeof data.addons === 'object' ? data.addons : {}) as Record<
    string,
    Addon
  >;

  const savedProfileOrder: string[] = Array.isArray(data.profileOrder)
    ? data.profileOrder.filter((k: unknown): k is string => typeof k === 'string')
    : [];
  const savedAddonOrder: string[] = Array.isArray(data.addonOrder)
    ? data.addonOrder.filter((k: unknown): k is string => typeof k === 'string')
    : [];

  const orderedProfiles: Record<string, Profile> = {};
  const finalProfileOrder: string[] = [];

  for (const id of savedProfileOrder) {
    const p = rawProfiles[id];
    if (p && typeof p === 'object' && typeof p.name === 'string') {
      orderedProfiles[id] = {
        id: p.id || id,
        name: p.name,
        price: Number(p.price) || 0,
        ...(p.isFlat ? { isFlat: true, unit: p.unit || 'للقطعة' } : {}),
      };
      finalProfileOrder.push(id);
    }
  }
  for (const [id, p] of Object.entries(rawProfiles)) {
    if (!orderedProfiles[id] && p && typeof p === 'object' && typeof p.name === 'string') {
      orderedProfiles[id] = {
        id: p.id || id,
        name: p.name,
        price: Number(p.price) || 0,
        ...(p.isFlat ? { isFlat: true, unit: p.unit || 'للقطعة' } : {}),
      };
      finalProfileOrder.push(id);
    }
  }

  const orderedAddons: Record<string, Addon> = {};
  const finalAddonOrder: string[] = [];

  for (const id of savedAddonOrder) {
    const a = rawAddons[id];
    if (a && typeof a === 'object' && typeof a.name === 'string') {
      orderedAddons[id] = {
        id: a.id || id,
        name: a.name,
        price: Number(a.price) || 0,
        ...(a.isFlat ? { isFlat: true, unit: a.unit || 'للقطعة' } : {}),
      };
      finalAddonOrder.push(id);
    }
  }
  for (const [id, a] of Object.entries(rawAddons)) {
    if (!orderedAddons[id] && a && typeof a === 'object' && typeof a.name === 'string') {
      orderedAddons[id] = {
        id: a.id || id,
        name: a.name,
        price: Number(a.price) || 0,
        ...(a.isFlat ? { isFlat: true, unit: a.unit || 'للقطعة' } : {}),
      };
      finalAddonOrder.push(id);
    }
  }

  return {
    profiles: orderedProfiles,
    addons: orderedAddons,
    profileOrder: finalProfileOrder,
    addonOrder: finalAddonOrder,
    version: Number(data.version) || 1,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  };
}

/**
 * Reads the authoritative shared pricing configuration directly from Firestore server
 * (bypassing any stale browser cache).
 */
export async function fetchPricingFromCloud(): Promise<PricingConfig | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('لا يوجد اتصال بالإنترنت لتحميل أحدث الأسعار من قاعدة البيانات.');
  }

  const pricingRef = doc(db, SETTINGS_COLLECTION, PRICING_DOC_ID);
  try {
    const snap = await withTimeout(
      getDocFromServer(pricingRef),
      12000,
      'انتهت مهلة الاتصال بقاعدة البيانات لتحميل الأسعار.'
    );
    if (!snap.exists()) {
      return null;
    }
    const config = reconstructOrderedPricing(snap.data());
    if (Object.keys(config.profiles).length === 0) {
      return null;
    }
    return config;
  } catch (error) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(
        buildFirestoreErrorInfo(error, OperationType.GET, `${SETTINGS_COLLECTION}/${PRICING_DOC_ID}`)
      )
    );
    throw error;
  }
}

/**
 * Real-time listener for authoritative server-side pricing updates across open visitor tabs.
 * Ignores cached or unconfirmed local snapshots so stale cache never overwrites live prices.
 */
export function subscribeToPricing(
  onUpdate: (config: PricingConfig) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const pricingRef = doc(db, SETTINGS_COLLECTION, PRICING_DOC_ID);
    return onSnapshot(
      pricingRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) {
          return;
        }
        if (!snap.exists()) {
          return;
        }
        const config = reconstructOrderedPricing(snap.data());
        if (Object.keys(config.profiles).length > 0) {
          onUpdate(config);
        }
      },
      (err) => {
        console.warn('[Firestore] Pricing realtime subscription error:', err);
        if (onError) {
          onError(err);
        }
      }
    );
  } catch (error) {
    console.warn('[Firestore] Pricing subscribe init failed:', error);
    return () => {};
  }
}

/**
 * Atomically saves and server-verifies the updated pricing catalog in Firestore.
 * Throws a descriptive Arabic error if validation, authorization, or network persistence fails.
 */
export async function savePricingToCloud(
  rawProfiles: Record<string, Profile>,
  rawAddons: Record<string, Addon>,
  adminProof: string
): Promise<PricingConfig> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('فشل حفظ الأسعار: لا يوجد اتصال بالإنترنت حالياً.');
  }

  if (!adminProof || !/^[0-9a-f]{64}$/.test(adminProof)) {
    throw new Error('انتهت صلاحية جلسة المشرف. يرجى إعادة إدخال الرمز السري والمحاولة مرة أخرى.');
  }

  const { profiles, addons, profileOrder, addonOrder } = sanitizeAndValidatePricing(
    rawProfiles,
    rawAddons
  );

  const pricingRef = doc(db, SETTINGS_COLLECTION, PRICING_DOC_ID);
  const gateRef = doc(db, ADMIN_GATE_COLLECTION, 'pricing_write');

  try {
    // 1. Read authoritative server version to guarantee strictly monotonic version increment
    const currentSnap = await withTimeout(
      getDocFromServer(pricingRef),
      12000,
      'انتهت مهلة القراءة من قاعدة البيانات قبل الحفظ. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
    );
    const currentVersion = currentSnap.exists() ? Number(currentSnap.data()?.version) || 0 : 0;
    const nextVersion = currentVersion + 1;
    const updatedAt = new Date().toISOString();

    // 2. Commit atomic batch: admin cryptographic proof gate + pricing catalog document
    const batch = writeBatch(db);
    batch.set(gateRef, {
      proof: adminProof,
      verifiedAt: serverTimestamp(),
    });
    batch.set(pricingRef, {
      profiles,
      addons,
      profileOrder,
      addonOrder,
      version: nextVersion,
      updatedAt,
      serverUpdatedAt: serverTimestamp(),
    });

    await withTimeout(
      batch.commit(),
      15000,
      'انتهت مهلة حفظ التعديلات في قاعدة البيانات. لم يتم تأكيد الحفظ، يرجى المحاولة مرة أخرى.'
    );

    // 3. Re-read directly from Firestore server to confirm persistence
    const confirmedSnap = await withTimeout(
      getDocFromServer(pricingRef),
      12000,
      'تم إرسال التعديلات ولكن تعذر تأكيد قراءتها من الخادم. يرجى التحقق من الاتصال.'
    );

    if (!confirmedSnap.exists()) {
      throw new Error('لم يتم العثور على سجل الأسعار في قاعدة البيانات بعد الحفظ.');
    }

    const confirmedConfig = reconstructOrderedPricing(confirmedSnap.data());
    if (confirmedConfig.version < nextVersion) {
      throw new Error('لم يتم تأكيد تحديث رقم إصدار الأسعار على الخادم.');
    }

    return confirmedConfig;
  } catch (error) {
    console.error(
      'Firestore Error: ',
      JSON.stringify(
        buildFirestoreErrorInfo(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${PRICING_DOC_ID}`)
      )
    );

    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();
    const code = (error as { code?: string })?.code?.toLowerCase() || '';

    if (
      code.includes('permission-denied') ||
      lower.includes('permission-denied') ||
      lower.includes('missing or insufficient permissions')
    ) {
      throw new Error('فشل الحفظ: غير مصرح بتعديل الأسعار أو الرمز السري غير صالح.');
    }
    if (lower.includes('offline') || code.includes('unavailable')) {
      throw new Error('تعذر الاتصال بقاعدة البيانات (أنت غير متصل بالإنترنت). لم يتم حفظ التعديلات.');
    }
    if (/[\u0600-\u06FF]/.test(msg)) {
      throw new Error(msg);
    }
    throw new Error('تعذر حفظ الأسعار في قاعدة البيانات. يرجى المحاولة مرة أخرى.');
  }
}

/**
 * Normalizes any phone number format (converts Arabic numerals, removes symbols, normalizes Egyptian country code)
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
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
  if (
    digits.length === 10 &&
    (digits.startsWith('10') ||
      digits.startsWith('11') ||
      digits.startsWith('12') ||
      digits.startsWith('15'))
  ) {
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
    const sanitizedQuote = stripUndefinedDeep(quote);
    await setDoc(
      docRef,
      {
        ...sanitizedQuote,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`[Firestore] Saved quote ${quote.id} to cloud successfully`);

    // Automatically index customer in the customers directory
    if (quote.customer && quote.customer.name && quote.customer.name.trim()) {
      try {
        await saveCustomerToCloud({
          name: quote.customer.name.trim(),
          phone: quote.customer.phone?.trim() || '',
          address: quote.customer.address?.trim() || '',
        });
        console.log(
          `[Firestore] Automatically indexed customer ${quote.customer.name} from quote ${quote.id}`
        );
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
    const quotesQuery = query(
      collection(db, QUOTES_COLLECTION),
      orderBy('serverUpdatedAt', 'desc')
    );
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

      const quoteRecord: SavedQuote = {
        id: data.id || docSnap.id,
        name: data.name || 'عرض سعر بدون اسم',
        customer: customerData,
        items: Array.isArray(data.items) ? data.items : [],
        totalPrice: Number(data.totalPrice) || 0,
        date: data.date || new Date().toLocaleDateString('ar-EG'),
      };
      if (data.pricingSnapshot && typeof data.pricingSnapshot === 'object') {
        quoteRecord.pricingSnapshot = data.pricingSnapshot;
      }
      quotes.push(quoteRecord);
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
    return onSnapshot(
      q,
      (snapshot) => {
        const quotes: SavedQuote[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<SavedQuote>;
          const customerData: CustomerInfo = {
            ...defaultCustomer,
            ...(data.customer || {}),
            date: data.customer?.date || data.date || new Date().toLocaleDateString('ar-EG'),
          };

          const quoteRecord: SavedQuote = {
            id: data.id || docSnap.id,
            name: data.name || 'عرض سعر بدون اسم',
            customer: customerData,
            items: Array.isArray(data.items) ? data.items : [],
            totalPrice: Number(data.totalPrice) || 0,
            date: data.date || new Date().toLocaleDateString('ar-EG'),
          };
          if (data.pricingSnapshot && typeof data.pricingSnapshot === 'object') {
            quoteRecord.pricingSnapshot = data.pricingSnapshot;
          }
          quotes.push(quoteRecord);
        });
        onUpdate(quotes);
      },
      (err) => {
        console.warn('[Firestore] Realtime subscription issue:', err);
        if (err && err.message && err.message.includes('permission')) {
          handleFirestoreError(err, OperationType.LIST, QUOTES_COLLECTION);
        }
      }
    );
  } catch (error) {
    console.warn('[Firestore] Subscribe init failed:', error);
    return () => {};
  }
}

/**
 * Save or update a registered customer in Firestore Cloud
 */
export async function saveCustomerToCloud(
  customer: Partial<SavedCustomer> & { name: string; phone?: string }
): Promise<SavedCustomer> {
  try {
    const trimmedName = customer.name.trim();
    const rawPhone = (customer.phone || '').trim();
    const cleanDigits = normalizePhoneNumber(rawPhone);

    // Deterministic customerId: normalize clean phone digits (or stable name slug)
    const customerId =
      cleanDigits.length >= 7
        ? `cust_${cleanDigits}`
        : customer.id && !customer.id.startsWith('cust_name_')
        ? customer.id
        : `cust_name_${encodeURIComponent(trimmedName.toLowerCase().replace(/\s+/g, '_')).slice(
            0,
            30
          )}`;
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
    await setDoc(
      docRef,
      {
        ...customerRecord,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

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
    const key =
      cleanDigits.length >= 7 ? `phone_${cleanDigits}` : `name_${c.name.trim().toLowerCase()}`;
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
  result.sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
  return result;
}

/**
 * Fetch all registered customers from Firestore Cloud
 */
export async function fetchCustomersFromCloud(): Promise<SavedCustomer[]> {
  try {
    const customersQuery = query(
      collection(db, CUSTOMERS_COLLECTION),
      orderBy('serverUpdatedAt', 'desc')
    );
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
    return onSnapshot(
      q,
      (snapshot) => {
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
      },
      (err) => {
        console.warn('[Firestore] Customers realtime subscription issue:', err);
        if (err && err.message && err.message.includes('permission')) {
          handleFirestoreError(err, OperationType.LIST, CUSTOMERS_COLLECTION);
        }
      }
    );
  } catch (error) {
    console.warn('[Firestore] Customers subscribe init failed:', error);
    return () => {};
  }
}
