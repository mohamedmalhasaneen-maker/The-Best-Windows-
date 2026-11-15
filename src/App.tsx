import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Plus, Calculator, QrCode, FileText, DoorClosed, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  QuoteItem,
  CalculationResult,
  CustomerInfo,
  Profile,
  Addon,
  SavedQuote,
  SavedWpcQuote,
  SavedArmoredQuote,
  SavedCustomer,
  PricingConfig,
  WpcDoorItem,
  ArmoredDoorItem,
  WpcPricingConfig,
  ArmoredDoorTypeConfig,
  DoorsPricingConfig,
} from './types';
import { PROFILES, ADDONS, BRAND_NAME } from './constants';
import {
  DEFAULT_WPC_PRICING_CONFIG,
  cloneDefaultWpcPricingConfig,
} from './constants/wpcConstants';
import {
  DEFAULT_ARMORED_DOOR_TYPES,
  cloneDefaultArmoredDoorTypes,
  calculateArmoredQuoteTotal,
} from './constants/armoredConstants';
import { DevSettingsModal } from './components/DevSettingsModal';
import {
  saveQuoteToCloud,
  fetchQuotesFromCloud,
  deleteQuoteFromCloud,
  subscribeToQuotes,
  saveWpcQuoteToCloud,
  fetchWpcQuotesFromCloud,
  deleteWpcQuoteFromCloud,
  subscribeToWpcQuotes,
  saveArmoredQuoteToCloud,
  fetchArmoredQuotesFromCloud,
  deleteArmoredQuoteFromCloud,
  subscribeToArmoredQuotes,
  saveCustomerToCloud,
  fetchCustomersFromCloud,
  deleteCustomerFromCloud,
  subscribeToCustomers,
  normalizePhoneNumber,
  fetchPricingFromCloud,
  subscribeToPricing,
  savePricingToCloud,
  fetchDoorsPricingFromCloud,
  subscribeToDoorsPricing,
  saveDoorsPricingToCloud,
} from './firebase';

import Header from './components/Header';
import ItemCard from './components/ItemCard';
import CustomerForm from './components/CustomerForm';
import DetailedQuoteView from './components/DetailedQuoteView';
import WpcDetailedQuoteView from './components/WpcDetailedQuoteView';
import ArmoredDetailedQuoteView from './components/ArmoredDetailedQuoteView';
import SummaryBox from './components/SummaryBox';
import PricingTable from './components/PricingTable';
import Features from './components/Features';
import QrModal from './components/QrModal';
import SavedQuotesModal from './components/SavedQuotesModal';
import SavedWpcQuotesModal from './components/SavedWpcQuotesModal';
import SavedArmoredQuotesModal from './components/SavedArmoredQuotesModal';
import CustomersModal from './components/CustomersModal';
import PasswordModal from './components/PasswordModal';
import { WpcDoorsSection } from './components/WpcDoorsSection';
import { ArmoredDoorsSection } from './components/ArmoredDoorsSection';
import { useOnlineStatus, useServiceWorkerUpdater } from './hooks/usePWA';
import {
  SaveFeedbackToast,
  type SaveFeedbackNotice,
  type SaveOutcomeStatus,
} from './components/PWAControls';
import {
  deleteOfflineRecord,
  enqueueSyncOp,
  flushSyncQueue,
  getAllSyncOps,
  getDoorsPricingCache,
  getOfflineDraft,
  getOfflineRecords,
  getPricingCache,
  mergeRecordsWithPendingQueue,
  migrateLegacyLocalStorageToIndexedDb,
  putOfflineRecord,
  removeSyncOp,
  replaceOfflineRecords,
  saveDoorsPricingCache,
  saveOfflineDraft,
  savePricingCache,
  type SyncQueueExecutor,
} from './utils/offlineDb';

const formatCurrency = (value: number) => {
  return (
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value) + ' ج.م'
  );
};

export default function App() {
  const isOnline = useOnlineStatus();
  useServiceWorkerUpdater(isOnline);

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [saveNotice, setSaveNotice] = useState<SaveFeedbackNotice | null>(null);
  const hasHydratedIdbRef = useRef(false);
  const pvcDraftEditedRef = useRef(false);
  const wpcDraftEditedRef = useRef(false);
  const armoredDraftEditedRef = useRef(false);

  const showSaveNotice = useCallback((status: SaveOutcomeStatus, message: string) => {
    const id = Date.now();
    setSaveNotice({ id, status, message });
    window.setTimeout(() => {
      setSaveNotice((prev) => (prev && prev.id === id ? null : prev));
    }, 3800);
  }, []);

  const [activeSystem, setActiveSystem] = useState<'pvc' | 'wpc' | 'armored'>('pvc');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isSavedQuotesModalOpen, setIsSavedQuotesModalOpen] = useState(false);
  const [isSavedWpcQuotesModalOpen, setIsSavedWpcQuotesModalOpen] = useState(false);
  const [isSavedArmoredQuotesModalOpen, setIsSavedArmoredQuotesModalOpen] = useState(false);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<
    'quotes' | 'wpc-quotes' | 'armored-quotes' | 'customers' | null
  >(null);
  const [activeMainTab, setActiveMainTab] = useState<'input' | 'quote'>('input');
  const [activeWpcMainTab, setActiveWpcMainTab] = useState<'input' | 'quote'>('input');
  const [activeArmoredMainTab, setActiveArmoredMainTab] = useState<'input' | 'quote'>('input');

  const [wpcDoors, setWpcDoors] = useState<WpcDoorItem[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_draft_wpc_doors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('almekawy_draft_wpc_doors', JSON.stringify(wpcDoors));
    } catch {}
  }, [wpcDoors]);

  const [armoredDoors, setArmoredDoors] = useState<ArmoredDoorItem[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_draft_armored_doors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('almekawy_draft_armored_doors', JSON.stringify(armoredDoors));
    } catch {}
  }, [armoredDoors]);

  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_saved_customers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_saved_quotes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedWpcQuotes, setSavedWpcQuotes] = useState<SavedWpcQuote[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_saved_wpc_quotes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedArmoredQuotes, setSavedArmoredQuotes] = useState<SavedArmoredQuote[]>(() => {
    try {
      const saved = localStorage.getItem('almekawy_saved_armored_quotes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [wpcCustomer, setWpcCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    discountType: 'cash',
    discountValue: 0,
    notes: '',
    notesAmount: 0,
    additionalNotes: [],
  });

  const [armoredCustomer, setArmoredCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    discountType: 'cash',
    discountValue: 0,
    notes: '',
    notesAmount: 0,
    additionalNotes: [],
  });

  // Authoritative shared pricing state (loaded strictly from Firestore, never from localStorage)
  const [profiles, setProfiles] = useState<Record<string, Profile>>(PROFILES);
  const [addons, setAddons] = useState<Record<string, Addon>>(ADDONS);
  const pricingVersionRef = useRef<number>(0);
  const [pricingSyncStatus, setPricingSyncStatus] = useState<'loading' | 'synced' | 'error'>(
    'loading'
  );
  const [pricingErrorText, setPricingErrorText] = useState<string | null>(null);

  // Authoritative shared Doors Pricing state (WPC + Armored, strictly isolated from PVC and never stored in localStorage)
  const [doorsPricing, setDoorsPricing] = useState<DoorsPricingConfig>(() => ({
    wpc: cloneDefaultWpcPricingConfig(),
    armored: cloneDefaultArmoredDoorTypes(),
    version: 0,
    updatedAt: '',
  }));
  const doorsPricingVersionRef = useRef<number>(0);
  const [doorsPricingSyncStatus, setDoorsPricingSyncStatus] = useState<
    'loading' | 'synced' | 'error'
  >('loading');
  const [doorsPricingErrorText, setDoorsPricingErrorText] = useState<string | null>(null);

  // Preserves historical saved quote prices when viewing a previously saved quotation
  const [loadedQuotePricing, setLoadedQuotePricing] = useState<{
    quoteName: string;
    profiles: Record<string, Profile>;
    addons: Record<string, Addon>;
  } | null>(null);
  const loadedQuotePricingRef = useRef(loadedQuotePricing);
  useEffect(() => {
    loadedQuotePricingRef.current = loadedQuotePricing;
  }, [loadedQuotePricing]);

  const effectiveProfiles = loadedQuotePricing ? loadedQuotePricing.profiles : profiles;
  const effectiveAddons = loadedQuotePricing ? loadedQuotePricing.addons : addons;

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    discountType: 'cash',
    discountValue: 0,
    notes: '',
    notesAmount: 0,
    additionalNotes: [],
  });

  const [items, setItems] = useState<QuoteItem[]>(() => {
    const initialProfile = Object.keys(PROFILES)[0] || 'newline';
    return [
      {
        id: Date.now(),
        title: 'بند رقم 1 (مثال: شباك غرفه)',
        itemType: 'window',
        width: 120,
        height: 120,
        profile: initialProfile,
        opening: 'جرار',
        innerType: 'glass',
        glassType: 'أبيض شفاف',
        addons: [],
        quantity: 1,
      },
    ];
  });

  const applyConfirmedPricing = useCallback((config: PricingConfig) => {
    if (config.version < pricingVersionRef.current) {
      return;
    }
    pricingVersionRef.current = config.version;
    setProfiles(config.profiles);
    setAddons(config.addons);
    setPricingSyncStatus('synced');
    setPricingErrorText(null);

    if (config.version > 0) {
      void savePricingCache(config);
    }

    // Keep active draft items valid if a profile or addon was removed, unless viewing a historical quote snapshot
    if (!loadedQuotePricingRef.current) {
      const fallbackProfile = Object.keys(config.profiles)[0] || 'newline';
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          profile: config.profiles[item.profile] ? item.profile : fallbackProfile,
          addons: item.addons.filter((addonId) => Boolean(config.addons[addonId])),
        }))
      );
    }
  }, []);

  const loadLatestPricingFromServer = useCallback(async () => {
    setPricingSyncStatus((prev) => (prev === 'synced' ? 'synced' : 'loading'));
    try {
      const cloudPricing = await fetchPricingFromCloud();
      if (cloudPricing) {
        applyConfirmedPricing(cloudPricing);
      } else {
        setPricingSyncStatus('synced');
        setPricingErrorText(null);
      }
    } catch (err) {
      console.warn('[Pricing] Could not fetch authoritative pricing from Firestore:', err);
      const cached = await getPricingCache();
      if (cached && cached.data && Object.keys(cached.data.profiles || {}).length > 0) {
        applyConfirmedPricing(cached.data);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        // Offline with no prior cached version yet: permit built-in baseline specs so offline mode works
        setPricingSyncStatus('synced');
        setPricingErrorText(null);
        return;
      }
      if (pricingVersionRef.current === 0) {
        setPricingSyncStatus('error');
        setPricingErrorText(
          'تعذر الاتصال بقاعدة البيانات لتحميل أحدث الأسعار المعتمدة — الأسعار الاحتياطية المعروضة حالياً غير مؤكدة.'
        );
      }
    }
  }, [applyConfirmedPricing]);

  const applyConfirmedDoorsPricing = useCallback((config: DoorsPricingConfig) => {
    if (config.version < doorsPricingVersionRef.current) {
      return;
    }
    doorsPricingVersionRef.current = config.version;
    setDoorsPricing(config);
    setDoorsPricingSyncStatus('synced');
    setDoorsPricingErrorText(null);

    if (config.version > 0) {
      void saveDoorsPricingCache(config);
    }
  }, []);

  const loadLatestDoorsPricingFromServer = useCallback(async () => {
    setDoorsPricingSyncStatus((prev) => (prev === 'synced' ? 'synced' : 'loading'));
    try {
      const cloudDoorsPricing = await fetchDoorsPricingFromCloud();
      if (cloudDoorsPricing) {
        applyConfirmedDoorsPricing(cloudDoorsPricing);
      } else {
        setDoorsPricingSyncStatus('synced');
        setDoorsPricingErrorText(null);
      }
    } catch (err) {
      console.warn('[DoorsPricing] Could not fetch authoritative doors pricing:', err);
      const cached = await getDoorsPricingCache();
      if (cached && cached.data && Array.isArray(cached.data.armored)) {
        applyConfirmedDoorsPricing(cached.data);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setDoorsPricingSyncStatus('synced');
        setDoorsPricingErrorText(null);
        return;
      }
      if (doorsPricingVersionRef.current === 0) {
        setDoorsPricingSyncStatus('error');
        setDoorsPricingErrorText(
          'تعذر الاتصال بقاعدة البيانات لتحميل أحدث أسعار أبواب WPC والأبواب المصفحة.'
        );
      }
    }
  }, [applyConfirmedDoorsPricing]);

  useEffect(() => {
    // Purge legacy browser-local pricing overrides so localStorage can never shadow shared database prices
    try {
      localStorage.removeItem('almekawy_custom_profiles');
      localStorage.removeItem('almekawy_custom_addons');
    } catch {}

    // Pre-hydrate cached authoritative pricing immediately from IndexedDB so offline startups are instant
    void (async () => {
      const [cachedPvc, cachedDoors] = await Promise.all([
        getPricingCache(),
        getDoorsPricingCache(),
      ]);
      if (cachedPvc?.data && pricingVersionRef.current === 0) {
        applyConfirmedPricing(cachedPvc.data);
      }
      if (cachedDoors?.data && doorsPricingVersionRef.current === 0) {
        applyConfirmedDoorsPricing(cachedDoors.data);
      }
      void loadLatestPricingFromServer();
      void loadLatestDoorsPricingFromServer();
    })();

    const handleOnline = () => {
      void loadLatestPricingFromServer();
      void loadLatestDoorsPricingFromServer();
    };
    window.addEventListener('online', handleOnline);

    const unsubscribePricing = subscribeToPricing(
      (livePricing) => {
        applyConfirmedPricing(livePricing);
      },
      () => {
        if (pricingVersionRef.current === 0 && navigator.onLine) {
          setPricingSyncStatus('error');
          setPricingErrorText(
            'تعذر الاتصال بقاعدة البيانات لتحميل أحدث الأسعار المعتمدة — الأسعار الاحتياطية المعروضة حالياً غير مؤكدة.'
          );
        }
      }
    );

    const unsubscribeDoorsPricing = subscribeToDoorsPricing(
      (liveDoorsPricing) => {
        applyConfirmedDoorsPricing(liveDoorsPricing);
      },
      () => {
        if (doorsPricingVersionRef.current === 0 && navigator.onLine) {
          setDoorsPricingSyncStatus('error');
          setDoorsPricingErrorText(
            'تعذر الاتصال بقاعدة البيانات لتحميل أحدث أسعار أبواب WPC والأبواب المصفحة.'
          );
        }
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      if (typeof unsubscribePricing === 'function') unsubscribePricing();
      if (typeof unsubscribeDoorsPricing === 'function') unsubscribeDoorsPricing();
    };
  }, [
    applyConfirmedPricing,
    loadLatestPricingFromServer,
    applyConfirmedDoorsPricing,
    loadLatestDoorsPricingFromServer,
  ]);

  const refreshPendingSyncCount = useCallback(async () => {
    const ops = await getAllSyncOps();
    setPendingSyncCount(ops.length);
    return ops;
  }, []);

  const mergeAndPersistEntityList = useCallback(
    async <T extends { id: string }>(
      entityType: 'quote' | 'wpc_quote' | 'armored_quote' | 'customer',
      cloudRecords: T[],
      localRecords: T[],
      localStorageKey: string,
      setter: (items: T[]) => void
    ) => {
      const pendingOps = await getAllSyncOps();
      const merged = mergeRecordsWithPendingQueue(
        cloudRecords,
        localRecords,
        pendingOps,
        entityType
      );
      setter(merged);
      await replaceOfflineRecords(entityType, merged);
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(merged));
      } catch {}
    },
    []
  );

  const savedQuotesRef = useRef(savedQuotes);
  const savedWpcQuotesRef = useRef(savedWpcQuotes);
  const savedArmoredQuotesRef = useRef(savedArmoredQuotes);
  const savedCustomersRef = useRef(savedCustomers);
  useEffect(() => {
    savedQuotesRef.current = savedQuotes;
  }, [savedQuotes]);
  useEffect(() => {
    savedWpcQuotesRef.current = savedWpcQuotes;
  }, [savedWpcQuotes]);
  useEffect(() => {
    savedArmoredQuotesRef.current = savedArmoredQuotes;
  }, [savedArmoredQuotes]);
  useEffect(() => {
    savedCustomersRef.current = savedCustomers;
  }, [savedCustomers]);

  const fetchCustomersFromAllSources = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const cloudCust = await fetchCustomersFromCloud();
      if (cloudCust && cloudCust.length > 0) {
        await mergeAndPersistEntityList(
          'customer',
          cloudCust,
          savedCustomersRef.current,
          'almekawy_saved_customers',
          setSavedCustomers
        );
        return;
      }
    } catch (err) {
      console.warn('Cloud customers fetch fallback:', err);
    }

    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          void mergeAndPersistEntityList(
            'customer',
            data,
            savedCustomersRef.current,
            'almekawy_saved_customers',
            setSavedCustomers
          );
        }
      })
      .catch((err) => {
        console.warn('Error loading customers from backend:', err);
      });
  }, [mergeAndPersistEntityList]);

  const syncCustomersFromQuotesList = (quotes: SavedQuote[], currentCustList?: SavedCustomer[]) => {
    if (!Array.isArray(quotes) || quotes.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const existingList = currentCustList || savedCustomersRef.current;
    const knownKeys = new Set(
      existingList.map((c) => {
        const cleanDigits = normalizePhoneNumber(c.phone);
        return cleanDigits.length >= 7
          ? `phone_${cleanDigits}`
          : `name_${c.name.trim().toLowerCase()}`;
      })
    );

    for (const q of quotes) {
      if (q.customer && q.customer.name && q.customer.name.trim()) {
        const custName = q.customer.name.trim();
        const custPhone = (q.customer.phone || '').trim();
        const custAddress = (q.customer.address || '').trim();
        const cleanDigits = normalizePhoneNumber(custPhone);
        const key =
          cleanDigits.length >= 7 ? `phone_${cleanDigits}` : `name_${custName.toLowerCase()}`;

        if (!knownKeys.has(key)) {
          knownKeys.add(key);
          saveCustomerToCloud({
            name: custName,
            phone: custPhone,
            address: custAddress,
          }).catch(() => {});
        }
      }
    }
  };

  const fetchQuotesFromAllSources = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const cloudQuotes = await fetchQuotesFromCloud();
      if (cloudQuotes && cloudQuotes.length > 0) {
        await mergeAndPersistEntityList(
          'quote',
          cloudQuotes,
          savedQuotesRef.current,
          'almekawy_saved_quotes',
          setSavedQuotes
        );
        syncCustomersFromQuotesList(cloudQuotes);
        return;
      }
    } catch (err) {
      console.warn('Cloud quotes fetch fallback:', err);
    }

    // Fallback to local server API if cloud is empty or during offline transitions
    fetch('/api/quotes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          void mergeAndPersistEntityList(
            'quote',
            data,
            savedQuotesRef.current,
            'almekawy_saved_quotes',
            setSavedQuotes
          );
          syncCustomersFromQuotesList(data);
        }
      })
      .catch((err) => {
        console.error('Error loading quotes from server:', err);
      });
  }, [mergeAndPersistEntityList]);

  // One-time IndexedDB hydration + legacy localStorage migration
  useEffect(() => {
    let active = true;
    void (async () => {
      await migrateLegacyLocalStorageToIndexedDb();
      const [
        idbQuotes,
        idbWpcQuotes,
        idbArmoredQuotes,
        idbCustomers,
        pvcDraft,
        wpcDraft,
        armoredDraft,
        ops,
      ] = await Promise.all([
        getOfflineRecords<SavedQuote>('quote'),
        getOfflineRecords<SavedWpcQuote>('wpc_quote'),
        getOfflineRecords<SavedArmoredQuote>('armored_quote'),
        getOfflineRecords<SavedCustomer>('customer'),
        getOfflineDraft<{ key: 'pvc_draft'; customer: CustomerInfo; items: QuoteItem[]; updatedAt: number }>('pvc_draft'),
        getOfflineDraft<{ key: 'wpc_draft'; customer: CustomerInfo; doors: WpcDoorItem[]; updatedAt: number }>('wpc_draft'),
        getOfflineDraft<{ key: 'armored_draft'; customer: CustomerInfo; doors: ArmoredDoorItem[]; updatedAt: number }>('armored_draft'),
        getAllSyncOps(),
      ]);

      if (!active) return;

      if (idbQuotes.length > 0) {
        setSavedQuotes(mergeRecordsWithPendingQueue(idbQuotes, idbQuotes, ops, 'quote'));
      }
      if (idbWpcQuotes.length > 0) {
        setSavedWpcQuotes(mergeRecordsWithPendingQueue(idbWpcQuotes, idbWpcQuotes, ops, 'wpc_quote'));
      }
      if (idbArmoredQuotes.length > 0) {
        setSavedArmoredQuotes(
          mergeRecordsWithPendingQueue(idbArmoredQuotes, idbArmoredQuotes, ops, 'armored_quote')
        );
      }
      if (idbCustomers.length > 0) {
        setSavedCustomers(mergeRecordsWithPendingQueue(idbCustomers, idbCustomers, ops, 'customer'));
      }

      if (pvcDraft && !pvcDraftEditedRef.current) {
        if (pvcDraft.customer) setCustomer(pvcDraft.customer);
        if (Array.isArray(pvcDraft.items) && pvcDraft.items.length > 0) {
          setItems(pvcDraft.items);
        }
      }
      if (wpcDraft && !wpcDraftEditedRef.current) {
        if (wpcDraft.customer) setWpcCustomer(wpcDraft.customer);
        if (Array.isArray(wpcDraft.doors)) setWpcDoors(wpcDraft.doors);
      }
      if (armoredDraft && !armoredDraftEditedRef.current) {
        if (armoredDraft.customer) setArmoredCustomer(armoredDraft.customer);
        if (Array.isArray(armoredDraft.doors)) setArmoredDoors(armoredDraft.doors);
      }

      setPendingSyncCount(ops.length);
      hasHydratedIdbRef.current = true;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist active PVC / WPC / Armored workspace drafts to IndexedDB whenever edited
  useEffect(() => {
    if (!hasHydratedIdbRef.current && !pvcDraftEditedRef.current) return;
    void saveOfflineDraft({
      key: 'pvc_draft',
      customer,
      items,
      updatedAt: Date.now(),
    });
  }, [customer, items]);

  useEffect(() => {
    if (!hasHydratedIdbRef.current && !wpcDraftEditedRef.current) return;
    void saveOfflineDraft({
      key: 'wpc_draft',
      customer: wpcCustomer,
      doors: wpcDoors,
      updatedAt: Date.now(),
    });
  }, [wpcCustomer, wpcDoors]);

  useEffect(() => {
    if (!hasHydratedIdbRef.current && !armoredDraftEditedRef.current) return;
    void saveOfflineDraft({
      key: 'armored_draft',
      customer: armoredCustomer,
      doors: armoredDoors,
      updatedAt: Date.now(),
    });
  }, [armoredCustomer, armoredDoors]);

  const syncQueueExecutor = useMemo<SyncQueueExecutor>(
    () => ({
      saveQuote: async (q) => {
        await saveQuoteToCloud(q);
        fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q),
        }).catch(() => {});
      },
      deleteQuote: async (id) => {
        await deleteQuoteFromCloud(id);
        fetch(`/api/quotes/${id}`, { method: 'DELETE' }).catch(() => {});
      },
      saveWpcQuote: async (q) => {
        await saveWpcQuoteToCloud(q);
      },
      deleteWpcQuote: async (id) => {
        await deleteWpcQuoteFromCloud(id);
      },
      saveArmoredQuote: async (q) => {
        await saveArmoredQuoteToCloud(q);
      },
      deleteArmoredQuote: async (id) => {
        await deleteArmoredQuoteFromCloud(id);
      },
      saveCustomer: async (c) => {
        const saved = await saveCustomerToCloud(c);
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saved),
        }).catch(() => {});
        return saved;
      },
      deleteCustomer: async (id) => {
        await deleteCustomerFromCloud(id);
        fetch(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => {});
      },
    }),
    []
  );

  const runSyncFlush = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await refreshPendingSyncCount();
      return;
    }
    const existingOps = await getAllSyncOps();
    if (existingOps.length === 0) {
      setPendingSyncCount(0);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await flushSyncQueue(syncQueueExecutor);
      setPendingSyncCount(result.remaining);
      if (result.succeeded > 0 && result.remaining === 0) {
        showSaveNotice(
          'cloud',
          `تمت مزامنة ${result.succeeded} ${result.succeeded === 1 ? 'عملية' : 'عمليات'} محفوظة محلياً مع السحابة بنجاح.`
        );
      }
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingSyncCount, showSaveNotice, syncQueueExecutor]);

  useEffect(() => {
    if (isOnline) {
      void runSyncFlush();
    }
  }, [isOnline, runSyncFlush]);

  useEffect(() => {
    let unsubscribeQuotes: (() => void) | undefined;
    let unsubscribeWpcQuotes: (() => void) | undefined;
    let unsubscribeArmoredQuotes: (() => void) | undefined;
    let unsubscribeCustomers: (() => void) | undefined;

    // Defer secondary quotes/customers listeners slightly so authoritative pricing completes first
    const initTimer = window.setTimeout(() => {
      unsubscribeQuotes = subscribeToQuotes((liveQuotes) => {
        if (liveQuotes && liveQuotes.length > 0) {
          void mergeAndPersistEntityList(
            'quote',
            liveQuotes,
            savedQuotesRef.current,
            'almekawy_saved_quotes',
            setSavedQuotes
          );
          syncCustomersFromQuotesList(liveQuotes);
        } else {
          void fetchQuotesFromAllSources();
        }
      });

      unsubscribeWpcQuotes = subscribeToWpcQuotes((liveQuotes) => {
        if (liveQuotes && liveQuotes.length > 0) {
          void mergeAndPersistEntityList(
            'wpc_quote',
            liveQuotes,
            savedWpcQuotesRef.current,
            'almekawy_saved_wpc_quotes',
            setSavedWpcQuotes
          );
        } else {
          void fetchWpcQuotesFromAllSources();
        }
      });

      unsubscribeArmoredQuotes = subscribeToArmoredQuotes((liveQuotes) => {
        if (liveQuotes && liveQuotes.length > 0) {
          void mergeAndPersistEntityList(
            'armored_quote',
            liveQuotes,
            savedArmoredQuotesRef.current,
            'almekawy_saved_armored_quotes',
            setSavedArmoredQuotes
          );
        } else {
          void fetchArmoredQuotesFromAllSources();
        }
      });

      unsubscribeCustomers = subscribeToCustomers((liveCustomers) => {
        if (liveCustomers && liveCustomers.length > 0) {
          void mergeAndPersistEntityList(
            'customer',
            liveCustomers,
            savedCustomersRef.current,
            'almekawy_saved_customers',
            setSavedCustomers
          );
        } else {
          void fetchCustomersFromAllSources();
        }
      });
    }, 400);

    return () => {
      window.clearTimeout(initTimer);
      if (typeof unsubscribeQuotes === 'function') unsubscribeQuotes();
      if (typeof unsubscribeWpcQuotes === 'function') unsubscribeWpcQuotes();
      if (typeof unsubscribeArmoredQuotes === 'function') unsubscribeArmoredQuotes();
      if (typeof unsubscribeCustomers === 'function') unsubscribeCustomers();
    };
  }, [fetchCustomersFromAllSources, fetchQuotesFromAllSources, mergeAndPersistEntityList]);

  useEffect(() => {
    if (isSavedQuotesModalOpen) {
      void fetchQuotesFromAllSources();
    }
  }, [isSavedQuotesModalOpen, fetchQuotesFromAllSources]);

  useEffect(() => {
    if (isCustomersModalOpen) {
      void fetchCustomersFromAllSources();
    }
  }, [isCustomersModalOpen, fetchCustomersFromAllSources]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('almekawy_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem('almekawy_theme', newTheme);
    } catch (e) {}
  };

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [isNativePrinting, setIsNativePrinting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforePrint = () => {
      flushSync(() => {
        setIsNativePrinting(true);
      });
    };
    const handleAfterPrint = () => {
      setIsNativePrinting(false);
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handleSavePrices = async (
    updatedProfiles: Record<string, Profile>,
    updatedAddons: Record<string, Addon>,
    adminProof: string
  ): Promise<PricingConfig> => {
    const confirmedConfig = await savePricingToCloud(updatedProfiles, updatedAddons, adminProof);
    applyConfirmedPricing(confirmedConfig);
    return confirmedConfig;
  };

  const handleResetPrices = async (adminProof: string): Promise<PricingConfig> => {
    const confirmedConfig = await savePricingToCloud(PROFILES, ADDONS, adminProof);
    applyConfirmedPricing(confirmedConfig);
    return confirmedConfig;
  };

  const handleSaveDoorsPricing = async (
    updatedDoorsPricing: { wpc: WpcPricingConfig; armored: ArmoredDoorTypeConfig[] },
    adminProof: string
  ): Promise<DoorsPricingConfig> => {
    const confirmed = await saveDoorsPricingToCloud(updatedDoorsPricing, adminProof);
    applyConfirmedDoorsPricing(confirmed);
    return confirmed;
  };

  const handleResetDoorsPricing = async (
    adminProof: string
  ): Promise<DoorsPricingConfig> => {
    const confirmed = await saveDoorsPricingToCloud(
      {
        wpc: DEFAULT_WPC_PRICING_CONFIG,
        armored: DEFAULT_ARMORED_DOOR_TYPES,
      },
      adminProof
    );
    applyConfirmedDoorsPricing(confirmed);
    return confirmed;
  };

  const usedWpcTypeIds = useMemo(() => {
    const used = new Set<string>();
    const collect = (doors?: WpcDoorItem[]) => {
      if (!Array.isArray(doors)) return;
      for (const d of doors) {
        if (d.packageId) used.add(d.packageId);
        if (d.basePackage !== undefined) used.add(String(d.basePackage));
      }
    };
    collect(wpcDoors);
    for (const q of savedWpcQuotes) collect(q.wpcDoors);
    for (const q of savedQuotes) collect(q.wpcDoors);
    return used;
  }, [wpcDoors, savedWpcQuotes, savedQuotes]);

  const usedArmoredTypeIds = useMemo(() => {
    const used = new Set<string>();
    const collect = (doors?: ArmoredDoorItem[]) => {
      if (!Array.isArray(doors)) return;
      for (const d of doors) {
        if (d.manufactureType) used.add(d.manufactureType);
      }
    };
    collect(armoredDoors);
    for (const q of savedArmoredQuotes) collect(q.armoredDoors);
    return used;
  }, [armoredDoors, savedArmoredQuotes]);

  const switchLoadedQuoteToLivePricing = () => {
    setLoadedQuotePricing(null);
    const fallbackProfile = Object.keys(profiles)[0] || 'newline';
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        profile: profiles[item.profile] ? item.profile : fallbackProfile,
        addons: item.addons.filter((addonId) => Boolean(addons[addonId])),
      }))
    );
  };

  const addNewItem = () => {
    pvcDraftEditedRef.current = true;
    setActiveMainTab('input');
    const defaultProfile = Object.keys(effectiveProfiles)[0] || 'newline';
    const newId = Date.now();
    setItems([
      ...items,
      {
        id: newId,
        title: `بند رقم ${items.length + 1}`,
        itemType: 'window',
        width: 100,
        height: 100,
        profile: defaultProfile,
        opening: 'جرار',
        innerType: 'glass',
        glassType: 'أبيض شفاف',
        addons: [],
        quantity: 1,
      },
    ]);
    return newId;
  };

  const handleDuplicateItem = (itemToDuplicate: QuoteItem) => {
    pvcDraftEditedRef.current = true;
    setActiveMainTab('input');
    const newId = Date.now();
    const newItem: QuoteItem = {
      ...itemToDuplicate,
      id: newId,
      title: `${itemToDuplicate.title} (نسخة)`,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: number) => {
    pvcDraftEditedRef.current = true;
    setItems((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        const defaultProfile = Object.keys(effectiveProfiles)[0] || 'newline';
        // If all items removed, reset with 1 default window item
        return [
          {
            id: Date.now(),
            title: 'شباك 1',
            itemType: 'window',
            width: 100,
            height: 100,
            profile: defaultProfile,
            opening: 'جرار',
            innerType: 'glass',
            glassType: 'أبيض شفاف',
            addons: [],
            quantity: 1,
          },
        ];
      }
      return remaining;
    });
  };

  const updateItem = (id: number, field: string, value: any) => {
    pvcDraftEditedRef.current = true;
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updatedItem: QuoteItem = { ...item, [field]: value };

          // Logical constraints when switching item type
          if (field === 'itemType') {
            let newAddons = [...item.addons];
            if (value === 'window') {
              // Remove balcony items
              newAddons = newAddons.filter(
                (aid) => aid !== 'skewBalcony1' && aid !== 'skewBalcony2'
              );
            } else if (value === 'balcony') {
              // Remove window items
              newAddons = newAddons.filter((aid) => aid !== 'skewWindow1' && aid !== 'skewWindow2');
            } else if (value === 'door') {
              // Remove tilt-and-turn (skew) additions, double handle, and pombe
              newAddons = newAddons.filter(
                (aid) =>
                  aid !== 'skewWindow1' &&
                  aid !== 'skewWindow2' &&
                  aid !== 'skewBalcony1' &&
                  aid !== 'skewBalcony2' &&
                  aid !== 'doubleHandle' &&
                  aid !== 'pombe'
              );
            }
            updatedItem.addons = newAddons;
          }

          // Logical constraints when switching opening mechanism & sash counts (hingePanes)
          if (field === 'opening') {
            if (value !== 'مفصلي') {
              updatedItem.addons = item.addons.filter(
                (aid) =>
                  aid !== 'skewWindow1' &&
                  aid !== 'skewWindow2' &&
                  aid !== 'skewBalcony1' &&
                  aid !== 'skewBalcony2'
              );
            } else {
              const currentHinge = item.hingePanes || 'ضلفة';
              if (currentHinge === 'ضلفة') {
                updatedItem.addons = item.addons.filter(
                  (aid) =>
                    aid !== 'skewWindow2' && aid !== 'skewBalcony2' && aid !== 'doubleHandle'
                );
              } else if (currentHinge === 'ضلفتين') {
                updatedItem.addons = item.addons.filter(
                  (aid) => aid !== 'skewWindow1' && aid !== 'skewBalcony1'
                );
              }
            }

            if (value !== 'قلاب') {
              updatedItem.exhaustFan = undefined;
              updatedItem.exhaustFanLocation = undefined;
            } else {
              updatedItem.exhaustFan = item.opening === 'قلاب' ? item.exhaustFan || 'without' : 'without';
              if (updatedItem.exhaustFan !== 'with') {
                updatedItem.exhaustFanLocation = undefined;
              }
            }
          }

          if (field === 'exhaustFan') {
            if (item.opening !== 'قلاب') {
              updatedItem.exhaustFan = undefined;
              updatedItem.exhaustFanLocation = undefined;
            } else if (value === 'with') {
              updatedItem.exhaustFan = 'with';
              updatedItem.exhaustFanLocation = item.exhaustFanLocation || 'glass';
            } else {
              updatedItem.exhaustFan = 'without';
              updatedItem.exhaustFanLocation = undefined;
            }
          }

          if (field === 'exhaustFanLocation') {
            if (item.opening === 'قلاب' && item.exhaustFan === 'with') {
              updatedItem.exhaustFanLocation = value === 'profile' ? 'profile' : 'glass';
            } else {
              updatedItem.exhaustFanLocation = undefined;
            }
          }

          if (field === 'hingePanes') {
            if (item.opening === 'مفصلي') {
              if (value === 'ضلفة') {
                updatedItem.addons = item.addons.filter(
                  (aid) =>
                    aid !== 'skewWindow2' && aid !== 'skewBalcony2' && aid !== 'doubleHandle'
                );
              } else if (value === 'ضلفتين') {
                updatedItem.addons = item.addons.filter(
                  (aid) => aid !== 'skewWindow1' && aid !== 'skewBalcony1'
                );
              }
            }
          }

          // Logical constraints for innerType (Panel vs Glass)
          if (field === 'innerType') {
            if (value === 'panel') {
              // Remove glass-related addons when Panel Only is selected
              updatedItem.addons = item.addons.filter(
                (aid) => aid !== 'doubleGlass' && aid !== 'colorGlass'
              );
              updatedItem.glassType = 'بدون زجاج (بنل فقط)';
            } else if (
              (value === 'glass' || value === 'panel_glass') &&
              item.glassType === 'بدون زجاج (بنل فقط)'
            ) {
              updatedItem.glassType = 'أبيض شفاف';
            }
          }

          // Logical constraints for add-ons
          if (field === 'addons') {
            const newAddons = [...value];
            if (value.includes('blackout') && item.addons.indexOf('blackout') === -1) {
              const index = newAddons.indexOf('pleated');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('pleated') && item.addons.indexOf('pleated') === -1) {
              const index = newAddons.indexOf('blackout');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('doubleGlass') && item.addons.indexOf('doubleGlass') === -1) {
              const index = newAddons.indexOf('colorGlass');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('colorGlass') && item.addons.indexOf('colorGlass') === -1) {
              const index = newAddons.indexOf('doubleGlass');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('skewWindow1') && item.addons.indexOf('skewWindow1') === -1) {
              const index = newAddons.indexOf('skewWindow2');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('skewWindow2') && item.addons.indexOf('skewWindow2') === -1) {
              const index = newAddons.indexOf('skewWindow1');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('skewBalcony1') && item.addons.indexOf('skewBalcony1') === -1) {
              const index = newAddons.indexOf('skewBalcony2');
              if (index > -1) newAddons.splice(index, 1);
            }
            if (value.includes('skewBalcony2') && item.addons.indexOf('skewBalcony2') === -1) {
              const index = newAddons.indexOf('skewBalcony1');
              if (index > -1) newAddons.splice(index, 1);
            }
            updatedItem.addons = newAddons;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const toggleAddon = (itemId: number, addonId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    let newAddons = [...item.addons];
    if (newAddons.includes(addonId)) {
      newAddons = newAddons.filter((a) => a !== addonId);
    } else {
      newAddons.push(addonId);
    }
    updateItem(itemId, 'addons', newAddons);
  };

  const calculations = useMemo<CalculationResult>(() => {
    let totalArea = 0;
    let totalPrice = 0;

    const itemsCalculated = items.map((item) => {
      const qty = item.quantity || 1;
      const w = item.width || 0;
      const h = item.height || 0;
      let area = (w * h) / 10000;

      // Industrial norm: minimum 1m² for both windows and doors
      const minArea = 1.0;
      if (area > 0 && area < minArea) area = minArea;

      totalArea += area * qty;

      const selectedProfile = effectiveProfiles[item.profile];
      const isFlatProfile = Boolean(selectedProfile?.isFlat);
      let rawProfilePrice = selectedProfile?.price || 0;
      if (item.addons.includes('panda')) {
        rawProfilePrice = rawProfilePrice * 1.5;
      }
      const profilePrice = isFlatProfile ? 0 : rawProfilePrice;
      const flatProfilePrice = isFlatProfile ? rawProfilePrice : 0;

      let addonsPrice = 0;
      let flatAddonsPrice = 0;

      item.addons.forEach((id) => {
        const addon = effectiveAddons[id];
        if (addon) {
          if (addon.isFlat) {
            flatAddonsPrice += addon.price;
          } else {
            addonsPrice += addon.price;
          }
        }
      });

      let singleItemTotal =
        area * (profilePrice + addonsPrice) + flatProfilePrice + flatAddonsPrice;
      if (item.fixedPrice && item.fixedPrice > 0) {
        singleItemTotal = item.fixedPrice;
      }
      const itemTotal = singleItemTotal * qty;
      totalPrice += itemTotal;

      return {
        ...item,
        area,
        itemTotal,
        profilePrice,
        flatProfilePrice,
        addonsPrice,
        flatAddonsPrice,
      };
    });

    return { itemsCalculated, totalArea, totalPrice };
  }, [items, effectiveProfiles, effectiveAddons]);

  const handleAddWpcDoor = (newDoor: WpcDoorItem) => {
    wpcDraftEditedRef.current = true;
    setWpcDoors((prev) => [...prev, newDoor]);
  };

  const handleUpdateWpcDoor = (id: number, updatedFields: Partial<WpcDoorItem>) => {
    wpcDraftEditedRef.current = true;
    setWpcDoors((prev) =>
      prev.map((d) => (d.id === id ? ({ ...d, ...updatedFields } as WpcDoorItem) : d))
    );
  };

  const handleRemoveWpcDoor = (id: number) => {
    wpcDraftEditedRef.current = true;
    setWpcDoors((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDuplicateWpcDoor = (door: WpcDoorItem) => {
    wpcDraftEditedRef.current = true;
    const duplicate: WpcDoorItem = {
      ...door,
      id: Date.now(),
      title: `${door.title} (نسخة)`,
    };
    setWpcDoors((prev) => [...prev, duplicate]);
  };

  const wpcTotalPrice = useMemo(() => {
    return wpcDoors.reduce((sum, d) => sum + d.totalPrice, 0);
  }, [wpcDoors]);

  const handleCustomerChange = (field: keyof CustomerInfo, value: any) => {
    pvcDraftEditedRef.current = true;
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCurrentQuote = async (name: string): Promise<SaveOutcomeStatus> => {
    const combinedSubtotal = calculations.totalPrice + wpcTotalPrice;
    const finalPrice = (() => {
      const val = customer.discountValue || 0;
      const type = customer.discountType || 'cash';
      const notesAmount = customer.notesAmount || 0;
      const additionalNotesSum =
        customer.additionalNotes?.reduce((sum, n) => sum + (n.amount || 0), 0) || 0;
      const totalNotesAmount = notesAmount + additionalNotesSum;
      const discountAmt =
        type === 'percentage' ? combinedSubtotal * (val / 100) : val;
      return Math.max(0, combinedSubtotal - discountAmt + totalNotesAmount);
    })();

    const newQuote: SavedQuote = {
      id: Date.now().toString(),
      name: name,
      customer: customer,
      items: items,
      wpcDoors: wpcDoors,
      wpcTotal: wpcTotalPrice,
      pricingSnapshot: {
        profiles: JSON.parse(JSON.stringify(effectiveProfiles)),
        addons: JSON.parse(JSON.stringify(effectiveAddons)),
      },
      date: new Date().toLocaleDateString('ar-EG'),
      totalPrice: finalPrice,
    };

    const updated = [newQuote, ...savedQuotes.filter((q) => q.id !== newQuote.id)];
    setSavedQuotes(updated);
    await putOfflineRecord('quote', newQuote);
    try {
      localStorage.setItem('almekawy_saved_quotes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    const op = await enqueueSyncOp({
      entityType: 'quote',
      recordId: newQuote.id,
      action: 'upsert',
      payload: newQuote,
    });
    await refreshPendingSyncCount();

    // Also automatically register or update customer in directory
    if (customer.name?.trim()) {
      void handleSaveCustomer({
        name: customer.name.trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim(),
      }).catch((err) => console.warn('Auto customer save error:', err));
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showSaveNotice(
        'local-offline',
        'تم حفظ عرض السعر محلياً (غير متصل — ستتم المزامنة تلقائياً عند عودة الإنترنت).'
      );
      return 'local-offline';
    }

    try {
      await syncQueueExecutor.saveQuote(newQuote);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
      showSaveNotice('cloud', 'تم حفظ عرض السعر ومزامنته مع السحابة بنجاح.');
      return 'cloud';
    } catch (err) {
      console.warn('Firestore save queued for later sync:', err);
      showSaveNotice(
        'local-error',
        'تم الحفظ محلياً وجدولة المزامنة عند استقرار الاتصال بالسحابة.'
      );
      return 'local-error';
    }
  };

  const handleSaveCustomer = async (data: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => {
    const trimmedName = data.name.trim();
    const rawPhone = (data.phone || '').trim();
    const cleanDigits = normalizePhoneNumber(rawPhone);
    const customerId =
      cleanDigits.length >= 7
        ? `cust_${cleanDigits}`
        : `cust_name_${encodeURIComponent(trimmedName.toLowerCase().replace(/\s+/g, '_')).slice(
            0,
            30
          )}`;
    const nowIso = new Date().toISOString();
    const localRecord: SavedCustomer = {
      id: customerId,
      name: trimmedName,
      phone: cleanDigits || rawPhone,
      address: data.address?.trim() || '',
      notes: data.notes?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setSavedCustomers((prev) => {
      const filtered = prev.filter((c) => {
        const cClean = normalizePhoneNumber(c.phone);
        const samePhone =
          cleanDigits.length >= 7 && cClean.length >= 7 && cleanDigits === cClean;
        return !samePhone && c.id !== localRecord.id;
      });
      const updated = [localRecord, ...filtered];
      try {
        localStorage.setItem('almekawy_saved_customers', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    await putOfflineRecord('customer', localRecord);

    const op = await enqueueSyncOp({
      entityType: 'customer',
      recordId: localRecord.id,
      action: 'upsert',
      payload: localRecord,
    });
    await refreshPendingSyncCount();

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      await syncQueueExecutor.saveCustomer(localRecord);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
    } catch (error) {
      console.warn('Queued customer save for background sync:', error);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setSavedCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem('almekawy_saved_customers', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    await deleteOfflineRecord('customer', id);

    const op = await enqueueSyncOp({
      entityType: 'customer',
      recordId: id,
      action: 'delete',
    });
    await refreshPendingSyncCount();

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      await syncQueueExecutor.deleteCustomer(id);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
    } catch (error) {
      console.warn('Queued customer delete for background sync:', error);
    }
  };

  const handleSelectCustomer = (selected: SavedCustomer) => {
    pvcDraftEditedRef.current = true;
    setCustomer((prev) => ({
      ...prev,
      name: selected.name,
      phone: selected.phone,
      address: selected.address || prev.address,
    }));
    setActiveMainTab('input');
  };

  const handleSelectWpcCustomer = (selected: SavedCustomer) => {
    wpcDraftEditedRef.current = true;
    setWpcCustomer((prev) => ({
      ...prev,
      name: selected.name,
      phone: selected.phone,
      address: selected.address || prev.address,
    }));
  };

  const handleSaveCustomerFromForm = async () => {
    if (!customer.name?.trim() || !customer.phone?.trim()) return;
    await handleSaveCustomer({
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address?.trim() || '',
    });
  };

  const handleLoadQuote = (quote: SavedQuote) => {
    pvcDraftEditedRef.current = true;
    setCustomer(quote.customer);
    setItems(quote.items);
    setWpcDoors(quote.wpcDoors || []);
    if (
      quote.pricingSnapshot &&
      quote.pricingSnapshot.profiles &&
      Object.keys(quote.pricingSnapshot.profiles).length > 0
    ) {
      setLoadedQuotePricing({
        quoteName: quote.name,
        profiles: quote.pricingSnapshot.profiles,
        addons: quote.pricingSnapshot.addons || {},
      });
    } else {
      setLoadedQuotePricing(null);
    }
    setActiveMainTab('input');
  };

  const handleDeleteQuote = async (id: string) => {
    const updated = savedQuotes.filter((q) => q.id !== id);
    setSavedQuotes(updated);
    await deleteOfflineRecord('quote', id);
    try {
      localStorage.setItem('almekawy_saved_quotes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    const op = await enqueueSyncOp({
      entityType: 'quote',
      recordId: id,
      action: 'delete',
    });
    await refreshPendingSyncCount();

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      await syncQueueExecutor.deleteQuote(id);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
    } catch (err) {
      console.warn('Queued quote delete for background sync:', err);
    }
  };

  const handleSaveQuoteAuto = () => {
    const defaultName = customer.name?.trim()
      ? `عرض سعر - ${customer.name.trim()}`
      : `عرض سعر تلقائي - ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString(
          'ar-EG',
          { hour: '2-digit', minute: '2-digit' }
        )}`;
    return handleSaveCurrentQuote(defaultName);
  };

  const handleWpcCustomerChange = (field: keyof CustomerInfo, value: any) => {
    wpcDraftEditedRef.current = true;
    setWpcCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const fetchWpcQuotesFromAllSources = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const cloudQuotes = await fetchWpcQuotesFromCloud();
      if (cloudQuotes && cloudQuotes.length > 0) {
        await mergeAndPersistEntityList(
          'wpc_quote',
          cloudQuotes,
          savedWpcQuotesRef.current,
          'almekawy_saved_wpc_quotes',
          setSavedWpcQuotes
        );
        return;
      }
    } catch (err) {
      console.warn('Cloud WPC quotes fetch fallback:', err);
    }
  }, [mergeAndPersistEntityList]);

  const handleSaveCurrentWpcQuote = async (name: string): Promise<SaveOutcomeStatus> => {
    const finalPrice = (() => {
      const val = wpcCustomer.discountValue || 0;
      const type = wpcCustomer.discountType || 'cash';
      const notesAmount = wpcCustomer.notesAmount || 0;
      const additionalNotesSum =
        wpcCustomer.additionalNotes?.reduce((sum, n) => sum + (n.amount || 0), 0) || 0;
      const totalNotesAmount = notesAmount + additionalNotesSum;
      const discountAmt =
        type === 'percentage' ? wpcTotalPrice * (val / 100) : val;
      return Math.max(0, wpcTotalPrice - discountAmt + totalNotesAmount);
    })();

    const newWpcQuote: SavedWpcQuote = {
      id: Date.now().toString(),
      name: name,
      customer: wpcCustomer,
      wpcDoors: wpcDoors,
      wpcTotal: finalPrice,
      date: new Date().toLocaleDateString('ar-EG'),
    };

    const updated = [newWpcQuote, ...savedWpcQuotes.filter((q) => q.id !== newWpcQuote.id)];
    setSavedWpcQuotes(updated);
    await putOfflineRecord('wpc_quote', newWpcQuote);
    try {
      localStorage.setItem('almekawy_saved_wpc_quotes', JSON.stringify(updated));
    } catch (e) {}

    const op = await enqueueSyncOp({
      entityType: 'wpc_quote',
      recordId: newWpcQuote.id,
      action: 'upsert',
      payload: newWpcQuote,
    });
    await refreshPendingSyncCount();

    if (wpcCustomer.name?.trim()) {
      void handleSaveCustomer({
        name: wpcCustomer.name.trim(),
        phone: (wpcCustomer.phone || '').trim(),
        address: (wpcCustomer.address || '').trim(),
      }).catch(() => {});
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showSaveNotice(
        'local-offline',
        'تم حفظ عرض أسعار WPC محلياً (غير متصل — ستتم المزامنة تلقائياً عند عودة الإنترنت).'
      );
      return 'local-offline';
    }

    try {
      await syncQueueExecutor.saveWpcQuote(newWpcQuote);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
      showSaveNotice('cloud', 'تم حفظ عرض أسعار WPC ومزامنته مع السحابة بنجاح.');
      return 'cloud';
    } catch (err) {
      console.warn('Firestore WPC save queued:', err);
      showSaveNotice(
        'local-error',
        'تم حفظ عرض أسعار WPC محلياً وجدولة المزامنة عند استقرار الاتصال.'
      );
      return 'local-error';
    }
  };

  const handleLoadWpcQuote = (quote: SavedWpcQuote) => {
    wpcDraftEditedRef.current = true;
    setWpcCustomer(quote.customer);
    setWpcDoors(quote.wpcDoors || []);
    setActiveSystem('wpc');
  };

  const handleDeleteWpcQuote = async (id: string) => {
    const updated = savedWpcQuotes.filter((q) => q.id !== id);
    setSavedWpcQuotes(updated);
    await deleteOfflineRecord('wpc_quote', id);
    try {
      localStorage.setItem('almekawy_saved_wpc_quotes', JSON.stringify(updated));
    } catch (e) {}

    const op = await enqueueSyncOp({
      entityType: 'wpc_quote',
      recordId: id,
      action: 'delete',
    });
    await refreshPendingSyncCount();

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      await syncQueueExecutor.deleteWpcQuote(id);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
    } catch (err) {
      console.warn('Queued WPC delete error:', err);
    }
  };

  const handleSaveWpcQuoteAuto = () => {
    const defaultName = wpcCustomer.name?.trim()
      ? `عرض سعر أبواب WPC - ${wpcCustomer.name.trim()}`
      : `عرض سعر أبواب WPC - ${new Date().toLocaleDateString('ar-EG')}`;
    return handleSaveCurrentWpcQuote(defaultName);
  };

  // Independent Armored Doors handlers
  const handleArmoredCustomerChange = (field: keyof CustomerInfo, value: any) => {
    armoredDraftEditedRef.current = true;
    setArmoredCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectArmoredCustomer = (selected: SavedCustomer) => {
    armoredDraftEditedRef.current = true;
    setArmoredCustomer((prev) => ({
      ...prev,
      name: selected.name,
      phone: selected.phone,
      address: selected.address || prev.address,
    }));
  };

  const handleAddArmoredDoor = (newDoor: ArmoredDoorItem) => {
    armoredDraftEditedRef.current = true;
    setArmoredDoors((prev) => [...prev, newDoor]);
  };

  const handleUpdateArmoredDoor = (id: number, updatedFields: Partial<ArmoredDoorItem>) => {
    armoredDraftEditedRef.current = true;
    setArmoredDoors((prev) =>
      prev.map((d) => (d.id === id ? ({ ...d, ...updatedFields } as ArmoredDoorItem) : d))
    );
  };

  const handleRemoveArmoredDoor = (id: number) => {
    armoredDraftEditedRef.current = true;
    setArmoredDoors((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDuplicateArmoredDoor = (door: ArmoredDoorItem) => {
    armoredDraftEditedRef.current = true;
    const duplicate: ArmoredDoorItem = {
      ...door,
      id: Date.now(),
      title: `${door.title} (نسخة)`,
    };
    setArmoredDoors((prev) => [...prev, duplicate]);
  };

  const armoredTotalPrice = useMemo(() => {
    return calculateArmoredQuoteTotal(armoredDoors);
  }, [armoredDoors]);

  const fetchArmoredQuotesFromAllSources = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const cloudQuotes = await fetchArmoredQuotesFromCloud();
      if (cloudQuotes && cloudQuotes.length > 0) {
        await mergeAndPersistEntityList(
          'armored_quote',
          cloudQuotes,
          savedArmoredQuotesRef.current,
          'almekawy_saved_armored_quotes',
          setSavedArmoredQuotes
        );
      }
    } catch (err) {
      console.warn('Cloud Armored quotes fetch fallback:', err);
    }
  }, [mergeAndPersistEntityList]);

  const handleSaveCurrentArmoredQuote = async (name: string): Promise<SaveOutcomeStatus> => {
    const newArmoredQuote: SavedArmoredQuote = {
      id: Date.now().toString(),
      name,
      customer: armoredCustomer,
      armoredDoors,
      armoredTotal: armoredTotalPrice,
      date: new Date().toLocaleDateString('ar-EG'),
    };

    const updated = [
      newArmoredQuote,
      ...savedArmoredQuotes.filter((q) => q.id !== newArmoredQuote.id),
    ];
    setSavedArmoredQuotes(updated);
    await putOfflineRecord('armored_quote', newArmoredQuote);
    try {
      localStorage.setItem('almekawy_saved_armored_quotes', JSON.stringify(updated));
    } catch (e) {}

    const op = await enqueueSyncOp({
      entityType: 'armored_quote',
      recordId: newArmoredQuote.id,
      action: 'upsert',
      payload: newArmoredQuote,
    });
    await refreshPendingSyncCount();

    if (armoredCustomer.name?.trim()) {
      void handleSaveCustomer({
        name: armoredCustomer.name.trim(),
        phone: (armoredCustomer.phone || '').trim(),
        address: (armoredCustomer.address || '').trim(),
      }).catch(() => {});
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showSaveNotice(
        'local-offline',
        'تم حفظ عرض الأبواب المصفحة محلياً (غير متصل — ستتم المزامنة تلقائياً عند عودة الإنترنت).'
      );
      return 'local-offline';
    }

    try {
      await syncQueueExecutor.saveArmoredQuote(newArmoredQuote);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
      showSaveNotice('cloud', 'تم حفظ عرض الأبواب المصفحة ومزامنته مع السحابة بنجاح.');
      return 'cloud';
    } catch (err) {
      console.warn('Firestore Armored save queued:', err);
      showSaveNotice(
        'local-error',
        'تم حفظ عرض الأبواب المصفحة محلياً وجدولة المزامنة عند استقرار الاتصال.'
      );
      return 'local-error';
    }
  };

  const handleLoadArmoredQuote = (quote: SavedArmoredQuote) => {
    armoredDraftEditedRef.current = true;
    setArmoredCustomer(quote.customer);
    setArmoredDoors(quote.armoredDoors || []);
    setActiveSystem('armored');
    setActiveArmoredMainTab('input');
  };

  const handleDeleteArmoredQuote = async (id: string) => {
    const updated = savedArmoredQuotes.filter((q) => q.id !== id);
    setSavedArmoredQuotes(updated);
    await deleteOfflineRecord('armored_quote', id);
    try {
      localStorage.setItem('almekawy_saved_armored_quotes', JSON.stringify(updated));
    } catch (e) {}

    const op = await enqueueSyncOp({
      entityType: 'armored_quote',
      recordId: id,
      action: 'delete',
    });
    await refreshPendingSyncCount();

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      await syncQueueExecutor.deleteArmoredQuote(id);
      await removeSyncOp(op.opKey);
      await refreshPendingSyncCount();
    } catch (err) {
      console.warn('Queued Armored delete error:', err);
    }
  };

  const handleSaveArmoredQuoteAuto = () => {
    const defaultName = armoredCustomer.name?.trim()
      ? `عرض سعر أبواب مصفحة - ${armoredCustomer.name.trim()}`
      : `عرض سعر أبواب مصفحة - ${new Date().toLocaleDateString('ar-EG')}`;
    return handleSaveCurrentArmoredQuote(defaultName);
  };

  const handlePrint = () => {
    setActiveMainTab('quote');
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    setTimeout(() => {
      const el = document.getElementById('detailed-quote-view');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const renderSystemSwitcherBar = () => (
    <div className="bg-[#0F172A] text-white p-3.5 sm:p-5 rounded-3xl border-2 border-[#F59E0B] shadow-lg mb-8 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 bg-slate-800 p-1.5 rounded-2xl border border-slate-700 w-full sm:w-auto gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSystem('pvc')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center ${
              activeSystem === 'pvc'
                ? 'bg-[#F59E0B] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            نظام عروض أسعار UPVC
          </button>
          <button
            type="button"
            onClick={() => setActiveSystem('wpc')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center ${
              activeSystem === 'wpc'
                ? 'bg-[#F59E0B] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            نظام عروض أسعار WPC
          </button>
          <button
            type="button"
            onClick={() => setActiveSystem('armored')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSystem === 'armored'
                ? 'bg-[#F59E0B] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Shield size={15} />
            <span>أبواب مصفحة</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen overflow-x-hidden ${
        theme === 'dark' ? 'dark-mode' : ''
      } bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-yellow-200 selection:text-[#0F172A] transition-colors duration-300`}
      dir="rtl"
    >

      {/* 1. WPC System Workspace */}
      {activeSystem === 'wpc' && (
        <div className="pb-12 md:pb-0 print:pb-0">
          <Header
            onOpenDevSettings={() => setIsDevModalOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
            savedQuotesCount={savedWpcQuotes.length}
            onOpenSavedQuotes={() => setPasswordTarget('wpc-quotes')}
            onSaveQuoteAuto={handleSaveWpcQuoteAuto}
            customersCount={savedCustomers.length}
            onOpenCustomers={() => setPasswordTarget('customers')}
            isPrimaryHeading={true}
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingSyncCount={pendingSyncCount}
            onSyncNow={() => void runSyncFlush()}
          />

          <main className={`w-full max-w-none mx-auto ${activeWpcMainTab === 'quote' ? 'p-0' : 'px-4 sm:px-8 py-8 md:py-12'} print:max-w-none print:p-0 print:m-0 transition-all duration-500`}>
            {/* System Switcher Bar */}
            {renderSystemSwitcherBar()}

            {/* WPC Navigation Tabs */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-8 max-w-3xl mx-auto border border-slate-200/80 print:hidden shadow-inner relative justify-between gap-1.5">
              <button
                onClick={() => setActiveWpcMainTab('input')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeWpcMainTab === 'input'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <DoorClosed size={16} />
                <span>1. تصميم وتعديل أبواب WPC ({wpcDoors.length})</span>
              </button>

              <button
                onClick={() => setActiveWpcMainTab('quote')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeWpcMainTab === 'quote'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <FileText size={16} />
                <span>2. معاينة عرض سعر WPC (PDF)</span>
              </button>
            </div>

            {activeWpcMainTab === 'input' && (
              <div className="space-y-8 block print:hidden">
                <CustomerForm
                  customer={wpcCustomer}
                  onChange={handleWpcCustomerChange}
                  savedCustomers={savedCustomers}
                  onOpenCustomersModal={() => setPasswordTarget('customers')}
                  onSaveCustomerToDirectory={async () => {
                    if (!wpcCustomer.name?.trim() || !wpcCustomer.phone?.trim()) return;
                    await handleSaveCustomer({
                      name: wpcCustomer.name.trim(),
                      phone: wpcCustomer.phone.trim(),
                      address: wpcCustomer.address?.trim() || '',
                    });
                  }}
                  onSelectCustomer={(selected) => {
                    wpcDraftEditedRef.current = true;
                    setWpcCustomer((prev) => ({
                      ...prev,
                      name: selected.name,
                      phone: selected.phone,
                      address: selected.address || prev.address,
                    }));
                  }}
                />

                <WpcDoorsSection
                  wpcDoors={wpcDoors}
                  wpcPricing={doorsPricing.wpc}
                  pricingSyncStatus={doorsPricingSyncStatus}
                  pricingErrorText={doorsPricingErrorText}
                  isOnline={isOnline}
                  onRetryLoadPricing={loadLatestDoorsPricingFromServer}
                  onAddDoor={handleAddWpcDoor}
                  onUpdateDoor={handleUpdateWpcDoor}
                  onRemoveDoor={handleRemoveWpcDoor}
                  onDuplicateDoor={handleDuplicateWpcDoor}
                  formatCurrency={formatCurrency}
                  onNavigatePrev={() => {}}
                  onNavigateNext={() => setActiveWpcMainTab('quote')}
                />
              </div>
            )}

            {activeWpcMainTab === 'quote' && (
              <div className="block">
                <WpcDetailedQuoteView
                  customer={wpcCustomer}
                  wpcDoors={wpcDoors}
                  formatCurrency={formatCurrency}
                  isMobileViewport={isMobileViewport}
                  onBack={() => setActiveWpcMainTab('input')}
                />
              </div>
            )}
          </main>
        </div>
      )}

      {/* 2. PVC System Workspace */}
      {activeSystem === 'pvc' && (
        <div className="pb-12 md:pb-0 print:pb-0">
          {activeMainTab === 'input' && (
            <Header
              onOpenDevSettings={() => setIsDevModalOpen(true)}
              theme={theme}
              onToggleTheme={toggleTheme}
              savedQuotesCount={savedQuotes.length}
              onOpenSavedQuotes={() => setPasswordTarget('quotes')}
              onSaveQuoteAuto={handleSaveQuoteAuto}
              customersCount={savedCustomers.length}
              onOpenCustomers={() => setPasswordTarget('customers')}
              isPrimaryHeading={true}
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingSyncCount={pendingSyncCount}
              onSyncNow={() => void runSyncFlush()}
            />
          )}

          <main className={`w-full max-w-none mx-auto ${activeMainTab === 'quote' ? 'p-0' : 'px-4 sm:px-8 py-8 md:py-12'} print:max-w-none print:p-0 print:m-0 transition-all duration-500`}>
            {/* System Switcher Bar placed directly above the interactive pricing portal */}
            {renderSystemSwitcherBar()}



            {/* Navigation Tabs for PVC */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-8 max-w-3xl mx-auto border border-slate-200/80 print:hidden shadow-inner relative justify-between gap-1.5">
              <button
                onClick={() => setActiveMainTab('input')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeMainTab === 'input'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <Calculator size={16} />
                <span>1. حساب بنود PVC</span>
              </button>

              <button
                onClick={() => setActiveMainTab('quote')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeMainTab === 'quote'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <FileText size={16} />
                <span>2. معاينة عرض سعر PVC (PDF)</span>
              </button>
            </div>

            <div className={activeMainTab === 'input' ? 'block print:hidden' : 'hidden print:hidden'}>
              <PricingTable profiles={profiles} addons={addons} />

              <CustomerForm
                customer={customer}
                onChange={handleCustomerChange}
                savedCustomers={savedCustomers}
                onOpenCustomersModal={() => setPasswordTarget('customers')}
                onSaveCustomerToDirectory={handleSaveCustomerFromForm}
                onSelectCustomer={handleSelectCustomer}
              />

              <div className="space-y-8 print:hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  {calculations.itemsCalculated.map((item, index) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      updateItem={updateItem}
                      removeItem={removeItem}
                      toggleAddon={toggleAddon}
                      formatCurrency={formatCurrency}
                      profiles={effectiveProfiles}
                      addons={effectiveAddons}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-10 flex justify-center print:hidden">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addNewItem}
                  className="flex items-center gap-3 bg-[#0F172A] hover:bg-black text-white px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-base sm:text-xl shadow-lg transition-all w-full md:w-auto justify-center cursor-pointer"
                >
                  <Plus size={24} className="sm:w-7 sm:h-7" />
                  إضافة بند جديد (شباك / باب)
                </motion.button>
              </div>

              <SummaryBox
                calculations={calculations}
                customer={customer}
                onChange={handleCustomerChange}
                formatCurrency={formatCurrency}
                handlePrint={handlePrint}
                wpcTotalPrice={0}
                onNavigateToWpc={() => {
                  setActiveSystem('wpc');
                  setActiveWpcMainTab('input');
                }}
              />
            </div>

            {(activeMainTab === 'quote' || isNativePrinting) && (
              <div className={activeMainTab === 'quote' ? 'block' : 'hidden print:block'}>
                <DetailedQuoteView
                  customer={customer}
                  calculations={calculations}
                  formatCurrency={formatCurrency}
                  profiles={effectiveProfiles}
                  addons={effectiveAddons}
                  wpcDoors={[]}
                  onBack={() => setActiveMainTab('input')}
                />
              </div>
            )}

            <div className="print:hidden">
              <Features />
            </div>

            <footer className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-center print:hidden">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="min-h-[44px] px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-[#FACC15] border border-slate-700 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <QrCode size={16} className="text-[#FACC15]" />
                <span>رموز الاستجابة السريعة (QR)</span>
              </button>
            </footer>
          </main>
        </div>
      )}

      {/* 3. Armored Doors System Workspace (Independent) */}
      {activeSystem === 'armored' && (
        <div className="pb-12 md:pb-0 print:pb-0">
          {activeArmoredMainTab === 'input' && (
            <Header
              onOpenDevSettings={() => setIsDevModalOpen(true)}
              theme={theme}
              onToggleTheme={toggleTheme}
              savedQuotesCount={savedArmoredQuotes.length}
              onOpenSavedQuotes={() => setPasswordTarget('armored-quotes')}
              onSaveQuoteAuto={handleSaveArmoredQuoteAuto}
              customersCount={savedCustomers.length}
              onOpenCustomers={() => setPasswordTarget('customers')}
              isPrimaryHeading={true}
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingSyncCount={pendingSyncCount}
              onSyncNow={() => void runSyncFlush()}
            />
          )}

          <main
            className={`w-full max-w-none mx-auto ${
              activeArmoredMainTab === 'quote' ? 'p-0' : 'px-4 sm:px-8 py-8 md:py-12'
            } print:max-w-none print:p-0 print:m-0 transition-all duration-500`}
          >
            {/* System Switcher Bar */}
            {renderSystemSwitcherBar()}

            {/* Armored Doors Navigation Tabs */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-8 max-w-3xl mx-auto border border-slate-200/80 print:hidden shadow-inner relative justify-between gap-1.5">
              <button
                onClick={() => setActiveArmoredMainTab('input')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeArmoredMainTab === 'input'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <Shield size={16} />
                <span>1. إعداد أبواب مصفحة ({armoredDoors.length})</span>
              </button>

              <button
                onClick={() => setActiveArmoredMainTab('quote')}
                className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeArmoredMainTab === 'quote'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <FileText size={16} />
                <span>2. معاينة عرض سعر أبواب مصفحة (PDF)</span>
              </button>
            </div>

            {activeArmoredMainTab === 'input' && (
              <div className="space-y-8 block print:hidden">
                <CustomerForm
                  customer={armoredCustomer}
                  onChange={handleArmoredCustomerChange}
                  savedCustomers={savedCustomers}
                  onOpenCustomersModal={() => setPasswordTarget('customers')}
                  onSaveCustomerToDirectory={async () => {
                    if (!armoredCustomer.name?.trim() || !armoredCustomer.phone?.trim()) return;
                    await handleSaveCustomer({
                      name: armoredCustomer.name.trim(),
                      phone: armoredCustomer.phone.trim(),
                      address: armoredCustomer.address?.trim() || '',
                    });
                  }}
                  onSelectCustomer={handleSelectArmoredCustomer}
                />

                <ArmoredDoorsSection
                  armoredDoors={armoredDoors}
                  armoredTypes={doorsPricing.armored}
                  pricingSyncStatus={doorsPricingSyncStatus}
                  pricingErrorText={doorsPricingErrorText}
                  isOnline={isOnline}
                  onRetryLoadPricing={loadLatestDoorsPricingFromServer}
                  onAddDoor={handleAddArmoredDoor}
                  onUpdateDoor={handleUpdateArmoredDoor}
                  onRemoveDoor={handleRemoveArmoredDoor}
                  onDuplicateDoor={handleDuplicateArmoredDoor}
                  formatCurrency={formatCurrency}
                  onSaveQuoteAuto={handleSaveArmoredQuoteAuto}
                  onNavigateNext={() => setActiveArmoredMainTab('quote')}
                />
              </div>
            )}

            {(activeArmoredMainTab === 'quote' || isNativePrinting) && (
              <div className={activeArmoredMainTab === 'quote' ? 'block' : 'hidden print:block'}>
                <ArmoredDetailedQuoteView
                  customer={armoredCustomer}
                  armoredDoors={armoredDoors}
                  formatCurrency={formatCurrency}
                  isMobileViewport={isMobileViewport}
                  onBack={() => setActiveArmoredMainTab('input')}
                  onSaveQuoteAuto={handleSaveArmoredQuoteAuto}
                />
              </div>
            )}

            <div className="print:hidden">
              <Features />
            </div>

            <footer className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-center print:hidden">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="min-h-[44px] px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-[#FACC15] border border-slate-700 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <QrCode size={16} className="text-[#FACC15]" />
                <span>رموز الاستجابة السريعة (QR)</span>
              </button>
            </footer>
          </main>
        </div>
      )}

      {/* Shared Dialog Modals across Mobile and Desktop */}
      <AnimatePresence>
        {isQrModalOpen && (
          <QrModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDevModalOpen && (
          <DevSettingsModal
            isOpen={isDevModalOpen}
            onClose={() => setIsDevModalOpen(false)}
            profiles={profiles}
            addons={addons}
            onSavePrices={handleSavePrices}
            onResetPrices={handleResetPrices}
            doorsPricing={doorsPricing}
            onSaveDoorsPricing={handleSaveDoorsPricing}
            onResetDoorsPricing={handleResetDoorsPricing}
            usedWpcTypeIds={usedWpcTypeIds}
            usedArmoredTypeIds={usedArmoredTypeIds}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSavedQuotesModalOpen && (
          <SavedQuotesModal
            isOpen={isSavedQuotesModalOpen}
            onClose={() => setIsSavedQuotesModalOpen(false)}
            savedQuotes={savedQuotes}
            onSaveCurrent={handleSaveCurrentQuote}
            onLoadQuote={handleLoadQuote}
            onDeleteQuote={handleDeleteQuote}
            currentCustomerName={customer.name}
            formatCurrency={formatCurrency}
            onRefresh={fetchQuotesFromAllSources}
            isOnline={isOnline}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSavedWpcQuotesModalOpen && (
          <SavedWpcQuotesModal
            isOpen={isSavedWpcQuotesModalOpen}
            onClose={() => setIsSavedWpcQuotesModalOpen(false)}
            savedQuotes={savedWpcQuotes}
            onSaveCurrent={handleSaveCurrentWpcQuote}
            onLoadQuote={handleLoadWpcQuote}
            onDeleteQuote={handleDeleteWpcQuote}
            currentCustomerName={wpcCustomer.name}
            formatCurrency={formatCurrency}
            onRefresh={fetchWpcQuotesFromAllSources}
            isOnline={isOnline}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSavedArmoredQuotesModalOpen && (
          <SavedArmoredQuotesModal
            isOpen={isSavedArmoredQuotesModalOpen}
            onClose={() => setIsSavedArmoredQuotesModalOpen(false)}
            savedQuotes={savedArmoredQuotes}
            onSaveCurrent={handleSaveCurrentArmoredQuote}
            onLoadQuote={handleLoadArmoredQuote}
            onDeleteQuote={handleDeleteArmoredQuote}
            currentCustomerName={armoredCustomer.name}
            formatCurrency={formatCurrency}
            onRefresh={fetchArmoredQuotesFromAllSources}
            isOnline={isOnline}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomersModalOpen && (
          <CustomersModal
            isOpen={isCustomersModalOpen}
            onClose={() => setIsCustomersModalOpen(false)}
            customers={savedCustomers}
            onSelectCustomer={(selected) => {
              if (activeSystem === 'wpc') {
                handleSelectWpcCustomer(selected);
              } else if (activeSystem === 'armored') {
                handleSelectArmoredCustomer(selected);
              } else {
                handleSelectCustomer(selected);
              }
            }}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRefresh={fetchCustomersFromAllSources}
            isOnline={isOnline}
          />
        )}
      </AnimatePresence>

      <SaveFeedbackToast notice={saveNotice} onDismiss={() => setSaveNotice(null)} />

      <AnimatePresence>
        {passwordTarget && (
          <PasswordModal
            isOpen={Boolean(passwordTarget)}
            onClose={() => setPasswordTarget(null)}
            onSuccess={() => {
              const target = passwordTarget;
              setPasswordTarget(null);
              if (target === 'quotes') {
                fetchQuotesFromAllSources();
                setIsSavedQuotesModalOpen(true);
              } else if (target === 'wpc-quotes') {
                fetchWpcQuotesFromAllSources();
                setIsSavedWpcQuotesModalOpen(true);
              } else if (target === 'armored-quotes') {
                fetchArmoredQuotesFromAllSources();
                setIsSavedArmoredQuotesModalOpen(true);
              } else if (target === 'customers') {
                fetchCustomersFromAllSources();
                setIsCustomersModalOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background-color: white !important; }
          .print\\:hidden { display: none !important; }
          input[type="number"], input[type="text"], select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background: transparent;
          }
        }
      `,
        }}
      />
    </div>
  );
}
