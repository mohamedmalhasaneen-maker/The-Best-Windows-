/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, ShieldAlert, Check, Coins, RefreshCw, Layers, Sliders, Trash2 } from 'lucide-react';
import { Profile, Addon } from '../types';
import { BRAND_NAME } from '../constants';

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  onSavePrices: (updatedProfiles: Record<string, Profile>, updatedAddons: Record<string, Addon>) => void;
  onResetPrices: () => void;
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'addons'>('profiles');

  const [tempProfiles, setTempProfiles] = useState<Record<string, Profile>>({});
  const [tempAddons, setTempAddons] = useState<Record<string, Addon>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const [newItemType, setNewItemType] = useState<'profile' | 'addon'>('profile');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Sync temporary state with actual active prices
  useEffect(() => {
    if (isOpen) {
      setTempProfiles(JSON.parse(JSON.stringify(profiles)));
      setTempAddons(JSON.parse(JSON.stringify(addons)));
      setIsAuthorized(false); // Always prompt for password on opening
      setPassword('');
      setErrorMsg('');
      setSaveSuccess(false);
      setConfirmDeleteId(null);
      setConfirmReset(false);
      setStatusBanner(null);
      setNewItemName('');
      setNewItemPrice('');
      localStorage.removeItem('almekawy_dev_authorized');
    }
  }, [isOpen, profiles, addons]);

  const showBanner = (type: 'success' | 'warning', text: string) => {
    setStatusBanner({ type, text });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '662006') {
      setIsAuthorized(true);
      setErrorMsg('');
    } else {
      setErrorMsg('الرمز السري غير صحيح! يرجى المحاولة مرة أخرى.');
      setPassword('');
    }
  };

  const handleClose = () => {
    setIsAuthorized(false);
    setConfirmDeleteId(null);
    setConfirmReset(false);
    setStatusBanner(null);
    localStorage.removeItem('almekawy_dev_authorized');
    onClose();
  };

  const handleLogout = () => {
    handleClose();
  };

  const handleProfilePriceChange = (id: string, price: number) => {
    setTempProfiles((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price,
      },
    }));
  };

  const handleAddonPriceChange = (id: string, price: number) => {
    setTempAddons((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price,
      },
    }));
  };

  const handleAddCustomItem = () => {
    const name = newItemName.trim();
    const price = Number(newItemPrice || 0);

    if (!name) {
      showBanner('warning', 'يرجى إدخال اسم البند أولاً قبل الإضافة.');
      return;
    }

    const customId = `custom_${Date.now()}`;
    if (newItemType === 'profile') {
      setTempProfiles((prev) => ({
        ...prev,
        [customId]: { id: customId, name, price },
      }));
      setActiveTab('profiles');
    } else {
      setTempAddons((prev) => ({
        ...prev,
        [customId]: { id: customId, name, price, isFlat: true, unit: 'للقطعة' },
      }));
      setActiveTab('addons');
    }

    setNewItemName('');
    setNewItemPrice('');
    showBanner('success', `تمت إضافة "${name}" — اضغط على "حفظ جميع الأسعار" بالأسفل لتثبيت التغييرات.`);
  };

  const handleDeleteProfile = (p: Profile) => {
    if (Object.keys(tempProfiles).length <= 1) {
      setConfirmDeleteId(null);
      showBanner('warning', 'لا يمكن حذف آخر قطاع متبقٍ؛ يجب وجود قطاع واحد على الأقل للتسعير.');
      return;
    }
    setTempProfiles((prev) => {
      const copy = { ...prev };
      delete copy[p.id];
      return copy;
    });
    setConfirmDeleteId(null);
    showBanner('success', `تم حذف البند "${p.name}" — اضغط على "حفظ جميع الأسعار" لتأكيد الحفظ.`);
  };

  const handleDeleteAddon = (a: Addon) => {
    setTempAddons((prev) => {
      const copy = { ...prev };
      delete copy[a.id];
      return copy;
    });
    setConfirmDeleteId(null);
    showBanner('success', `تم حذف البند "${a.name}" — اضغط على "حفظ جميع الأسعار" لتأكيد الحفظ.`);
  };

  const handleSave = () => {
    onSavePrices(tempProfiles, tempAddons);
    setSaveSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 450);
  };

  const handleReset = () => {
    onResetPrices();
    setConfirmReset(false);
    handleClose();
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
        onClick={handleClose}
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
        {/* Header Header */}
        <div className="bg-[#0F172A] text-white p-6 flex justify-between items-center border-b-4 border-[#FACC15]">
          <div className="flex items-center gap-3">
            <Coins size={22} className="text-[#FACC15]" />
            <div>
              <h2 className="text-xl font-display font-black">إعدادات المطور والمشرف</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">تعديل لائحة الأسعار للقطاعات والخيارات الإضافية</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center p-3.5 bg-white border-2 border-slate-200 focus:border-[#0F172A] focus:ring-2 focus:ring-[#FACC15] rounded-xl outline-none transition-all font-black text-2xl tracking-widest text-[#0F172A]"
                    autoFocus
                  />

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-500 font-bold flex items-center gap-1.5 justify-center bg-red-50 p-2 rounded-xl border border-red-100"
                    >
                      <ShieldAlert size={14} />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={password.length < 6}
                  className="w-full py-3 px-6 bg-[#0F172A] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition shadow-md hover:shadow-lg text-sm cursor-pointer"
                >
                  تأكيد ودخول
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
                <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs text-emerald-800 font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>تم تسجيل الدخول بنجاح كمطور/مشرف</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">يمكنك الآن تعديل أو إضافة أو حذف أي بند من القطاعات والإضافات مباشرة.</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-black text-red-650 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition cursor-pointer"
                  >
                    إلغاء الترخيص والخروج
                  </button>
                </div>

                {statusBanner && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-black flex items-center justify-between gap-2 ${
                      statusBanner.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <span>{statusBanner.text}</span>
                    <button
                      type="button"
                      onClick={() => setStatusBanner(null)}
                      className="text-current opacity-60 hover:opacity-100 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b-2 border-slate-200">
                  <button
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={newItemType}
                        onChange={(e) => setNewItemType(e.target.value as 'profile' | 'addon')}
                        className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="profile">قطاع جديد (Profile)</option>
                        <option value="addon">إضافة اختيارية جديدة (Addon)</option>
                      </select>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="اسم القطاع أو الإضافة (مثل: قطاع لامينا)"
                        className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder="السعر (ج.م)"
                          className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                          min="0"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          className="bg-[#0F172A] hover:bg-black text-[#FACC15] px-4 py-2.5 rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-sm"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'profiles' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold mb-1">قم بتعديل سعر المتر المربع الأساسي أو حذف أي بند من القطاعات التالية:</p>
                      {profileList.map((p) => (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 gap-3">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                            <span>{p.name}</span>
                          </span>
                          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <input
                              type="number"
                              min="0"
                              value={p.price === 0 ? '' : p.price}
                              onChange={(e) => handleProfilePriceChange(p.id, e.target.value === '' ? 0 : Number(e.target.value))}
                              className="w-28 p-2 text-left bg-slate-50 border-2 border-slate-150 rounded-xl font-bold font-mono focus:border-[#0F172A] focus:bg-white outline-none"
                            />
                            <span className="text-xs text-slate-400 font-extrabold font-mono">L.E / m²</span>

                            {confirmDeleteId === p.id ? (
                              <div className="flex items-center gap-1 mr-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProfile(p)}
                                  className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                >
                                  تأكيد الحذف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(p.id)}
                                title={`حذف ${p.name}`}
                                className="mr-1 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-2 rounded-xl border border-red-200 transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={14} />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold mb-1">قم بتعديل تسعير أو حذف أي بند من الخيارات الإضافية المتنوعة:</p>
                      {addonList.length === 0 ? (
                        <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-500">
                          لا توجد إضافات حالياً. يمكنك إضافة بند جديد من الأعلى أو استعادة الإعدادات الافتراضية.
                        </div>
                      ) : (
                        addonList.map((a) => (
                          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 gap-3">
                            <span className="font-black text-sm text-slate-850 flex items-center gap-1.5 flex-wrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>{a.name}</span>
                              {a.id === 'panda' && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  يعمل أيضاً كمضاعف × 1.5 لسعر القطاع الأساسي
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                              <input
                                type="number"
                                min="0"
                                value={a.price === 0 ? '' : a.price}
                                onChange={(e) => handleAddonPriceChange(a.id, e.target.value === '' ? 0 : Number(e.target.value))}
                                className="w-28 p-2 text-left bg-slate-50 border-2 border-slate-150 rounded-xl font-bold font-mono focus:border-[#0F172A] focus:bg-white outline-none"
                              />
                              <span className="text-xs text-slate-400 font-extrabold font-mono">
                                {a.id === 'panda' ? 'L.E / m²' : a.isFlat ? `L.E ${a.unit || 'قطعة'}` : 'L.E / m²'}
                              </span>

                              {confirmDeleteId === a.id ? (
                                <div className="flex items-center gap-1 mr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddon(a)}
                                    className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                  >
                                    تأكيد الحذف
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(a.id)}
                                  title={`حذف ${a.name}`}
                                  className="mr-1 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-2 rounded-xl border border-red-200 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  <span>حذف</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
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
                  onClick={handleReset}
                  className="text-xs font-black text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  تأكيد استعادة الافتراضي
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full sm:w-auto text-xs font-black text-slate-600 hover:text-[#0F172A] hover:bg-white px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-350 transition flex items-center gap-2 justify-center cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>إعادة تعيين للإعدادات الافتراضية</span>
              </button>
            )}

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 sm:flex-none text-xs font-black text-slate-500 bg-white hover:bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-center cursor-pointer whitespace-nowrap"
              >
                إغلاق النافذة
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none text-xs font-black bg-[#FACC15] hover:bg-[#E2B90F] text-[#0F172A] px-6 py-3 rounded-xl shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {saveSuccess ? (
                  <>
                    <Check size={14} className="text-[#0F172A]" />
                    <span>تم حفظ التعديلات!</span>
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
