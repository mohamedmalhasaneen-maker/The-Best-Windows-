import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Plus, Calculator, QrCode, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  QuoteItem,
  CalculationResult,
  CustomerInfo,
  Profile,
  Addon,
  SavedQuote,
  SavedCustomer,
  PricingConfig,
} from './types';
import { PROFILES, ADDONS, BRAND_NAME } from './constants';
import { DevSettingsModal } from './components/DevSettingsModal';
import {
  saveQuoteToCloud,
  fetchQuotesFromCloud,
  deleteQuoteFromCloud,
  subscribeToQuotes,
  saveCustomerToCloud,
  fetchCustomersFromCloud,
  deleteCustomerFromCloud,
  subscribeToCustomers,
  normalizePhoneNumber,
  fetchPricingFromCloud,
  subscribeToPricing,
  savePricingToCloud,
} from './firebase';

import Header from './components/Header';
import ItemCard from './components/ItemCard';
import CustomerForm from './components/CustomerForm';
import DetailedQuoteView from './components/DetailedQuoteView';
import SummaryBox from './components/SummaryBox';
import PricingTable from './components/PricingTable';
import Features from './components/Features';
import QrModal from './components/QrModal';
import SavedQuotesModal from './components/SavedQuotesModal';
import CustomersModal from './components/CustomersModal';
import PasswordModal from './components/PasswordModal';
import { MobileView } from './components/mobile/MobileView';

const formatCurrency = (value: number) => {
  return (
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value) + ' ج.م'
  );
};

export default function App() {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isSavedQuotesModalOpen, setIsSavedQuotesModalOpen] = useState(false);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<'quotes' | 'customers' | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'input' | 'quote'>('input');

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

  // Authoritative shared pricing state (loaded strictly from Firestore, never from localStorage)
  const [profiles, setProfiles] = useState<Record<string, Profile>>(PROFILES);
  const [addons, setAddons] = useState<Record<string, Addon>>(ADDONS);
  const pricingVersionRef = useRef<number>(0);
  const [pricingSyncStatus, setPricingSyncStatus] = useState<'loading' | 'synced' | 'error'>(
    'loading'
  );
  const [pricingErrorText, setPricingErrorText] = useState<string | null>(null);

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
      if (pricingVersionRef.current === 0) {
        setPricingSyncStatus('error');
        setPricingErrorText(
          'تعذر الاتصال بقاعدة البيانات لتحميل أحدث الأسعار المعتمدة — الأسعار الاحتياطية المعروضة حالياً غير مؤكدة.'
        );
      }
    }
  }, [applyConfirmedPricing]);

  useEffect(() => {
    // Purge legacy browser-local pricing overrides so localStorage can never shadow shared database prices
    try {
      localStorage.removeItem('almekawy_custom_profiles');
      localStorage.removeItem('almekawy_custom_addons');
    } catch {}

    loadLatestPricingFromServer();

    const handleOnline = () => {
      if (pricingVersionRef.current === 0) {
        void loadLatestPricingFromServer();
      }
    };
    window.addEventListener('online', handleOnline);

    const unsubscribePricing = subscribeToPricing(
      (livePricing) => {
        applyConfirmedPricing(livePricing);
      },
      () => {
        if (pricingVersionRef.current === 0) {
          setPricingSyncStatus('error');
          setPricingErrorText(
            'تعذر الاتصال بقاعدة البيانات لتحميل أحدث الأسعار المعتمدة — الأسعار الاحتياطية المعروضة حالياً غير مؤكدة.'
          );
        }
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      if (typeof unsubscribePricing === 'function') unsubscribePricing();
    };
  }, [applyConfirmedPricing, loadLatestPricingFromServer]);

  const fetchCustomersFromAllSources = async () => {
    try {
      const cloudCust = await fetchCustomersFromCloud();
      if (cloudCust && cloudCust.length > 0) {
        setSavedCustomers(cloudCust);
        try {
          localStorage.setItem('almekawy_saved_customers', JSON.stringify(cloudCust));
        } catch (e) {}
        return;
      }
    } catch (err) {
      console.warn('Cloud customers fetch fallback:', err);
    }

    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedCustomers(data);
          try {
            localStorage.setItem('almekawy_saved_customers', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.warn('Error loading customers from backend:', err);
      });
  };

  const syncCustomersFromQuotesList = (quotes: SavedQuote[], currentCustList?: SavedCustomer[]) => {
    if (!Array.isArray(quotes) || quotes.length === 0) return;
    const existingList = currentCustList || savedCustomers;
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

  const fetchQuotesFromAllSources = async () => {
    try {
      const cloudQuotes = await fetchQuotesFromCloud();
      if (cloudQuotes && cloudQuotes.length > 0) {
        setSavedQuotes(cloudQuotes);
        syncCustomersFromQuotesList(cloudQuotes);
        try {
          localStorage.setItem('almekawy_saved_quotes', JSON.stringify(cloudQuotes));
        } catch (e) {}
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
          setSavedQuotes(data);
          syncCustomersFromQuotesList(data);
          try {
            localStorage.setItem('almekawy_saved_quotes', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('Error loading quotes from server:', err);
      });
  };

  useEffect(() => {
    let unsubscribeQuotes: (() => void) | undefined;
    let unsubscribeCustomers: (() => void) | undefined;

    // Defer secondary quotes/customers listeners slightly so authoritative pricing completes first
    const initTimer = window.setTimeout(() => {
      unsubscribeQuotes = subscribeToQuotes((liveQuotes) => {
        if (liveQuotes && liveQuotes.length > 0) {
          setSavedQuotes(liveQuotes);
          syncCustomersFromQuotesList(liveQuotes);
          try {
            localStorage.setItem('almekawy_saved_quotes', JSON.stringify(liveQuotes));
          } catch (e) {}
        } else {
          fetchQuotesFromAllSources();
        }
      });

      unsubscribeCustomers = subscribeToCustomers((liveCustomers) => {
        if (liveCustomers && liveCustomers.length > 0) {
          setSavedCustomers(liveCustomers);
          try {
            localStorage.setItem('almekawy_saved_customers', JSON.stringify(liveCustomers));
          } catch (e) {}
        } else {
          fetchCustomersFromAllSources();
        }
      });
    }, 400);

    return () => {
      window.clearTimeout(initTimer);
      if (typeof unsubscribeQuotes === 'function') unsubscribeQuotes();
      if (typeof unsubscribeCustomers === 'function') unsubscribeCustomers();
    };
  }, []);

  useEffect(() => {
    if (isSavedQuotesModalOpen) {
      fetchQuotesFromAllSources();
    }
  }, [isSavedQuotesModalOpen]);

  useEffect(() => {
    if (isCustomersModalOpen) {
      fetchCustomersFromAllSources();
    }
  }, [isCustomersModalOpen]);

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
    setActiveMainTab('input');
    const defaultProfile = Object.keys(effectiveProfiles)[0] || 'newline';
    setItems([
      ...items,
      {
        id: Date.now(),
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
  };

  const handleDuplicateItem = (itemToDuplicate: QuoteItem) => {
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
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

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

  const handleCustomerChange = (field: keyof CustomerInfo, value: any) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCurrentQuote = (name: string) => {
    const finalPrice = (() => {
      const val = customer.discountValue || 0;
      const type = customer.discountType || 'cash';
      const notesAmount = customer.notesAmount || 0;
      const additionalNotesSum =
        customer.additionalNotes?.reduce((sum, n) => sum + (n.amount || 0), 0) || 0;
      const totalNotesAmount = notesAmount + additionalNotesSum;
      const discountAmt =
        type === 'percentage' ? calculations.totalPrice * (val / 100) : val;
      return Math.max(0, calculations.totalPrice - discountAmt + totalNotesAmount);
    })();

    const newQuote: SavedQuote = {
      id: Date.now().toString(),
      name: name,
      customer: customer,
      items: items,
      pricingSnapshot: {
        profiles: JSON.parse(JSON.stringify(effectiveProfiles)),
        addons: JSON.parse(JSON.stringify(effectiveAddons)),
      },
      date: new Date().toLocaleDateString('ar-EG'),
      totalPrice: finalPrice,
    };
    const updated = [newQuote, ...savedQuotes.filter((q) => q.id !== newQuote.id)];
    setSavedQuotes(updated);
    try {
      localStorage.setItem('almekawy_saved_quotes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Save to Firebase Firestore Cloud
    saveQuoteToCloud(newQuote).catch((err) => {
      console.warn('Firestore save fallback error:', err);
    });

    // Also automatically register or update customer in directory
    if (customer.name?.trim()) {
      handleSaveCustomer({
        name: customer.name.trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim(),
      }).catch((err) => console.warn('Auto customer save error:', err));
    }

    // Save to the backend server
    fetch('/api/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newQuote),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log('Successfully saved quote to backend server');
        }
      })
      .catch((err) => {
        console.error('Error saving quote to backend server:', err);
      });
  };

  const handleSaveCustomer = async (data: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      const saved = await saveCustomerToCloud(data);
      setSavedCustomers((prev) => {
        const cleanTarget = normalizePhoneNumber(saved.phone);
        const filtered = prev.filter((c) => {
          const cClean = normalizePhoneNumber(c.phone);
          const samePhone =
            cleanTarget.length >= 7 && cClean.length >= 7 && cleanTarget === cClean;
          const sameId = c.id === saved.id;
          return !samePhone && !sameId;
        });
        const updated = [saved, ...filtered];
        try {
          localStorage.setItem('almekawy_saved_customers', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Also persist to backend server
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      }).catch((err) => console.warn('Backend customer save fallback:', err));
    } catch (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomerFromCloud(id);
      setSavedCustomers((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        try {
          localStorage.setItem('almekawy_saved_customers', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Backend customer delete fallback:', err));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const handleSelectCustomer = (selected: SavedCustomer) => {
    setCustomer((prev) => ({
      ...prev,
      name: selected.name,
      phone: selected.phone,
      address: selected.address || prev.address,
    }));
    setActiveMainTab('input');
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
    setCustomer(quote.customer);
    setItems(quote.items);
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

  const handleDeleteQuote = (id: string) => {
    const updated = savedQuotes.filter((q) => q.id !== id);
    setSavedQuotes(updated);
    try {
      localStorage.setItem('almekawy_saved_quotes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Delete from Firebase Firestore Cloud
    deleteQuoteFromCloud(id).catch((err) => {
      console.warn('Firestore delete fallback error:', err);
    });

    // Delete from the backend server
    fetch(`/api/quotes/${id}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log('Successfully deleted quote from backend server');
        }
      })
      .catch((err) => {
        console.error('Error deleting quote from backend server:', err);
      });
  };

  const handleSaveQuoteAuto = () => {
    const defaultName = customer.name?.trim()
      ? `عرض سعر - ${customer.name.trim()}`
      : `عرض سعر تلقائي - ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString(
          'ar-EG',
          { hour: '2-digit', minute: '2-digit' }
        )}`;
    handleSaveCurrentQuote(defaultName);
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

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'dark-mode' : ''
      } bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-yellow-200 selection:text-[#0F172A] transition-colors duration-300`}
      dir="rtl"
    >


      {/* 1. Ground-up Mobile-Dedicated View (Mounted strictly on mobile viewports < md) */}
      {isMobileViewport && (
        <MobileView
          customer={customer}
          items={items}
          calculations={calculations}
          profiles={effectiveProfiles}
          addons={effectiveAddons}
          savedQuotes={savedQuotes}
          savedCustomers={savedCustomers}
          theme={theme}
          onToggleTheme={toggleTheme}
          handleCustomerChange={handleCustomerChange}
          updateItem={updateItem}
          removeItem={removeItem}
          addNewItem={addNewItem}
          toggleAddon={toggleAddon}
          handleSaveQuoteAuto={handleSaveQuoteAuto}
          handleSaveCurrentQuote={handleSaveCurrentQuote}
          onOpenDevSettings={() => setIsDevModalOpen(true)}
          onOpenSavedQuotes={() => setPasswordTarget('quotes')}
          onOpenCustomers={() => setPasswordTarget('customers')}
          onOpenQr={() => setIsQrModalOpen(true)}
          handlePrint={handlePrint}
          activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab}
          formatCurrency={formatCurrency}
          handleSelectCustomer={handleSelectCustomer}
          handleSaveCustomerFromForm={handleSaveCustomerFromForm}
          onDuplicateItem={handleDuplicateItem}
          isPrimaryHeading={isMobileViewport}
        />
      )}

      {/* 2. Desktop-Dedicated View (Unchanged Desktop Layout >= md, plus Canonical Print Target) */}
      <div className="hidden md:block print:block pb-24 md:pb-0 print:pb-0">
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
            isPrimaryHeading={!isMobileViewport}
          />
        )}

        <main className={`w-full max-w-none mx-auto ${activeMainTab === 'quote' ? 'p-0' : 'px-4 sm:px-8 py-8 md:py-12'} print:max-w-none print:p-0 print:m-0 transition-all duration-500`}>
          {activeMainTab === 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border-2 border-slate-200 border-r-8 border-r-[#0F172A] p-8 mb-12 print:hidden overflow-hidden relative shadow-sm"
            >
              <h2 className="text-2xl font-display font-black text-[#0F172A] mb-4 flex items-center gap-3">
                <Calculator className="text-[#0F172A]" size={26} />
                بوابة {BRAND_NAME} للتسعير التفاعلي
              </h2>
              <p className="text-slate-500 leading-relaxed text-base max-w-3xl">
                أدخل مقاسات الفتحات لديك (العرض والارتفاع بالسنتيمتر)، ثم اختر نوع القطاع والإضافات التي ترغب بها لكل بند. سيقوم النظام تلقائياً بحساب المساحات (المتر المربع) وعرض التكلفة الإجمالية بدقة وبشفافية تامة.
              </p>
            </motion.div>
          )}

          {/* Navigation Tabs for adjacent pages view */}
          {activeMainTab === 'input' && (
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-8 max-w-2xl mx-auto border border-slate-200/80 print:hidden shadow-inner relative justify-between gap-1.5">
              <button
                onClick={() => setActiveMainTab('input')}
                className={`flex-1 py-3 px-3 sm:px-5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeMainTab === 'input'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <Calculator size={18} />
                <span>بيانات العميل وحساب البنود</span>
              </button>
              <button
                onClick={() => setActiveMainTab('quote')}
                className={`flex-1 py-3 px-3 sm:px-5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none ${
                  activeMainTab === 'quote'
                    ? 'bg-[#0F172A] text-[#FACC15] shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                <FileText size={18} />
                <span>عرض السعر التفصيلي (PDF)</span>
              </button>
            </div>
          )}

          <div className={activeMainTab === 'input' ? 'block print:hidden' : 'hidden print:hidden'}>
            {/* Official pricing table always displays the live shared Firestore catalog */}
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
                className="hidden md:flex items-center gap-3 bg-[#0F172A] hover:bg-black text-white px-10 py-5 rounded-2xl font-black text-xl shadow-lg transition-all w-full md:w-auto justify-center cursor-pointer"
              >
                <Plus size={28} />
                إضافة بند جديد (شباك / باب)
              </motion.button>
            </div>

            <SummaryBox
              calculations={calculations}
              customer={customer}
              onChange={handleCustomerChange}
              formatCurrency={formatCurrency}
              handlePrint={handlePrint}
            />
          </div>

          {(activeMainTab === 'quote' || isNativePrinting || isMobileViewport) && (
            <div className={activeMainTab === 'quote' ? 'block' : 'hidden print:block'}>
              <DetailedQuoteView
                customer={customer}
                calculations={calculations}
                formatCurrency={formatCurrency}
                profiles={effectiveProfiles}
                addons={effectiveAddons}
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
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomersModalOpen && (
          <CustomersModal
            isOpen={isCustomersModalOpen}
            onClose={() => setIsCustomersModalOpen(false)}
            customers={savedCustomers}
            onSelectCustomer={handleSelectCustomer}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRefresh={fetchCustomersFromAllSources}
          />
        )}
      </AnimatePresence>

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
