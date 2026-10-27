import React, { useState } from 'react';
import { 
  Trash2, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  Check, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Sparkles,
  Layers,
  Ruler
} from 'lucide-react';
import { CalculatedItem, Profile, Addon } from '../../types';
import { GLASS_TYPES, OPENING_TYPES } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicPreview } from '../DynamicPreview';

interface MobileItemCardProps {
  item: CalculatedItem;
  index: number;
  updateItem: (id: number, field: string, value: any) => void;
  removeItem: (id: number) => void;
  toggleAddon: (itemId: number, addonId: string) => void;
  formatCurrency: (value: number) => string;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  onDuplicateItem?: (item: CalculatedItem) => void;
}

export const MobileItemCard: React.FC<MobileItemCardProps> = ({
  item,
  index,
  updateItem,
  removeItem,
  toggleAddon,
  formatCurrency,
  profiles,
  addons,
  onDuplicateItem
}) => {
  const itemNumber = String(index + 1).padStart(2, '0');
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const activeAddonsCount = item.addons.filter(key => addons[key]).length;

  const getAddonStatus = (key: string) => {
    const isDoubleGlass = key === 'doubleGlass';
    const isColorGlass = key === 'colorGlass';
    const isSingleColorGlass = key === 'singleColorGlass';
    const isPleated = key === 'pleated';
    const isBlackout = key === 'blackout';
    const isSkewWindow1 = key === 'skewWindow1';
    const isSkewWindow2 = key === 'skewWindow2';
    const isSkewBalcony1 = key === 'skewBalcony1';
    const isSkewBalcony2 = key === 'skewBalcony2';
    const isDoubleHandle = key === 'doubleHandle';

    const isBalconyAddon = key === 'skewBalcony1' || key === 'skewBalcony2';
    const isWindowAddon = key === 'skewWindow1' || key === 'skewWindow2';
    const isSkewAddon = isBalconyAddon || isWindowAddon;
    const isDoorForbiddenAddon = key === 'skewWindow1' || key === 'skewWindow2' || key === 'skewBalcony1' || key === 'skewBalcony2' || key === 'doubleHandle' || key === 'pombe';

    const isHinged = item.opening === 'مفصلي';
    const isSingleSash = isHinged && (item.hingePanes || 'ضلفة') === 'ضلفة';
    const isDoubleSash = isHinged && item.hingePanes === 'ضلفتين';

    const isForbiddenForSingle = isSingleSash && (isSkewWindow2 || isSkewBalcony2 || isDoubleHandle);
    const isForbiddenForDouble = isDoubleSash && (isSkewWindow1 || isSkewBalcony1);

    const isDisabled = 
      (item.innerType === 'panel' && (isDoubleGlass || isColorGlass || isSingleColorGlass)) ||
      (isDoubleGlass && (item.addons.includes('colorGlass') || item.addons.includes('singleColorGlass'))) ||
      (isColorGlass && (item.addons.includes('doubleGlass') || item.addons.includes('singleColorGlass'))) ||
      (isSingleColorGlass && (item.addons.includes('doubleGlass') || item.addons.includes('colorGlass'))) ||
      (isPleated && item.addons.includes('blackout')) ||
      (isBlackout && item.addons.includes('pleated')) ||
      (isSkewWindow1 && item.addons.includes('skewWindow2')) ||
      (isSkewWindow2 && item.addons.includes('skewWindow1')) ||
      (isSkewBalcony1 && item.addons.includes('skewBalcony2')) ||
      (isSkewBalcony2 && item.addons.includes('skewBalcony1')) ||
      (isBalconyAddon && item.itemType !== 'balcony') ||
      (isWindowAddon && item.itemType !== 'window') ||
      (isDoorForbiddenAddon && item.itemType === 'door') ||
      (isSkewAddon && item.opening !== 'مفصلي') ||
      isForbiddenForSingle ||
      isForbiddenForDouble;

    let conflictTag = '';
    if (item.innerType === 'panel' && (isDoubleGlass || isColorGlass || isSingleColorGlass)) {
      conflictTag = ' (غير متاح للبند بنل بالكامل)';
    } else if (isDoubleGlass && (item.addons.includes('colorGlass') || item.addons.includes('singleColorGlass'))) {
      conflictTag = ' (تعارض زجاج)';
    } else if (isColorGlass && (item.addons.includes('doubleGlass') || item.addons.includes('singleColorGlass'))) {
      conflictTag = ' (تعارض زجاج)';
    } else if (isPleated && item.addons.includes('blackout')) {
      conflictTag = ' (بلاك أوت محدد)';
    } else if (isBlackout && item.addons.includes('pleated')) {
      conflictTag = ' (سلك بليسيه محدد)';
    } else if (isSkewAddon && item.opening !== 'مفصلي') {
      conflictTag = ' (مفصلي فقط)';
    } else if (isBalconyAddon && item.itemType !== 'balcony') {
      conflictTag = ' (بلكونات فقط)';
    } else if (isWindowAddon && item.itemType !== 'window') {
      conflictTag = ' (شبابيك فقط)';
    }

    return { isDisabled, conflictTag };
  };

  const handleItemTypeSelect = (type: 'window' | 'door' | 'balcony') => {
    updateItem(item.id, 'itemType', type);
    if (item.title.startsWith('باب مصفح')) {
      updateItem(item.id, 'title', `بند رقم ${itemNumber}`);
    }
  };

  const rawArea = ((item.width || 0) * (item.height || 0)) / 10000;
  const isMinAreaApplied = rawArea > 0 && rawArea < 1.0 && item.itemType !== 'armored_door';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden text-right"
      dir="rtl"
    >
      {/* Top Header Card Bar */}
      <div className="bg-[#0F172A] text-white p-3 flex items-center justify-between gap-2 border-b-2 border-[#FACC15]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="bg-[#FACC15] text-[#0F172A] text-xs font-black px-2 py-0.5 rounded-lg shrink-0">
            بند {itemNumber}
          </span>
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(item.id, 'title', e.target.value)}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-white font-extrabold text-xs p-1.5 rounded-xl outline-none focus:border-[#FACC15] w-full min-w-0"
            placeholder="اسم البند (مثال: شباك غرفة المعيشة)"
          />
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1.5 rounded-xl transition text-xs font-bold ${
              showPreview 
                ? 'bg-amber-400 text-[#0F172A]' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="معاينة الشباك"
          >
            <Eye size={15} />
          </button>
          
          {onDuplicateItem && (
            <button
              type="button"
              onClick={() => onDuplicateItem(item)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="نسخ هذا البند"
            >
              <Copy size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-xl transition border border-red-500/30"
            title="حذف البند"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Dynamic Visual Preview Collapsible */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 p-4 border-b border-slate-800 overflow-hidden"
          >
            <div className="flex items-center justify-between text-[#FACC15] mb-2 text-xs font-black">
              <span>معاينة الرسومية للفتحة</span>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-slate-400 text-[10px] underline"
              >
                إغلاق المعاينة
              </button>
            </div>
            <div className="max-w-[200px] mx-auto">
              <DynamicPreview item={item} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Content Body */}
      <div className="p-3.5 space-y-3.5">
        {/* Item Type Segmented Chips */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            نوع فتحة المعاينة
          </p>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            {[
              { id: 'window', label: 'شباك 🪟' },
              { id: 'door', label: 'باب 🚪' },
              { id: 'balcony', label: 'بلكونة 🌅' },
            ].map((typeObj) => {
              const isSelected = item.itemType === typeObj.id;
              return (
                <button
                  key={typeObj.id}
                  type="button"
                  onClick={() => handleItemTypeSelect(typeObj.id as any)}
                  className={`relative py-2.5 px-2 text-center rounded-xl text-xs font-black transition-all duration-200 ease-out cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-[#0F172A] text-[#FACC15] shadow-md shadow-slate-900/20 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{typeObj.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimension Inputs & Area Display */}
        {item.itemType !== 'armored_door' ? (
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span className="flex items-center gap-1.5">
                <Ruler size={14} className="text-[#0F172A]" />
                <span>المقاسات (سم)</span>
              </span>
              <span className="bg-[#0F172A] text-[#FACC15] px-2 py-0.5 rounded-md font-mono text-[11px]">
                المساحة: {item.area.toFixed(2)} م²
                {isMinAreaApplied && ' (حد أدنى 1م²)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 mb-1">
                  العرض (سم)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={item.width || ''}
                  onChange={(e) => updateItem(item.id, 'width', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 bg-white border-2 border-slate-200 focus:border-[#0F172A] focus:ring-2 focus:ring-[#FACC15] rounded-xl outline-none text-center font-black font-mono text-sm text-[#0F172A]"
                />
              </div>

              <div className="text-center font-black text-slate-400 pt-4">
                ✕
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 mb-1">
                  الارتفاع (سم)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={item.height || ''}
                  onChange={(e) => updateItem(item.id, 'height', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 bg-white border-2 border-slate-200 focus:border-[#0F172A] focus:ring-2 focus:ring-[#FACC15] rounded-xl outline-none text-center font-black font-mono text-sm text-[#0F172A]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
            <label className="block text-xs font-black text-amber-900 mb-1">
              السعر المقطوع للباب المصفح (ج.م)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={item.fixedPrice || 14500}
              onChange={(e) => updateItem(item.id, 'fixedPrice', Number(e.target.value))}
              className="w-full p-2.5 bg-white border-2 border-amber-300 rounded-xl font-mono font-black text-center text-amber-900 text-sm"
            />
          </div>
        )}

        {/* Profile Select */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            نوع قطاع الـ UPVC
          </label>
          <div className="relative">
            <select
              value={item.profile}
              onChange={(e) => updateItem(item.id, 'profile', e.target.value)}
              className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-[#0F172A] focus:border-[#0F172A] focus:ring-2 focus:ring-[#FACC15] outline-none appearance-none cursor-pointer pr-3 pl-8"
            >
              {(Object.values(profiles) as Profile[]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ({formatCurrency(p.price)} / {p.isFlat ? p.unit || 'للقطعة' : 'م²'})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Opening System & Glass Options Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Opening System */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              نظام الفتح
            </label>
            <div className="relative">
              <select
                value={item.opening}
                onChange={(e) => updateItem(item.id, 'opening', e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-[#0F172A] focus:border-[#0F172A] outline-none appearance-none pr-2.5 pl-6"
              >
                {OPENING_TYPES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Glass Type */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              نوع الزجاج
            </label>
            <div className="relative">
              <select
                value={item.glassType}
                onChange={(e) => updateItem(item.id, 'glassType', e.target.value)}
                disabled={item.innerType === 'panel'}
                className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-[#0F172A] focus:border-[#0F172A] outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400 pr-2.5 pl-6"
              >
                {GLASS_TYPES.map((gt) => (
                  <option key={gt} value={gt}>
                    {gt}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Hinged Panes option if hinged */}
        {item.opening === 'مفصلي' && (
          <div className="bg-slate-100/80 p-2 rounded-xl flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700">عدد الأضلاف:</span>
            <div className="flex gap-1">
              {['ضلفة', 'ضلفتين'].map((panes) => (
                <button
                  key={panes}
                  type="button"
                  onClick={() => updateItem(item.id, 'hingePanes', panes)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                    (item.hingePanes || 'ضلفة') === panes
                      ? 'bg-[#0F172A] text-[#FACC15]'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {panes}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inner Type Selector Pills (Glass vs Panel) */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            نوع التعبئة الداخلي
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'glass', label: 'زجاج عادي' },
              { id: 'panel', label: 'بنل كامل' },
              { id: 'panel_glass', label: 'بنل + زجاج' },
            ].map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => updateItem(item.id, 'innerType', it.id)}
                className={`py-1.5 px-1 text-center rounded-lg text-xs font-black transition ${
                  (item.innerType || 'glass') === it.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <span className="text-xs font-black text-slate-700">الكمية المطلوب تصنيعها:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateItem(item.id, 'quantity', Math.max(1, (item.quantity || 1) - 1))}
              className="w-8 h-8 bg-slate-200 hover:bg-slate-300 text-[#0F172A] font-black rounded-lg text-sm flex items-center justify-center active:scale-95"
            >
              -
            </button>
            <span className="font-mono font-black text-base px-2 text-[#0F172A]">
              {item.quantity || 1}
            </span>
            <button
              type="button"
              onClick={() => updateItem(item.id, 'quantity', (item.quantity || 1) + 1)}
              className="w-8 h-8 bg-[#0F172A] text-[#FACC15] font-black rounded-lg text-sm flex items-center justify-center active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Addons Collapsible Trigger */}
        <div className="border-t border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => setIsAddonsOpen(!isAddonsOpen)}
            className="w-full p-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center justify-between text-xs font-black text-[#0F172A] transition"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-[#0F172A]" />
              <span>الخيارات والإضافات الخاصة</span>
              {activeAddonsCount > 0 && (
                <span className="bg-[#0F172A] text-[#FACC15] text-[10px] font-black px-2 py-0.2 rounded-md">
                  محدد ({activeAddonsCount})
                </span>
              )}
            </div>
            {isAddonsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Addons Grid Drawer */}
          <AnimatePresence>
            {isAddonsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-1.5 overflow-hidden"
              >
                {(Object.values(addons) as Addon[]).map((addon) => {
                  const isChecked = item.addons.includes(addon.id);
                  const { isDisabled, conflictTag } = getAddonStatus(addon.id);

                  return (
                    <button
                      key={addon.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleAddon(item.id, addon.id)}
                      className={`w-full p-2.5 rounded-xl border text-right text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-[#0F172A] border-[#0F172A] text-white font-extrabold shadow-sm'
                          : isDisabled
                          ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked 
                            ? 'bg-[#FACC15] border-[#FACC15] text-[#0F172A]' 
                            : 'border-slate-300'
                        }`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="truncate">
                          {addon.name}
                          {isDisabled && <span className="text-[10px] text-red-500 font-normal">{conflictTag}</span>}
                        </span>
                      </div>

                      <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded font-bold ${
                        isChecked ? 'bg-slate-800 text-[#FACC15]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {addon.id === 'panda'
                          ? 'متر × 1.5'
                          : addon.price > 0
                          ? `+${addon.price} ج.م / ${addon.isFlat ? addon.unit || 'للقطعة' : 'م²'}`
                          : 'مجاناً'}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Item Subtotal Footer */}
        <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between border-t-2 border-[#FACC15]">
          <div>
            <p className="text-[10px] text-slate-400 font-bold">إجمالي تكلفة البند الحالي:</p>
            <p className="text-base font-black font-mono text-[#FACC15]">
              {formatCurrency(item.itemTotal)}
            </p>
          </div>
          <div className="text-[10px] text-slate-300 text-left font-mono">
            <span>
              القطاع:{' '}
              {item.flatProfilePrice && item.flatProfilePrice > 0
                ? `${formatCurrency(item.flatProfilePrice)} (${profiles[item.profile]?.unit || 'للقطعة'})`
                : formatCurrency(item.profilePrice)}
            </span>
            {item.addonsPrice > 0 && <span className="block text-emerald-400">+ إضافات: {formatCurrency(item.addonsPrice)} / م²</span>}
            {item.flatAddonsPrice && item.flatAddonsPrice > 0 ? (
              <span className="block text-emerald-400">+ مقطوع: {formatCurrency(item.flatAddonsPrice)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
