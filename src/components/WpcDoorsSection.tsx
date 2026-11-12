import React, { useState } from 'react';
import {
  DoorClosed,
  Plus,
  Check,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Layers,
  Wrench,
  Palette,
  Ruler,
  Maximize2,
  FileText,
  Info,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WpcDoorItem,
  WpcSizeType,
  WpcAddons,
  WpcPricingConfig,
  DEFAULT_WPC_PRICING_CONFIG,
  WPC_STANDARD_SIZES,
  calculateWpcDoorPrice,
  getWpcDoorDisplayData,
  formatWpcDoorSize,
  resolveWpcPackageMeta,
} from '../constants/wpcConstants';

interface WpcDoorsSectionProps {
  wpcDoors: WpcDoorItem[];
  wpcPricing?: WpcPricingConfig;
  pricingSyncStatus?: 'loading' | 'synced' | 'error';
  pricingErrorText?: string | null;
  onRetryLoadPricing?: () => void;
  onAddDoor: (door: WpcDoorItem) => void;
  onUpdateDoor: (id: number, door: Partial<WpcDoorItem>) => void;
  onRemoveDoor: (id: number) => void;
  onDuplicateDoor: (door: WpcDoorItem) => void;
  formatCurrency: (value: number) => string;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
}

export const WpcDoorsSection: React.FC<WpcDoorsSectionProps> = ({
  wpcDoors,
  wpcPricing = DEFAULT_WPC_PRICING_CONFIG,
  pricingSyncStatus = 'synced',
  pricingErrorText = null,
  onRetryLoadPricing,
  onAddDoor,
  onUpdateDoor,
  onRemoveDoor,
  onDuplicateDoor,
  formatCurrency,
  onNavigatePrev,
  onNavigateNext,
}) => {
  const allPackages =
    Array.isArray(wpcPricing.packages) && wpcPricing.packages.length > 0
      ? wpcPricing.packages
      : DEFAULT_WPC_PRICING_CONFIG.packages;
  const activePackages = allPackages.filter((p) => p.isActive !== false);
  const selectablePackages = activePackages.length > 0 ? activePackages : allPackages;

  const addonMap = wpcPricing.addons || DEFAULT_WPC_PRICING_CONFIG.addons;
  const getAddonCfg = (key: keyof WpcAddons) => {
    const item = addonMap[key];
    const fallback = DEFAULT_WPC_PRICING_CONFIG.addons[key];
    return {
      name: item?.name || fallback.name,
      description: item?.description || fallback.description,
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : fallback.price,
    };
  };

  // Draft builder state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [sizeType, setSizeType] = useState<WpcSizeType>('80x215');
  const [customWidth, setCustomWidth] = useState<number>(85);
  const [customHeight, setCustomHeight] = useState<number>(215);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    () => selectablePackages[0]?.id || '9000'
  );
  const [addons, setAddons] = useState<WpcAddons>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [showValidation, setShowValidation] = useState(false);

  const effectivePackage =
    editingId !== null
      ? resolveWpcPackageMeta({ packageId: selectedPackageId }, wpcPricing)
      : selectablePackages.find((p) => p.id === selectedPackageId) || selectablePackages[0];

  // Reset form helper
  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSizeType('80x215');
    setCustomWidth(85);
    setCustomHeight(215);
    setSelectedPackageId(selectablePackages[0]?.id || '9000');
    setAddons({});
    setQuantity(1);
    setShowValidation(false);
  };

  // Switch size type handler: automatically handles "مقاس خاص"
  const handleSelectSize = (selected: WpcSizeType) => {
    setSizeType(selected);
    if (selected === 'custom') {
      // Auto-activate & lock customSize
      setAddons((prev) => ({
        ...prev,
        customSize: true,
      }));
    } else {
      // Returning to standard size: auto-deactivate customSize
      setAddons((prev) => {
        const next = { ...prev };
        delete next.customSize;
        return next;
      });
    }
  };

  // Switch package handler: when package includes accessories, clear optional accessories fee
  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const pkg = allPackages.find((p) => p.id === pkgId);
    if (pkg?.hasAccessoriesIncluded) {
      setAddons((prev) => {
        const next = { ...prev };
        delete next.accessories;
        return next;
      });
    }
  };

  // Toggle addon handler with mutual exclusions
  const handleToggleAddon = (key: keyof WpcAddons) => {
    if (key === 'customSize' && sizeType === 'custom') {
      // Locked when custom size is chosen
      return;
    }

    if (key === 'accessories' && effectivePackage.hasAccessoriesIncluded) {
      // Locked as included
      return;
    }

    setAddons((prev) => {
      const next = { ...prev };
      const willEnable = !prev[key];

      if (willEnable) {
        next[key] = true;

        // Mutual exclusion: Cladding Single vs Cladding Double
        if (key === 'claddingSingle') {
          delete next.claddingDouble;
        } else if (key === 'claddingDouble') {
          delete next.claddingSingle;
        }
      } else {
        delete next[key];
      }

      return next;
    });
  };

  // Start editing existing door
  const handleStartEdit = (door: WpcDoorItem) => {
    setEditingId(door.id);
    setTitle(door.title || '');
    setSizeType(door.sizeType);
    setCustomWidth(door.customWidth || 85);
    setCustomHeight(door.customHeight || 215);
    const resolvedPkg = resolveWpcPackageMeta(
      { packageId: door.packageId, basePackage: door.basePackage },
      wpcPricing
    );
    setSelectedPackageId(resolvedPkg.id);
    setAddons({ ...door.addons });
    setQuantity(door.quantity || 1);
    setShowValidation(false);

    // Scroll to the builder form
    const formElement = document.getElementById('wpc-door-builder');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Live calculation for the door currently being configured
  const currentCalculation = calculateWpcDoorPrice(
    {
      sizeType,
      customWidth,
      customHeight,
      packageId: effectivePackage.id,
      basePackage: effectivePackage.price,
      addons,
      quantity,
    },
    wpcPricing
  );

  // Submit / save door
  const handleSubmitDoor = (e: React.FormEvent) => {
    e.preventDefault();
    if (pricingSyncStatus === 'error') {
      return;
    }

    if (sizeType === 'custom' && (!customWidth || !customHeight || customWidth <= 0 || customHeight <= 0)) {
      setShowValidation(true);
      return;
    }

    const defaultTitle = editingId
      ? title.trim() || `باب WPC`
      : title.trim() || `باب WPC رقم ${wpcDoors.length + 1}`;

    const doorData: WpcDoorItem = {
      id: editingId || Date.now(),
      title: defaultTitle,
      sizeType,
      customWidth: sizeType === 'custom' ? customWidth : undefined,
      customHeight: sizeType === 'custom' ? customHeight : undefined,
      basePackage: effectivePackage.price,
      packageId: effectivePackage.id,
      packageName: effectivePackage.name,
      packageBadge: effectivePackage.badge,
      basePackagePrice: effectivePackage.price,
      addons: {
        ...addons,
        customSize: sizeType === 'custom' ? true : addons.customSize,
      },
      activeAddonsSnapshot: currentCalculation.activeAddonsList.map((a) => ({
        key: String(a.key),
        name: a.name,
        price: a.price,
      })),
      quantity: Math.max(1, quantity || 1),
      unitPrice: currentCalculation.unitPrice,
      totalPrice: currentCalculation.totalPrice,
    };

    if (editingId) {
      onUpdateDoor(editingId, doorData);
    } else {
      onAddDoor(doorData);
    }

    resetForm();
  };

  const accCfg = getAddonCfg('accessories');
  const engCfg = getAddonCfg('engraving');
  const prnCfg = getAddonCfg('printing');
  const csCfg = getAddonCfg('customSize');
  const csSingleCfg = getAddonCfg('claddingSingle');
  const csDoubleCfg = getAddonCfg('claddingDouble');

  // Section Grand Total (uses stored item snapshots)
  const totalWpcDoorsCount = wpcDoors.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalWpcPrice = wpcDoors.reduce(
    (sum, d) => sum + getWpcDoorDisplayData(d).totalPrice,
    0
  );

  return (
    <div className="w-full space-y-8" dir="rtl">
      {/* DB Error Alert */}
      {pricingSyncStatus === 'error' && (
        <div
          role="alert"
          className="bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm">تعذر تحميل أسعار أبواب WPC من قاعدة البيانات</h4>
              <p className="text-xs font-bold text-rose-700 mt-0.5">
                {pricingErrorText ||
                  'فشل الاتصال بقاعدة البيانات لتحميل أحدث أسعار أبواب WPC والإضافات. تم إيقاف إضافة بنود جديدة مؤقتاً لضمان عدم اعتماد أسعار قديمة.'}
              </p>
            </div>
          </div>
          {onRetryLoadPricing && (
            <button
              type="button"
              onClick={onRetryLoadPricing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer transition"
            >
              <RefreshCw size={14} />
              <span>إعادة المحاولة</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border-2 border-slate-200 border-r-8 border-r-[#FACC15] p-6 sm:p-8 shadow-sm overflow-hidden relative"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#0F172A] text-[#FACC15] px-3.5 py-1.5 rounded-xl text-xs font-black mb-3 shadow-sm">
              <DoorClosed size={16} />
              <span>الخطوة رقم 3 من 5: قسم أبواب WPC المتطورة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] tracking-tight flex items-center gap-2.5">
              <span>أبواب WPC الخشبية المعالجة ضد المياه والرطوبة</span>
            </h2>
            <p className="text-slate-500 font-bold text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
              أضف أبواب WPC الحديثة المقاومة للمياه وحشرات السوس والتآكل مع اختيار المقاس المناسب، نوع الباقة (شامل التركيب أو توريد فقط)، والإضافات الفنية كالحفر الديكوري والطباعة والتجليد.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0 flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 shadow-md">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="text-[11px] font-black text-slate-400">إجمالي أبواب WPC المضافة</div>
              <div className="text-xl sm:text-2xl font-black font-display text-[#0F172A]">
                {totalWpcDoorsCount} {totalWpcDoorsCount === 1 ? 'باب' : totalWpcDoorsCount === 2 ? 'بابين' : 'أبواب'}
              </div>
              <div className="text-xs font-black text-amber-600 font-mono" dir="ltr">
                {formatCurrency(totalWpcPrice)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Door Creator / Editor */}
      <div
        id="wpc-door-builder"
        className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-8 shadow-sm relative overflow-hidden space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#FACC15] flex items-center justify-center">
              {editingId ? <Edit3 size={20} /> : <Plus size={22} />}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-[#0F172A]">
                {editingId ? 'تعديل مواصفات باب WPC' : 'تجهيز وإضافة باب WPC جديد'}
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                حدد مقاس الباب، باقة التوريد أو التركيب، وأي إضافات خاصة ترغب بإدراجها
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitDoor} className="space-y-6">
          {/* A. Door Label / Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              تسمية الباب (اختياري - لتمييز المكان بالعرض)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: باب غرفة الماستر / باب الحمام الرئيسي / باب المطبخ"
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition font-bold text-sm text-right text-[#0F172A] placeholder:text-slate-400"
            />
          </div>

          {/* B. Size Selection (Standard or Custom) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler size={16} className="text-[#0F172A]" />
                <span>1. اختيار مقاس الباب:</span>
              </label>
              {sizeType === 'custom' && (
                <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                  يُضاف تلقائياً {csCfg.name} (+{csCfg.price.toLocaleString('en-US')} ج.م)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {WPC_STANDARD_SIZES.map((size) => {
                const isSelected = sizeType === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => handleSelectSize(size.id)}
                    className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                      isSelected
                        ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-md'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#FACC15] text-[#0F172A] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-base font-black font-mono" dir="ltr">
                      {size.label}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-[#FACC15]' : 'text-slate-400'}`}>
                      مقاس قياسي ستاندرد
                    </span>
                  </button>
                );
              })}

              {/* Custom Size Button */}
              <button
                type="button"
                onClick={() => handleSelectSize('custom')}
                className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                  sizeType === 'custom'
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-md'
                    : 'border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900'
                }`}
              >
                {sizeType === 'custom' && (
                  <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#FACC15] text-[#0F172A] flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span className="text-base font-black flex items-center gap-1">
                  <Maximize2 size={16} />
                  <span>مقاس آخر</span>
                </span>
                <span
                  className={`text-[10px] font-black ${
                    sizeType === 'custom' ? 'text-[#FACC15]' : 'text-amber-700'
                  }`}
                >
                  أبعاد مخصصة (+{csCfg.price.toLocaleString('en-US')} ج.م)
                </span>
              </button>
            </div>

            {/* Custom Dimensions Inputs (Visible ONLY when "مقاس آخر" is selected) */}
            <AnimatePresence>
              {sizeType === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 overflow-hidden space-y-3"
                >
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                    <Info size={16} className="text-amber-600 shrink-0" />
                    <span>أدخل أبعاد الفتحة بالمقاس الخاص المطلوب بالسنتيمتر (إلزامية):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        عرض الباب (سم) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="30"
                          max="250"
                          value={customWidth || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCustomWidth(isNaN(val) ? 0 : val);
                          }}
                          placeholder="مثال: 85"
                          className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] outline-none font-bold text-center text-[#0F172A] text-base"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                          سم
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        ارتفاع الباب (سم) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="50"
                          max="320"
                          value={customHeight || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCustomHeight(isNaN(val) ? 0 : val);
                          }}
                          placeholder="مثال: 220"
                          className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] outline-none font-bold text-center text-[#0F172A] text-base"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                          سم
                        </span>
                      </div>
                    </div>
                  </div>

                  {showValidation && (!customWidth || !customHeight || customWidth <= 0 || customHeight <= 0) && (
                    <p className="text-xs font-black text-red-600">
                      يرجى إدخال قيم صحيحة لكلٍ من العرض والارتفاع بالسنتيمتر.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* C. Base Packages / Types Selection (Dynamic from Database) */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#0F172A]" />
              <span>2. اختيار الباقة أو نوع الباب الأساسي (إلزامي):</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectablePackages.map((pkg) => {
                const isSelected = effectivePackage.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg.id)}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#0F172A] bg-slate-900 text-white shadow-lg'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black font-display tracking-tight">
                              {pkg.name}
                            </span>
                            {pkg.badge && (
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  pkg.hasAccessoriesIncluded
                                    ? 'bg-[#FACC15] text-[#0F172A]'
                                    : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs mt-1 font-bold ${
                              isSelected ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {pkg.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-left font-black font-mono text-xl shrink-0 ${
                          isSelected ? 'text-[#FACC15]' : 'text-[#0F172A]'
                        }`}
                        dir="ltr"
                      >
                        {formatCurrency(pkg.price)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* D. Addons Section with Mutual Exclusions (Dynamic Prices) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={16} className="text-[#0F172A]" />
                <span>3. الإضافات والمواصفات الفنية للباب:</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                (يمكن اختيار أكثر من إضافة متوافقة)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. إكسسوارات */}
              <div
                onClick={() => handleToggleAddon('accessories')}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  effectivePackage.hasAccessoriesIncluded
                    ? 'border-emerald-300 bg-emerald-50/60 opacity-90 cursor-not-allowed'
                    : addons.accessories
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm cursor-pointer'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      effectivePackage.hasAccessoriesIncluded
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : addons.accessories
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {(effectivePackage.hasAccessoriesIncluded || addons.accessories) && (
                      <Check size={12} strokeWidth={3} />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-black">{accCfg.name}</div>
                    <div
                      className={`text-[10px] ${
                        effectivePackage.hasAccessoriesIncluded
                          ? 'text-emerald-700 font-extrabold'
                          : addons.accessories
                          ? 'text-slate-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {effectivePackage.hasAccessoriesIncluded
                        ? `مشمولة مجاناً في ${effectivePackage.name}`
                        : accCfg.description}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-xs font-mono font-black shrink-0 ${
                    effectivePackage.hasAccessoriesIncluded
                      ? 'text-emerald-700'
                      : addons.accessories
                      ? 'text-[#FACC15]'
                      : 'text-slate-700'
                  }`}
                >
                  {effectivePackage.hasAccessoriesIncluded
                    ? 'مشمول'
                    : `+${accCfg.price.toLocaleString('en-US')} ج.م`}
                </div>
              </div>

              {/* 2. حفر */}
              <div
                onClick={() => handleToggleAddon('engraving')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  addons.engraving
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      addons.engraving
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {addons.engraving && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-black">{engCfg.name}</div>
                    <div className={`text-[10px] ${addons.engraving ? 'text-slate-300' : 'text-slate-400'}`}>
                      {engCfg.description}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-mono font-black shrink-0 ${addons.engraving ? 'text-[#FACC15]' : 'text-slate-700'}`}>
                  +{engCfg.price.toLocaleString('en-US')} ج.م
                </div>
              </div>

              {/* 3. طباعة */}
              <div
                onClick={() => handleToggleAddon('printing')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  addons.printing
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      addons.printing
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {addons.printing && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-black">{prnCfg.name}</div>
                    <div className={`text-[10px] ${addons.printing ? 'text-slate-300' : 'text-slate-400'}`}>
                      {prnCfg.description}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-mono font-black shrink-0 ${addons.printing ? 'text-[#FACC15]' : 'text-slate-700'}`}>
                  +{prnCfg.price.toLocaleString('en-US')} ج.م
                </div>
              </div>

              {/* 4. مقاس خاص */}
              <div
                onClick={() => handleToggleAddon('customSize')}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  sizeType === 'custom'
                    ? 'border-amber-400 bg-amber-500/10 cursor-not-allowed text-amber-950 font-black'
                    : addons.customSize
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm cursor-pointer'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      sizeType === 'custom'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : addons.customSize
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {(sizeType === 'custom' || addons.customSize) && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-black">{csCfg.name}</div>
                    <div
                      className={`text-[10px] ${
                        sizeType === 'custom'
                          ? 'text-amber-800 font-extrabold'
                          : addons.customSize
                          ? 'text-slate-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {sizeType === 'custom' ? 'مفعّل إلزامي للمقاس المخصص' : csCfg.description}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-xs font-mono font-black shrink-0 ${
                    sizeType === 'custom' ? 'text-amber-800' : addons.customSize ? 'text-[#FACC15]' : 'text-slate-700'
                  }`}
                >
                  +{csCfg.price.toLocaleString('en-US')} ج.م
                </div>
              </div>

              {/* 5. تجليدة سنجل */}
              <div
                onClick={() => handleToggleAddon('claddingSingle')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  addons.claddingSingle
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm ring-2 ring-[#FACC15]'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      addons.claddingSingle
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {addons.claddingSingle && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-black">{csSingleCfg.name}</div>
                    <div className={`text-[10px] ${addons.claddingSingle ? 'text-slate-300' : 'text-slate-400'}`}>
                      {csSingleCfg.description}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-mono font-black shrink-0 ${addons.claddingSingle ? 'text-[#FACC15]' : 'text-slate-700'}`}>
                  +{csSingleCfg.price.toLocaleString('en-US')} ج.م
                </div>
              </div>

              {/* 6. تجليدة دبل داخلي وخارجي */}
              <div
                onClick={() => handleToggleAddon('claddingDouble')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  addons.claddingDouble
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm ring-2 ring-[#FACC15]'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      addons.claddingDouble
                        ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {addons.claddingDouble && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-black">{csDoubleCfg.name}</div>
                    <div className={`text-[10px] ${addons.claddingDouble ? 'text-slate-300' : 'text-slate-400'}`}>
                      {csDoubleCfg.description}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-mono font-black shrink-0 ${addons.claddingDouble ? 'text-[#FACC15]' : 'text-slate-700'}`}>
                  +{csDoubleCfg.price.toLocaleString('en-US')} ج.م
                </div>
              </div>
            </div>

            {(addons.claddingSingle || addons.claddingDouble) && (
              <p className="text-[11px] font-bold text-slate-500">
                * ملاحظة: خيارا التجليدة السنجل والدبل متعارضان، وتم تفعيل الخيار المختار منهما فقط.
              </p>
            )}
          </div>

          {/* E. Quantity & Live Summary Calculation Box */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-black text-slate-700 shrink-0">
                الكمية المطلوبة:
              </label>
              <div className="flex items-center bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-black text-lg transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) || val < 1 ? 1 : val);
                  }}
                  className="w-14 text-center font-black font-mono text-base text-[#0F172A] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-black text-lg transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Live Pricing Breakdown */}
            <div className="flex items-center gap-6 w-full md:w-auto justify-end">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-black block">سعر الباب الواحد</span>
                <span className="text-base font-black font-mono text-slate-800" dir="ltr">
                  {formatCurrency(currentCalculation.unitPrice)}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-slate-300" />

              <div className="text-right">
                <span className="text-[10px] text-amber-600 font-black block">إجمالي هذا البند</span>
                <span className="text-xl sm:text-2xl font-black font-display text-[#0F172A]" dir="ltr">
                  {formatCurrency(currentCalculation.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* F. Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pricingSyncStatus === 'error'}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#0F172A] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-[#FACC15] font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition cursor-pointer"
            >
              {editingId ? <Check size={20} /> : <Plus size={20} />}
              <span>{editingId ? 'حفظ تعديلات الباب' : 'إضافة الباب إلى عرض السعر'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. List of Added WPC Doors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#0F172A] text-[#FACC15] text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
              {wpcDoors.length} {wpcDoors.length === 1 ? 'باب' : wpcDoors.length === 2 ? 'بابين' : 'أبواب'}
            </span>
            <h3 className="font-display font-black text-lg text-[#0F172A]">
              قائمة أبواب WPC المدرجة بالعرض
            </h3>
          </div>
          {wpcDoors.length > 0 && (
            <span className="text-xs font-bold text-slate-500">
              إجمالي القسم: <strong className="text-[#0F172A] font-mono">{formatCurrency(totalWpcPrice)}</strong>
            </span>
          )}
        </div>

        {wpcDoors.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <DoorClosed size={32} />
            </div>
            <h4 className="text-base font-black text-slate-700">لم تقم بإضافة أي أبواب WPC بعد</h4>
            <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
              أبواب WPC اختيارية؛ يمكنك إضافة أبواب بالمقاسات والباقات التي تناسب مشروعك عبر النموذج أعلاه، أو المتابعة مباشرةً إلى معاينة عرض السعر.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {wpcDoors.map((door, index) => {
                const display = getWpcDoorDisplayData(door);

                return (
                  <motion.div
                    key={door.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 font-mono font-black text-sm">
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-black text-base text-[#0F172A]">
                            {door.title}
                          </h4>
                          <span className="bg-slate-100 text-slate-700 font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border border-slate-200" dir="ltr">
                            {formatWpcDoorSize(door)}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              display.isFullPackage
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {display.packageName}
                          </span>
                        </div>

                        {/* Addons Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {display.activeAddonsList.length > 0 ? (
                            display.activeAddonsList.map((addon) => (
                              <span
                                key={addon.key}
                                className="bg-slate-50 text-slate-600 border border-slate-200 text-[10.5px] font-bold px-2 py-0.5 rounded-md"
                              >
                                + {addon.name} ({addon.price} ج.م)
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10.5px] font-medium">بدون إضافات</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-black block">
                          {formatCurrency(display.unitPrice)} × {door.quantity}
                        </span>
                        <span className="text-lg sm:text-xl font-black font-display text-[#0F172A]" dir="ltr">
                          {formatCurrency(display.totalPrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDuplicateDoor(door)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          title="نسخ الباب"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(door)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                          title="تعديل الباب"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveDoor(door.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="حذف الباب"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 4. Bottom Navigation Controls (Previous / Next) */}
      <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onNavigatePrev}
          className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
        >
          <ArrowRight size={18} />
          <span>العودة للرئيسية</span>
        </button>

        <button
          type="button"
          onClick={onNavigateNext}
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#0F172A] hover:bg-black text-[#FACC15] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer shadow-lg shadow-slate-900/10"
        >
          <span>المتابعة إلى معاينة وطباعة عرض سعر WPC (PDF)</span>
          <ArrowLeft size={18} />
        </button>
      </div>
    </div>
  );
};
