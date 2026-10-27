/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  ShieldAlert,
  Check,
  Coins,
  RefreshCw,
  Layers,
  Sliders,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Profile, Addon, PricingConfig } from '../types';
import { BRAND_NAME } from '../constants';
import { verifyAdminPasscode } from '../firebase';

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  onSavePrices: (
    updatedProfiles: Record<string, Profile>,
    updatedAddons: Record<string, Addon>,
    adminProof: string
  ) => Promise<PricingConfig>;
  onResetPrices: (adminProof: string) => Promise<PricingConfig>;
}

type PricingModeKey = 'sqm' | 'piece' | 'single_sash' | 'double_sash' | 'opening';

const PRICING_MODE_OPTIONS: Record<
  PricingModeKey,
  { label: string; isFlat: boolean; unit: string }
> = {
  sqm: { label: 'للمتر المربع', isFlat: false, unit: 'للمتر المربع' },
  piece: { label: 'للقطعة', isFlat: true, unit: 'للقطعة' },
  single_sash: { label: 'للضلفة', isFlat: true, unit: 'للضلفة' },
  double_sash: { label: 'للضلفتين', isFlat: true, unit: 'للضلفتين' },
  opening: { label: 'للفتحة', isFlat: true, unit: 'للفتحة' },
};

function getItemPricingMode(item: { isFlat?: boolean; unit?: string }): PricingModeKey {
  if (!item.isFlat) return 'sqm';
  switch (item.unit) {
    case 'للضلفة':
      return 'single_sash';
    case 'للضلفتين':
      return 'double_sash';
    case 'للفتحة':
      return 'opening';
    case 'للقطعة':
    default:
      return 'piece';
  }
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({
  isOpen,
  onClose,
  profiles,
  addons,
  onSavePrices,
  onResetPrices,
}) => {
  const [password, setPassword] = useState('');
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminProof, setAdminProof] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'addons'>('profiles');

  const [tempProfiles, setTempProfiles] = useState<Record<string, Profile>>({});
  const [tempAddons, setTempAddons] = useState<Record<string, Addon>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [newItemType, setNewItemType] = useState<'profile' | 'addon'>('profile');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPricingMode, setNewItemPricingMode] = useState<
    'sqm' | 'piece' | 'single_sash' | 'double_sash'
  >('sqm');

  const wasOpenRef = useRef(false);

  // Initialize modal state ONLY when transitioning from closed -> open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setTempProfiles(JSON.parse(JSON.stringify(profiles)));
      setTempAddons(JSON.parse(JSON.stringify(addons)));
      setIsAuthorized(false);
      setAdminProof('');
      setIsVerifyingPasscode(false);
      setIsSaving(false);
      setPassword('');
      setErrorMsg('');
      setSaveSuccess(false);
      setConfirmDeleteId(null);
      setConfirmReset(false);
      setStatusBanner(null);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemPricingMode('sqm');
      try {
        localStorage.removeItem('almekawy_dev_authorized');
      } catch {}
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, profiles, addons]);

  const showBanner = (type: 'success' | 'warning' | 'error', text: string) => {
    setStatusBanner({ type, text });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingPasscode || password.length < 6) return;

    setIsVerifyingPasscode(true);
    setErrorMsg('');

    const result = await verifyAdminPasscode(password);
    setIsVerifyingPasscode(false);

    if (result.ok && result.proof) {
      // Refresh temp copies with latest active prices right as developer enters panel
      setTempProfiles(JSON.parse(JSON.stringify(profiles)));
      setTempAddons(JSON.parse(JSON.stringify(addons)));
      setAdminProof(result.proof);
      setIsAuthorized(true);
      setErrorMsg('');
      setPassword('');
    } else if (result.errorType === 'network') {
      setErrorMsg('تعذر الاتصال بقاعدة البيانات للتحقق من الرمز السري. تحقق من الإنترنت وحاول مرة أخرى.');
    } else {
      setErrorMsg('الرمز السري غير صحيح! يرجى المحاولة مرة أخرى.');
      setPassword('');
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setIsAuthorized(false);
    setAdminProof('');
    setConfirmDeleteId(null);
    setConfirmReset(false);
    setStatusBanner(null);
    try {
      localStorage.removeItem('almekawy_dev_authorized');
    } catch {}
    onClose();
  };

  const handleLogout = () => {
    handleClose();
  };

  const markDirty = () => {
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleProfileNameChange = (id: string, name: string) => {
    markDirty();
    setTempProfiles((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        name,
      },
    }));
  };

  const handleProfilePriceChange = (id: string, price: number) => {
    markDirty();
    setTempProfiles((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price,
      },
    }));
  };

  const handleProfileModeChange = (id: string, modeKey: PricingModeKey) => {
    markDirty();
    const cfg = PRICING_MODE_OPTIONS[modeKey];
    setTempProfiles((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const updated: Profile = {
        id: existing.id,
        name: existing.name,
        price: existing.price,
        ...(cfg.isFlat ? { isFlat: true, unit: cfg.unit } : {}),
      };
      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const handleAddonNameChange = (id: string, name: string) => {
    markDirty();
    setTempAddons((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        name,
      },
    }));
  };

  const handleAddonPriceChange = (id: string, price: number) => {
    markDirty();
    setTempAddons((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price,
      },
    }));
  };

  const handleAddonModeChange = (id: string, modeKey: PricingModeKey) => {
    markDirty();
    const cfg = PRICING_MODE_OPTIONS[modeKey];
    setTempAddons((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const updated: Addon = {
        id: existing.id,
        name: existing.name,
        price: existing.price,
        ...(cfg.isFlat ? { isFlat: true, unit: cfg.unit } : {}),
      };
      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const handleAddCustomItem = () => {
    const name = newItemName.trim();
    const rawPrice = newItemPrice.trim();
    const price = rawPrice === '' ? 0 : Number(rawPrice);

    if (!name) {
      showBanner('warning', 'يرجى إدخال اسم البند أولاً قبل الإضافة.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showBanner('warning', 'يرجى إدخال سعر رقمي صحيح (صفر أو أكثر).');
      return;
    }

    markDirty();
    const pricingConfig = PRICING_MODE_OPTIONS[newItemPricingMode];
    const customId = `custom_${Date.now()}`;
    if (newItemType === 'profile') {
      setTempProfiles((prev) => ({
        ...prev,
        [customId]: {
          id: customId,
          name,
          price,
          ...(pricingConfig.isFlat ? { isFlat: true, unit: pricingConfig.unit } : {}),
        },
      }));
      setActiveTab('profiles');
    } else {
      setTempAddons((prev) => ({
        ...prev,
        [customId]: {
          id: customId,
          name,
          price,
          ...(pricingConfig.isFlat ? { isFlat: true, unit: pricingConfig.unit } : {}),
        },
      }));
      setActiveTab('addons');
    }

    setNewItemName('');
    setNewItemPrice('');
    showBanner(
      'success',
      `تمت إضافة "${name}" (${pricingConfig.label}) إلى القائمة — اضغط على "حفظ جميع الأسعار" بالأسفل لحفظها في قاعدة البيانات.`
    );
  };

  const handleDeleteProfile = (p: Profile) => {
    if (Object.keys(tempProfiles).length <= 1) {
      setConfirmDeleteId(null);
      showBanner('warning', 'لا يمكن حذف آخر قطاع متبقٍ؛ يجب وجود قطاع واحد على الأقل للتسعير.');
      return;
    }
    markDirty();
    setTempProfiles((prev) => {
      const copy = { ...prev };
      delete copy[p.id];
      return copy;
    });
    setConfirmDeleteId(null);
    showBanner('success', `تم حذف البند "${p.name}" — اضغط على "حفظ جميع الأسعار" لتأكيد الحفظ الدائم.`);
  };

  const handleDeleteAddon = (a: Addon) => {
    markDirty();
    setTempAddons((prev) => {
      const copy = { ...prev };
      delete copy[a.id];
      return copy;
    });
    setConfirmDeleteId(null);
    showBanner('success', `تم حذف البند "${a.name}" — اضغط على "حفظ جميع الأسعار" لتأكيد الحفظ الدائم.`);
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Client-side validation prior to DB write
    const pList = Object.values(tempProfiles) as Profile[];
    if (pList.length === 0) {
      showBanner('error', 'يجب وجود قطاع واحد على الأقل قبل الحفظ.');
      return;
    }
    for (const p of pList) {
      if (!p.name || !p.name.trim()) {
        setActiveTab('profiles');
        showBanner('error', 'يرجى التأكد من عدم ترك اسم أي قطاع فارغاً قبل الحفظ.');
        return;
      }
      if (!Number.isFinite(Number(p.price)) || Number(p.price) < 0) {
        setActiveTab('profiles');
        showBanner('error', `سعر القطاع "${p.name}" غير صالح. يجب أن يكون رقماً موجباً أو صفراً.`);
        return;
      }
    }

    const aList = Object.values(tempAddons) as Addon[];
    for (const a of aList) {
      if (!a.name || !a.name.trim()) {
        setActiveTab('addons');
        showBanner('error', 'يرجى التأكد من عدم ترك اسم أي إضافة فارغاً قبل الحفظ.');
        return;
      }
      if (!Number.isFinite(Number(a.price)) || Number(a.price) < 0) {
        setActiveTab('addons');
        showBanner('error', `سعر الإضافة "${a.name}" غير صالح. يجب أن يكون رقماً موجباً أو صفراً.`);
        return;
      }
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setStatusBanner(null);

    try {
      const confirmedConfig = await onSavePrices(tempProfiles, tempAddons, adminProof);
      setTempProfiles(JSON.parse(JSON.stringify(confirmedConfig.profiles)));
      setTempAddons(JSON.parse(JSON.stringify(confirmedConfig.addons)));
      setSaveSuccess(true);
      showBanner(
        'success',
        `تم حفظ الأسعار والبنود في قاعدة البيانات بنجاح (الإصدار رقم ${confirmedConfig.version}) وهي مفعّلة الآن لجميع الزوار.`
      );
    } catch (error) {
      setSaveSuccess(false);
      const errText =
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء حفظ الأسعار في قاعدة البيانات. تعديلاتك لا تزال محفوظة في هذه النافذة، يرجى المحاولة مرة أخرى.';
      showBanner('error', errText);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setStatusBanner(null);

    try {
      const confirmedConfig = await onResetPrices(adminProof);
      setTempProfiles(JSON.parse(JSON.stringify(confirmedConfig.profiles)));
      setTempAddons(JSON.parse(JSON.stringify(confirmedConfig.addons)));
      setConfirmReset(false);
      setSaveSuccess(true);
      showBanner(
        'success',
        `تمت استعادة الأسعار الافتراضية وتثبيتها في قاعدة البيانات بنجاح (الإصدار رقم ${confirmedConfig.version}).`
      );
    } catch (error) {
      const errText =
        error instanceof Error
          ? error.message
          : 'فشل استعادة الإعدادات الافتراضية في قاعدة البيانات. يرجى التحقق من الاتصال والمحاولة مرة أخرى.';
      showBanner('error', errText);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const profileList = Object.values(tempProfiles) as Profile[];
  const addonList = Object.values(tempAddons) as Addon[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isSaving ? undefined : handleClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-2 border-slate-250 flex flex-col max-h-[85vh] z-10"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-6 flex justify-between items-center border-b-4 border-[#FACC15]">
          <div className="flex items-center gap-3">
            <Coins size={22} className="text-[#FACC15]" />
            <div>
              <h2 className="text-xl font-display font-black">إعدادات المطور والمشرف</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                تعديل لائحة الأسعار المعتمدة للقطاعات والخيارات الإضافية لجميع الزوار
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          <AnimatePresence mode="wait">
            {!isAuthorized ? (
              /* Passcode Screen */
              <motion.form
                key="lock"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handlePasswordSubmit}
                className="flex flex-col items-center py-8 px-4 text-center max-w-sm mx-auto space-y-6"
              >
                <div className="w-16 h-16 bg-[#FACC15]/15 border border-[#FACC15]/30 rounded-2xl flex items-center justify-center text-[#0F172A]">
                  <Lock size={28} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[#0F172A]">مطلوب كلمة المرور للمشرف</h3>
                  <p className="text-xs text-slate-500 font-bold leading-normal">
                    هذه المنطقة مخصصة لإدارة أسعار القطاعات ومصنع {BRAND_NAME}. يرجى إدخال الرمز المكون من 6 أرقام.
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <input
                    type="password"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    disabled={isVerifyingPasscode}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value.replace(/\D/g, ''));
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="••••••"
                    className="w-full text-center p-3.5 bg-white border-2 border-slate-200 focus:border-[#0F172A] focus:ring-2 focus:ring-[#FACC15] rounded-xl outline-none transition-all font-black text-2xl tracking-widest text-[#0F172A] disabled:opacity-60"
                    autoFocus
                  />

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-600 font-bold flex items-center gap-1.5 justify-center bg-red-50 p-2.5 rounded-xl border border-red-200 text-right"
                    >
                      <ShieldAlert size={15} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={password.length < 6 || isVerifyingPasscode}
                  className="w-full py-3 px-6 bg-[#0F172A] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition shadow-md hover:shadow-lg text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {isVerifyingPasscode ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري التحقق من الصلاحية...</span>
                    </>
                  ) : (
                    <span>تأكيد ودخول</span>
                  )}
                </button>
              </motion.form>
            ) : (
              /* Pricing Panel */
              <motion.div
                key="panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Info and logout */}
                <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl flex justify-between items-center gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-emerald-800 font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>تم التحقق من صلاحية المشرف عبر الخادم</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">
                      جميع التعديلات التي تحفظها هنا تُسجّل مباشرة في قاعدة البيانات وتظهر لجميع الزوار فوراً.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isSaving}
                    className="text-xs font-black text-red-650 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    إلغاء الترخيص والخروج
                  </button>
                </div>

                {statusBanner && (
                  <div
                    role={statusBanner.type === 'error' ? 'alert' : 'status'}
                    className={`p-3.5 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                      statusBanner.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : statusBanner.type === 'error'
                        ? 'bg-red-50 border-red-300 text-red-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {statusBanner.type === 'error' && (
                        <AlertCircle size={16} className="text-red-600 shrink-0" />
                      )}
                      {statusBanner.type === 'success' && (
                        <Check size={16} className="text-emerald-600 shrink-0" />
                      )}
                      <span>{statusBanner.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusBanner(null)}
                      className="text-current opacity-60 hover:opacity-100 p-1 cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profiles');
                      setConfirmDeleteId(null);
                    }}
                    className={`flex-1 py-3 text-center font-black text-sm transition-all border-b-4 flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'profiles'
                        ? 'border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl'
                        : 'border-transparent text-slate-500 hover:text-[#0F172A]'
                    }`}
                  >
                    <Layers size={16} />
                    <span>أسعار القطاعات والبروفايلات ({profileList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('addons');
                      setConfirmDeleteId(null);
                    }}
                    className={`flex-1 py-3 text-center font-black text-sm transition-all border-b-4 flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'addons'
                        ? 'border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl'
                        : 'border-transparent text-slate-500 hover:text-[#0F172A]'
                    }`}
                  >
                    <Sliders size={16} />
                    <span>أسعار الخيارات والإضافات ({addonList.length})</span>
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-6">
                  {/* Add New Custom Item Box */}
                  <div className="bg-amber-50/80 border-2 border-amber-200/70 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>إضافة قطاع جديد أو إضافة اختيارية جديدة</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        value={newItemType}
                        disabled={isSaving}
                        onChange={(e) => setNewItemType(e.target.value as 'profile' | 'addon')}
                        className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="profile">قطاع جديد (Profile)</option>
                        <option value="addon">إضافة اختيارية جديدة (Addon)</option>
                      </select>
                      <input
                        type="text"
                        value={newItemName}
                        disabled={isSaving}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="اسم القطاع أو الإضافة (مثل: قطاع لامينا)"
                        className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                      <select
                        value={newItemPricingMode}
                        disabled={isSaving}
                        onChange={(e) =>
                          setNewItemPricingMode(
                            e.target.value as 'sqm' | 'piece' | 'single_sash' | 'double_sash'
                          )
                        }
                        aria-label="طريقة تطبيق السعر"
                        className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="sqm">تطبيق السعر: للمتر المربع</option>
                        <option value="piece">تطبيق السعر: للقطعة</option>
                        <option value="single_sash">تطبيق السعر: للضلفة</option>
                        <option value="double_sash">تطبيق السعر: للضلفتين</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newItemPrice}
                          disabled={isSaving}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder={`السعر (${PRICING_MODE_OPTIONS[newItemPricingMode].label})`}
                          className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                          min="0"
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleAddCustomItem}
                          className="bg-[#0F172A] hover:bg-black text-[#FACC15] px-4 py-2.5 rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'profiles' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold mb-1">
                        قم بتعديل الاسم أو السعر أو طريقة التسعير أو حذف أي بند من القطاعات التالية:
                      </p>
                      {profileList.map((p) => {
                        const modeKey = getItemPricingMode(p);
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={p.name}
                                disabled={isSaving}
                                onChange={(e) => handleProfileNameChange(p.id, e.target.value)}
                                aria-label={`اسم القطاع ${p.name}`}
                                className="w-full font-black text-sm text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0F172A] focus:bg-slate-50 rounded-lg px-2 py-1 outline-none transition"
                              />
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                              <input
                                type="number"
                                min="0"
                                disabled={isSaving}
                                value={p.price === 0 ? '' : p.price}
                                onChange={(e) =>
                                  handleProfilePriceChange(
                                    p.id,
                                    e.target.value === '' ? 0 : Number(e.target.value)
                                  )
                                }
                                className="w-24 p-2 text-left bg-slate-50 border-2 border-slate-150 rounded-xl font-bold font-mono focus:border-[#0F172A] focus:bg-white outline-none"
                              />
                              <select
                                value={modeKey}
                                disabled={isSaving}
                                onChange={(e) =>
                                  handleProfileModeChange(p.id, e.target.value as PricingModeKey)
                                }
                                aria-label={`طريقة تسعير ${p.name}`}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-700 outline-none cursor-pointer"
                              >
                                <option value="sqm">ج.م / م²</option>
                                <option value="piece">ج.م / للقطعة</option>
                                <option value="single_sash">ج.م / للضلفة</option>
                                <option value="double_sash">ج.م / للضلفتين</option>
                                {modeKey === 'opening' && (
                                  <option value="opening">ج.م / للفتحة</option>
                                )}
                              </select>

                              {confirmDeleteId === p.id ? (
                                <div className="flex items-center gap-1 mr-1">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleDeleteProfile(p)}
                                    className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                  >
                                    تأكيد الحذف
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => setConfirmDeleteId(p.id)}
                                  title={`حذف ${p.name}`}
                                  className="mr-1 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-2 rounded-xl border border-red-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  <span>حذف</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold mb-1">
                        قم بتعديل الاسم أو السعر أو طريقة التسعير أو حذف أي بند من الخيارات الإضافية المتنوعة:
                      </p>
                      {addonList.length === 0 ? (
                        <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-500">
                          لا توجد إضافات حالياً. يمكنك إضافة بند جديد من الأعلى أو استعادة الإعدادات الافتراضية.
                        </div>
                      ) : (
                        addonList.map((a) => {
                          const modeKey = getItemPricingMode(a);
                          return (
                            <div
                              key={a.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 gap-3"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <input
                                  type="text"
                                  value={a.name}
                                  disabled={isSaving}
                                  onChange={(e) => handleAddonNameChange(a.id, e.target.value)}
                                  aria-label={`اسم الإضافة ${a.name}`}
                                  className="w-full font-black text-sm text-slate-850 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0F172A] focus:bg-slate-50 rounded-lg px-2 py-1 outline-none transition"
                                />
                                {a.id === 'panda' && (
                                  <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold mr-2">
                                    يعمل أيضاً كمضاعف × 1.5 لسعر القطاع الأساسي
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                <input
                                  type="number"
                                  min="0"
                                  disabled={isSaving}
                                  value={a.price === 0 ? '' : a.price}
                                  onChange={(e) =>
                                    handleAddonPriceChange(
                                      a.id,
                                      e.target.value === '' ? 0 : Number(e.target.value)
                                    )
                                  }
                                  className="w-24 p-2 text-left bg-slate-50 border-2 border-slate-150 rounded-xl font-bold font-mono focus:border-[#0F172A] focus:bg-white outline-none"
                                />
                                {a.id === 'panda' ? (
                                  <span className="text-xs text-slate-400 font-extrabold font-mono px-2">
                                    ج.م / م²
                                  </span>
                                ) : (
                                  <select
                                    value={modeKey}
                                    disabled={isSaving}
                                    onChange={(e) =>
                                      handleAddonModeChange(a.id, e.target.value as PricingModeKey)
                                    }
                                    aria-label={`طريقة تسعير ${a.name}`}
                                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-700 outline-none cursor-pointer"
                                  >
                                    <option value="sqm">ج.م / م²</option>
                                    <option value="piece">ج.م / للقطعة</option>
                                    <option value="single_sash">ج.م / للضلفة</option>
                                    <option value="double_sash">ج.م / للضلفتين</option>
                                    <option value="opening">ج.م / للفتحة</option>
                                  </select>
                                )}

                                {confirmDeleteId === a.id ? (
                                  <div className="flex items-center gap-1 mr-1">
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleDeleteAddon(a)}
                                      className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                    >
                                      تأكيد الحذف
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setConfirmDeleteId(a.id)}
                                    title={`حذف ${a.name}`}
                                    className="mr-1 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-2 rounded-xl border border-red-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Trash2 size={14} />
                                    <span>حذف</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {isAuthorized && (
          <div className="p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            {confirmReset ? (
              <div className="w-full sm:w-auto flex items-center gap-2 justify-center">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleReset}
                  className="text-xs font-black text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>تأكيد استعادة الافتراضي</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setConfirmReset(false)}
                  className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmReset(true)}
                className="w-full sm:w-auto text-xs font-black text-slate-600 hover:text-[#0F172A] hover:bg-white px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-350 transition flex items-center gap-2 justify-center cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} />
                <span>إعادة تعيين للإعدادات الافتراضية</span>
              </button>
            )}

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClose}
                className="flex-1 sm:flex-none text-xs font-black text-slate-500 bg-white hover:bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-center cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                إغلاق النافذة
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 sm:flex-none text-xs font-black bg-[#FACC15] hover:bg-[#E2B90F] disabled:opacity-70 disabled:cursor-not-allowed text-[#0F172A] px-6 py-3 rounded-xl shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#0F172A]" />
                    <span>جاري الحفظ في قاعدة البيانات...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={14} className="text-[#0F172A]" />
                    <span>تم تأكيد الحفظ!</span>
                  </>
                ) : (
                  <span>حفظ جميع الأسعار</span>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
