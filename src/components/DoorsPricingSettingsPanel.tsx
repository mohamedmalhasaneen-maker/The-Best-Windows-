import React, { useState } from 'react';
import {
  DoorClosed,
  Shield,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Truck,
  Eye,
  EyeOff,
  Sliders,
} from 'lucide-react';
import {
  WpcPricingConfig,
  WpcDoorPackageConfig,
  ArmoredDoorTypeConfig,
} from '../types';
import { DEFAULT_WPC_PRICING_CONFIG } from '../constants/wpcConstants';
import { ARMORED_INCLUSION_NOTE } from '../constants/armoredConstants';

interface DoorsPricingSettingsPanelProps {
  wpcPricing: WpcPricingConfig;
  armoredTypes: ArmoredDoorTypeConfig[];
  onChangeWpc: (next: WpcPricingConfig) => void;
  onChangeArmored: (next: ArmoredDoorTypeConfig[]) => void;
  usedWpcTypeIds: Set<string>;
  usedArmoredTypeIds: Set<string>;
  isSaving: boolean;
  onBanner: (type: 'success' | 'warning' | 'error', text: string) => void;
}

export const DoorsPricingSettingsPanel: React.FC<DoorsPricingSettingsPanelProps> = ({
  wpcPricing,
  armoredTypes,
  onChangeWpc,
  onChangeArmored,
  usedWpcTypeIds,
  usedArmoredTypeIds,
  isSaving,
  onBanner,
}) => {
  const [subTab, setSubTab] = useState<'wpc' | 'armored'>('wpc');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // New WPC door type draft state
  const [newWpcName, setNewWpcName] = useState('');
  const [newWpcPrice, setNewWpcPrice] = useState('');
  const [newWpcSpecs, setNewWpcSpecs] = useState('');
  const [newWpcBadge, setNewWpcBadge] = useState('باقة مخصصة');
  const [newWpcIncludesAcc, setNewWpcIncludesAcc] = useState(false);

  // New Armored door type draft state
  const [newArmoredLabel, setNewArmoredLabel] = useState('');
  const [newArmoredSpecs, setNewArmoredSpecs] = useState('');
  const [newArmoredPrice, setNewArmoredPrice] = useState('');
  const [newArmoredBadge, setNewArmoredBadge] = useState('مواصفات معتمدة');
  const [newArmoredIncludesTransport, setNewArmoredIncludesTransport] = useState(true);

  const packages = wpcPricing.packages || [];
  const addonOrder =
    Array.isArray(wpcPricing.addonOrder) && wpcPricing.addonOrder.length > 0
      ? wpcPricing.addonOrder
      : DEFAULT_WPC_PRICING_CONFIG.addonOrder;

  const isWpcPackageInUse = (pkg: WpcDoorPackageConfig) => {
    if (usedWpcTypeIds.has(pkg.id)) return true;
    if ((pkg.id === '9000' || pkg.id === '7000') && usedWpcTypeIds.has(String(pkg.price))) {
      return true;
    }
    return false;
  };

  const handleWpcPackageUpdate = (
    id: string,
    patch: Partial<WpcDoorPackageConfig>
  ) => {
    const nextPackages = packages.map((p) => (p.id === id ? { ...p, ...patch } : p));
    onChangeWpc({
      ...wpcPricing,
      packages: nextPackages,
    });
  };

  const handleAddWpcPackage = () => {
    const name = newWpcName.trim();
    const specs = newWpcSpecs.trim();
    const price = Number(newWpcPrice.trim());

    if (!name) {
      onBanner('warning', 'يرجى إدخال اسم نوع باب WPC الجديد أولاً.');
      return;
    }
    if (!newWpcPrice.trim() || !Number.isFinite(price) || price < 0) {
      onBanner('warning', 'يرجى إدخال سعر رقمي صحيح (صفر أو أكثر) لنوع WPC الجديد.');
      return;
    }

    const newPkg: WpcDoorPackageConfig = {
      id: `wpc_custom_${Date.now()}`,
      name,
      description:
        specs ||
        (newWpcIncludesAcc
          ? 'شامل النقل والتركيب والإكسسوارات'
          : 'مواصفات قياسية قابلة لإضافة الملحقات'),
      badge: newWpcBadge.trim() || (newWpcIncludesAcc ? 'شامل كامل' : 'مخصص'),
      price,
      hasAccessoriesIncluded: newWpcIncludesAcc,
      isActive: true,
    };

    onChangeWpc({
      ...wpcPricing,
      packages: [...packages, newPkg],
    });

    setNewWpcName('');
    setNewWpcPrice('');
    setNewWpcSpecs('');
    setNewWpcBadge('باقة مخصصة');
    setNewWpcIncludesAcc(false);
    onBanner(
      'success',
      `تمت إضافة "${name}" إلى قائمة أبواب WPC — اضغط على "حفظ التغييرات" لتثبيته في قاعدة البيانات.`
    );
  };

  const handleDeleteWpcPackage = (pkg: WpcDoorPackageConfig) => {
    if (packages.length <= 1) {
      setConfirmDeleteKey(null);
      onBanner('warning', 'يجب الإبقاء على نوع واحد على الأقل في قائمة أبواب WPC.');
      return;
    }
    if (isWpcPackageInUse(pkg)) {
      setConfirmDeleteKey(null);
      onBanner(
        'warning',
        `لا يمكن حذف "${pkg.name}" لأنه مستخدم في عروض أسعار حالية أو محفوظة. يمكنك إخفاؤه من نموذج العروض بدلاً من حذفه.`
      );
      return;
    }
    const nextPackages = packages.filter((p) => p.id !== pkg.id);
    if (!nextPackages.some((p) => p.isActive)) {
      nextPackages[0] = { ...nextPackages[0], isActive: true };
    }
    onChangeWpc({
      ...wpcPricing,
      packages: nextPackages,
    });
    setConfirmDeleteKey(null);
    onBanner(
      'success',
      `تم حذف نوع WPC "${pkg.name}" — اضغط على "حفظ التغييرات" لتأكيد الحفظ.`
    );
  };

  const handleWpcAddonUpdate = (
    key: string,
    patch: { name?: string; description?: string; price?: number }
  ) => {
    const existing = wpcPricing.addons[key] || DEFAULT_WPC_PRICING_CONFIG.addons[key];
    if (!existing) return;
    onChangeWpc({
      ...wpcPricing,
      addons: {
        ...wpcPricing.addons,
        [key]: {
          ...existing,
          ...patch,
        },
      },
    });
  };

  const handleArmoredTypeUpdate = (
    id: string,
    patch: Partial<ArmoredDoorTypeConfig>
  ) => {
    const next = armoredTypes.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      if (patch.specs !== undefined && patch.productName === undefined) {
        merged.productName = patch.specs;
      }
      const inc = merged.includesTransportAndInstall !== false;
      merged.description = `${merged.specs} · ${
        inc ? ARMORED_INCLUSION_NOTE : 'السعر غير شامل النقل والتركيب'
      }`;
      return merged;
    });
    onChangeArmored(next);
  };

  const handleAddArmoredType = () => {
    const label = newArmoredLabel.trim();
    const specs = newArmoredSpecs.trim();
    const price = Number(newArmoredPrice.trim());

    if (!label) {
      onBanner('warning', 'يرجى إدخال اسم نوع الباب المصفح الجديد أولاً.');
      return;
    }
    if (!specs) {
      onBanner('warning', 'يرجى إدخال مواصفات نوع الباب المصفح الجديد.');
      return;
    }
    if (!newArmoredPrice.trim() || !Number.isFinite(price) || price < 0) {
      onBanner('warning', 'يرجى إدخال سعر رقمي صحيح (صفر أو أكثر) للباب المصفح.');
      return;
    }

    const inc = newArmoredIncludesTransport;
    const newType: ArmoredDoorTypeConfig = {
      id: `armored_custom_${Date.now()}`,
      label,
      productName: specs,
      specs,
      price,
      badge: newArmoredBadge.trim() || 'مواصفات معتمدة',
      description: `${specs} · ${inc ? ARMORED_INCLUSION_NOTE : 'السعر غير شامل النقل والتركيب'}`,
      includesTransportAndInstall: inc,
      isActive: true,
    };

    onChangeArmored([...armoredTypes, newType]);
    setNewArmoredLabel('');
    setNewArmoredSpecs('');
    setNewArmoredPrice('');
    setNewArmoredBadge('مواصفات معتمدة');
    setNewArmoredIncludesTransport(true);
    onBanner(
      'success',
      `تمت إضافة "${label}" إلى قائمة الأبواب المصفحة — اضغط على "حفظ التغييرات" لتثبيته في قاعدة البيانات.`
    );
  };

  const handleDeleteArmoredType = (item: ArmoredDoorTypeConfig) => {
    if (armoredTypes.length <= 1) {
      setConfirmDeleteKey(null);
      onBanner('warning', 'يجب الإبقاء على نوع واحد على الأقل في قسم الأبواب المصفحة.');
      return;
    }
    if (usedArmoredTypeIds.has(item.id)) {
      setConfirmDeleteKey(null);
      onBanner(
        'warning',
        `لا يمكن حذف "${item.label}" لأنه مستخدم في عروض أسعار حالية أو محفوظة. يمكنك إيقاف تفعيله من نموذج العروض بدلاً من الحذف.`
      );
      return;
    }
    const next = armoredTypes.filter((t) => t.id !== item.id);
    if (!next.some((t) => t.isActive !== false)) {
      next[0] = { ...next[0], isActive: true };
    }
    onChangeArmored(next);
    setConfirmDeleteKey(null);
    onBanner(
      'success',
      `تم حذف النوع "${item.label}" — اضغط على "حفظ التغييرات" لتأكيد الحفظ.`
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Sub-navigation between WPC and Armored Doors */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-2 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setSubTab('wpc');
            setConfirmDeleteKey(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'wpc'
              ? 'bg-[#0F172A] text-[#FACC15] shadow-sm'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <DoorClosed size={16} />
          <span>أسعار أبواب WPC والإضافات ({packages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('armored');
            setConfirmDeleteKey(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'armored'
              ? 'bg-[#0F172A] text-[#FACC15] shadow-sm'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <Shield size={16} />
          <span>أسعار الأبواب المصفحة ({armoredTypes.length})</span>
        </button>
      </div>

      {/* WPC Doors Management */}
      {subTab === 'wpc' && (
        <div className="space-y-6">
          {/* Add New WPC Door Type */}
          <div className="bg-amber-50/80 border-2 border-amber-200/80 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Plus size={15} className="text-amber-700" />
              <span>إضافة نوع أو باقة باب WPC جديدة</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                disabled={isSaving}
                value={newWpcName}
                onChange={(e) => setNewWpcName(e.target.value)}
                placeholder="اسم النوع / الباقة (مثال: باقة VIP فاخرة)"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              <input
                type="number"
                min="0"
                disabled={isSaving}
                value={newWpcPrice}
                onChange={(e) => setNewWpcPrice(e.target.value)}
                placeholder="السعر بالجنيه (مثال: 10500)"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none font-mono"
              />
              <input
                type="text"
                disabled={isSaving}
                value={newWpcSpecs}
                onChange={(e) => setNewWpcSpecs(e.target.value)}
                placeholder="مواصفات الباقة أو التوريد"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={isSaving}
                  value={newWpcBadge}
                  onChange={(e) => setNewWpcBadge(e.target.value)}
                  placeholder="الوسم (شامل / توريد)"
                  className="flex-1 p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAddWpcPackage}
                  className="bg-[#0F172A] hover:bg-black text-[#FACC15] px-4 py-2.5 rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  إضافة
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newWpcIncludesAcc}
                disabled={isSaving}
                onChange={(e) => setNewWpcIncludesAcc(e.target.checked)}
                className="w-4 h-4 accent-[#0F172A]"
              />
              <span>تشمل الإكسسوارات مجاناً ضمن السعر (مثل باقة شامل كامل)</span>
            </label>
          </div>

          {/* Existing WPC Packages List */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <DoorClosed size={15} className="text-[#0F172A]" />
              <span>أنواع وباقات أبواب WPC الحالية ({packages.length})</span>
            </h5>

            {packages.map((pkg) => {
              const inUse = isWpcPackageInUse(pkg);
              const activeCount = packages.filter((p) => p.isActive !== false).length;
              const isOnlyActive = pkg.isActive !== false && activeCount <= 1;

              return (
                <div
                  key={pkg.id}
                  className={`p-4 rounded-2xl border-2 transition space-y-3 ${
                    pkg.isActive !== false
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-100 border-slate-300 opacity-80'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        اسم النوع / الباقة
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={pkg.name}
                        onChange={(e) =>
                          handleWpcPackageUpdate(pkg.id, { name: e.target.value })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-black text-slate-900 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        الوسم
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={pkg.badge}
                        onChange={(e) =>
                          handleWpcPackageUpdate(pkg.id, { badge: e.target.value })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        السعر (جنيه مصري)
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={isSaving}
                        value={pkg.price === 0 ? '' : pkg.price}
                        onChange={(e) =>
                          handleWpcPackageUpdate(pkg.id, {
                            price: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="w-full p-2 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-sm font-black font-mono text-left text-[#0F172A] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1">
                      المواصفات والتفاصيل
                    </label>
                    <input
                      type="text"
                      disabled={isSaving}
                      value={pkg.description}
                      onChange={(e) =>
                        handleWpcPackageUpdate(pkg.id, { description: e.target.value })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={pkg.hasAccessoriesIncluded}
                          onChange={(e) =>
                            handleWpcPackageUpdate(pkg.id, {
                              hasAccessoriesIncluded: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#0F172A]"
                        />
                        <span>شامل الإكسسوارات مجاناً</span>
                      </label>

                      <button
                        type="button"
                        disabled={isSaving || isOnlyActive}
                        onClick={() =>
                          handleWpcPackageUpdate(pkg.id, { isActive: pkg.isActive === false })
                        }
                        title={
                          isOnlyActive
                            ? 'يجب الإبقاء على نوع واحد نشط على الأقل'
                            : pkg.isActive !== false
                            ? 'إخفاء من نموذج إنشاء العروض'
                            : 'تفعيل في نموذج إنشاء العروض'
                        }
                        className={`text-[11px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                          pkg.isActive !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {pkg.isActive !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{pkg.isActive !== false ? 'مفعّل' : 'مخفي'}</span>
                      </button>

                      {inUse && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          مرتبط بعروض حالية/محفوظة
                        </span>
                      )}
                    </div>

                    {confirmDeleteKey === `wpc_${pkg.id}` ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleDeleteWpcPackage(pkg)}
                          className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl cursor-pointer"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setConfirmDeleteKey(null)}
                          className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving || packages.length <= 1 || inUse}
                        onClick={() => setConfirmDeleteKey(`wpc_${pkg.id}`)}
                        title={
                          inUse
                            ? 'لا يمكن حذف نوع مستخدم في عروض قائمة أو محفوظة'
                            : 'حذف هذا النوع'
                        }
                        className="text-[11px] font-black text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* WPC Addons Section */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h5 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Sliders size={15} className="text-[#0F172A]" />
              <span>أسعار إضافات أبواب WPC (تُعدل بشكل مستقل)</span>
            </h5>

            <div className="grid grid-cols-1 gap-2.5">
              {addonOrder.map((key) => {
                const addon = wpcPricing.addons[key] || DEFAULT_WPC_PRICING_CONFIG.addons[key];
                if (!addon) return null;
                return (
                  <div
                    key={key}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        disabled={isSaving}
                        value={addon.name}
                        onChange={(e) =>
                          handleWpcAddonUpdate(key, { name: e.target.value })
                        }
                        aria-label={`اسم إضافة ${addon.name}`}
                        className="w-full font-black text-xs sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-lg px-2.5 py-1 outline-none"
                      />
                      <input
                        type="text"
                        disabled={isSaving}
                        value={addon.description}
                        onChange={(e) =>
                          handleWpcAddonUpdate(key, { description: e.target.value })
                        }
                        placeholder="وصف الإضافة"
                        className="w-full font-bold text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-slate-50 rounded-lg px-2 py-0.5 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        disabled={isSaving}
                        value={addon.price === 0 ? '' : addon.price}
                        onChange={(e) =>
                          handleWpcAddonUpdate(key, {
                            price: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="w-28 p-2 text-left bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl font-black font-mono text-sm text-[#0F172A] outline-none"
                      />
                      <span className="text-xs font-black text-slate-500">ج.م</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Armored Doors Management */}
      {subTab === 'armored' && (
        <div className="space-y-6">
          {/* Add New Armored Door Type */}
          <div className="bg-amber-50/80 border-2 border-amber-200/80 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Plus size={15} className="text-amber-700" />
              <span>إضافة نوع باب مصفح جديد</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                disabled={isSaving}
                value={newArmoredLabel}
                onChange={(e) => setNewArmoredLabel(e.target.value)}
                placeholder="اسم النوع (مثال: تركي دبل شاسيه)"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              <input
                type="number"
                min="0"
                disabled={isSaving}
                value={newArmoredPrice}
                onChange={(e) => setNewArmoredPrice(e.target.value)}
                placeholder="السعر بالجنيه (مثال: 17500)"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none font-mono"
              />
              <input
                type="text"
                disabled={isSaving}
                value={newArmoredSpecs}
                onChange={(e) => setNewArmoredSpecs(e.target.value)}
                placeholder="المواصفات (مثال: تصفيح كامل – 3 كالون – 12 سم)"
                className="p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={isSaving}
                  value={newArmoredBadge}
                  onChange={(e) => setNewArmoredBadge(e.target.value)}
                  placeholder="الوسم المختصر"
                  className="flex-1 p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAddArmoredType}
                  className="bg-[#0F172A] hover:bg-black text-[#FACC15] px-4 py-2.5 rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  إضافة
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newArmoredIncludesTransport}
                disabled={isSaving}
                onChange={(e) => setNewArmoredIncludesTransport(e.target.checked)}
                className="w-4 h-4 accent-[#0F172A]"
              />
              <span>السعر شامل النقل والتركيب (مفعل افتراضياً)</span>
            </label>
          </div>

          {/* Existing Armored Door Types List */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Shield size={15} className="text-[#0F172A]" />
              <span>قائمة أنواع وأسعار الأبواب المصفحة ({armoredTypes.length})</span>
            </h5>

            {armoredTypes.map((item) => {
              const inUse = usedArmoredTypeIds.has(item.id);
              const activeCount = armoredTypes.filter((t) => t.isActive !== false).length;
              const isOnlyActive = item.isActive !== false && activeCount <= 1;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 transition space-y-3 ${
                    item.isActive !== false
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-100 border-slate-300 opacity-80'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        اسم نوع الباب
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={item.label}
                        onChange={(e) =>
                          handleArmoredTypeUpdate(item.id, { label: e.target.value })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-black text-slate-900 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        الوسم
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={item.badge}
                        onChange={(e) =>
                          handleArmoredTypeUpdate(item.id, { badge: e.target.value })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">
                        السعر للباب الواحد (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={isSaving}
                        value={item.price === 0 ? '' : item.price}
                        onChange={(e) =>
                          handleArmoredTypeUpdate(item.id, {
                            price: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="w-full p-2 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-sm font-black font-mono text-left text-[#0F172A] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1">
                      المواصفات التفصيلية (تظهر بالعرض وملف PDF)
                    </label>
                    <input
                      type="text"
                      disabled={isSaving}
                      value={item.specs}
                      onChange={(e) =>
                        handleArmoredTypeUpdate(item.id, {
                          specs: e.target.value,
                          productName: e.target.value,
                        })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={item.includesTransportAndInstall !== false}
                          onChange={(e) =>
                            handleArmoredTypeUpdate(item.id, {
                              includesTransportAndInstall: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-emerald-600"
                        />
                        <Truck size={13} className="text-emerald-700" />
                        <span>{ARMORED_INCLUSION_NOTE}</span>
                      </label>

                      <button
                        type="button"
                        disabled={isSaving || isOnlyActive}
                        onClick={() =>
                          handleArmoredTypeUpdate(item.id, {
                            isActive: item.isActive === false,
                          })
                        }
                        title={
                          isOnlyActive
                            ? 'يجب الإبقاء على نوع واحد مفعّل على الأقل'
                            : item.isActive !== false
                            ? 'تعطيل/إخفاء من قائمة إنشاء العروض'
                            : 'تفعيل/إظهار في قائمة إنشاء العروض'
                        }
                        className={`text-[11px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                          item.isActive !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {item.isActive !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{item.isActive !== false ? 'مفعّل' : 'مخفي'}</span>
                      </button>

                      {inUse && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          مرتبط بعروض حالية/محفوظة
                        </span>
                      )}
                    </div>

                    {confirmDeleteKey === `arm_${item.id}` ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleDeleteArmoredType(item)}
                          className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-xl cursor-pointer"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setConfirmDeleteKey(null)}
                          className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving || armoredTypes.length <= 1 || inUse}
                        onClick={() => setConfirmDeleteKey(`arm_${item.id}`)}
                        title={
                          inUse
                            ? 'لا يمكن حذف نوع مستخدم في عروض قائمة أو محفوظة'
                            : 'حذف هذا النوع'
                        }
                        className="text-[11px] font-black text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-600 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <span>
          ملاحظة حماية العروض: أي تعديل على الأسعار هنا ينعكس فوراً على البنود والعروض الجديدة فقط، وتبقى جميع العروض المحفوظة سابقاً محتفظة بأسعارها التاريخية كما أُنشئت.
        </span>
      </div>
    </div>
  );
};
