import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Sliders, Check } from 'lucide-react';
import { CalculatedItem, Profile, Addon } from '../types';
import { GLASS_TYPES, OPENING_TYPES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicPreview } from './DynamicPreview';

interface Props {
  item: CalculatedItem;
  index: number;
  updateItem: (id: number, field: string, value: any) => void;
  removeItem: (id: number) => void;
  toggleAddon: (itemId: number, addonId: string) => void;
  formatCurrency: (value: number) => string;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
}

const ItemCard: React.FC<Props> = ({ item, index, updateItem, removeItem, toggleAddon, formatCurrency, profiles, addons }) => {
  const itemNumber = String(index + 1).padStart(2, '0');
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);

  const activeAddons = item.addons.filter(key => addons[key]);

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

    // Check hinged single/double sash conflicts
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
      conflictTag = ' (تعارض مع خيار زجاج آخر)';
    } else if (isColorGlass && (item.addons.includes('doubleGlass') || item.addons.includes('singleColorGlass'))) {
      conflictTag = ' (تعارض مع خيار زجاج آخر)';
    } else if (isSingleColorGlass && (item.addons.includes('doubleGlass') || item.addons.includes('colorGlass'))) {
      conflictTag = ' (تعارض مع خيار زجاج آخر)';
    } else if (isPleated && item.addons.includes('blackout')) {
      conflictTag = ' (تم اختيار بلاك أوت)';
    } else if (isBlackout && item.addons.includes('pleated')) {
      conflictTag = ' (تم اختيار سلك بليسيه)';
    } else if (isSkewAddon && item.opening !== 'مفصلي') {
      conflictTag = ' (متاح لنظام الفتح المفصلي فقط)';
    } else if (isForbiddenForSingle) {
      if (isDoubleHandle) {
        conflictTag = ' (يحتاج لنظام مفصلي ضلفتين)';
      } else {
        conflictTag = ' (متاح لنظام المفصلي ضفتين)';
      }
    } else if (isForbiddenForDouble) {
      conflictTag = ' (متاح لنظام المفصلي ضلفة واحدة)';
    } else if (isSkewWindow1 && item.addons.includes('skewWindow2')) {
      conflictTag = ' (تم اختيار ضلفتين)';
    } else if (isSkewWindow2 && item.addons.includes('skewWindow1')) {
      conflictTag = ' (تم اختيار ضلفة واحدة)';
    } else if (isSkewBalcony1 && item.addons.includes('skewBalcony2')) {
      conflictTag = ' (تم اختيار ضلفتين)';
    } else if (isSkewBalcony2 && item.addons.includes('skewBalcony1')) {
      conflictTag = ' (تم اختيار ضلفة واحدة)';
    } else if (isBalconyAddon && item.itemType !== 'balcony') {
      conflictTag = ' (متاح للبلكونات فقط)';
    } else if (isWindowAddon && item.itemType !== 'window') {
      conflictTag = ' (متاح للشبابيك فقط)';
    } else if (isDoorForbiddenAddon && item.itemType === 'door') {
      conflictTag = ' (غير متاح للأبواب)';
    }

    return { isDisabled, conflictTag };
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm hover:border-[#FACC15] border-r-8 border-r-[#FACC15] transition-all duration-300 print:shadow-none print:border-b print:rounded-none print:mb-8"
    >
      <div className="bg-[#F8F9FA] px-6 py-4 border-b-2 border-slate-200 flex justify-between items-center print:bg-white print:border-slate-800">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 bg-slate-200/60 rounded-xl flex items-center justify-center font-black text-lg text-slate-500 print:hidden">
            {itemNumber}
          </div>
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(item.id, 'title', e.target.value)}
            className="bg-transparent font-display font-black text-lg sm:text-xl text-[#0F172A] focus:outline-none focus:border-b-2 focus:border-[#0F172A] w-3/4 sm:w-1/2 print:border-none print:w-auto"
            placeholder="اسم البند (مثال: شباك المطبخ)"
          />
        </div>
        <button 
          onClick={() => removeItem(item.id)}
          className="text-red-500 hover:text-red-700 p-2.5 rounded-full hover:bg-red-50 transition print:hidden cursor-pointer"
          title="حذف البند"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* المقاسات */}
        <div className="space-y-4">
          <h3 className="font-black text-[#0F172A] border-b-2 border-slate-100 pb-2 text-sm uppercase tracking-wider">المقاسات والكمية</h3>
          <div className="space-y-3">
            {/* Display side by side on mobile/tablet, vertically stacked on desktop */}
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div>
                <label className="block text-[10.5px] sm:text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">العرض (سم)</label>
                <input
                  type="number"
                  min="0"
                  value={item.width || ''}
                  onChange={(e) => updateItem(item.id, 'width', e.target.value ? Number(e.target.value) : 0)}
                  className="w-full p-2 sm:p-2.5 text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:border-none print:p-0 print:font-bold text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-[10.5px] sm:text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">الارتفاع (سم)</label>
                <input
                  type="number"
                  min="0"
                  value={item.height || ''}
                  onChange={(e) => updateItem(item.id, 'height', e.target.value ? Number(e.target.value) : 0)}
                  className="w-full p-2 sm:p-2.5 text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:border-none print:p-0 print:font-bold text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-[10.5px] sm:text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">العدد</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity || 1}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value ? Math.max(1, Number(e.target.value)) : 1)}
                  className="w-full p-2 sm:p-2.5 text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:border-none print:p-0 print:font-bold text-center font-bold text-[#0F172A]"
                />
              </div>
            </div>
            
            <div className="bg-[#F8F9FA] p-3 rounded-xl border border-slate-200/60 print:bg-transparent print:p-0 print:border-none space-y-1">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 font-bold">المساحة للقطعة:</span>
                <span className="text-slate-900 font-black">{item.area.toFixed(2)} م²</span>
              </div>
              {item.quantity && item.quantity > 1 ? (
                <div className="flex justify-between items-center border-t border-slate-200/50 pt-1.5 mt-1 text-xs sm:text-sm">
                  <span className="text-slate-550 text-slate-500 font-bold">إجمالي المساحة:</span>
                  <span className="text-[#0F172A] font-black">{(item.area * item.quantity).toFixed(2)} م²</span>
                </div>
              ) : null}
              {((item.width * item.height) / 10000) < 1.0 && (item.width > 0 && item.height > 0) && (
                <div className="text-[10px] text-amber-600 font-extrabold text-right pt-0.5">
                  * تم تطبيق الحد الأدنى (1.0 م²)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* المواصفات الأساسية */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-black text-[#0F172A] border-b-2 border-slate-100 pb-2 text-sm uppercase tracking-wider">المواصفات</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:gap-x-6 sm:gap-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#64748B] mb-1.5 uppercase tracking-wider">نوع البند</label>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl print:hidden">
                <button
                  type="button"
                  onClick={() => updateItem(item.id, 'itemType', 'window')}
                  className={`flex-1 py-1.5 px-1.5 text-center rounded-lg font-black text-[10.5px] sm:text-xs transition-all cursor-pointer ${item.itemType === 'window' ? 'bg-[#0F172A] text-white shadow-sm' : 'hover:text-[#0F172A] text-slate-500 hover:bg-slate-50'}`}
                >
                  شباك
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(item.id, 'itemType', 'balcony')}
                  className={`flex-1 py-1.5 px-1.5 text-center rounded-lg font-black text-[10.5px] sm:text-xs transition-all cursor-pointer ${item.itemType === 'balcony' ? 'bg-[#0F172A] text-white shadow-sm' : 'hover:text-[#0F172A] text-slate-500 hover:bg-slate-50'}`}
                >
                  بلكونة
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(item.id, 'itemType', 'door')}
                  className={`flex-1 py-1.5 px-2 text-center rounded-lg font-black text-xs transition-all cursor-pointer ${item.itemType === 'door' ? 'bg-[#0F172A] text-white shadow-sm' : 'hover:text-[#0F172A] text-slate-500 hover:bg-slate-50'}`}
                >
                  باب
                </button>
              </div>
              <div className="hidden print:block font-bold text-slate-900">
                {item.itemType === 'door' ? 'باب' : item.itemType === 'balcony' ? 'بلكونة' : 'شباك'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">نوع القطاع (UPVC)</label>
              <select
                value={item.profile}
                onChange={(e) => updateItem(item.id, 'profile', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:appearance-none print:border-none print:p-0 print:font-bold cursor-pointer font-bold text-[#0F172A] text-xs sm:text-sm"
              >
                {(Object.entries(profiles) as [string, Profile][]).map(([key, profile]) => (
                  <option key={key} value={key}>{profile.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">نوع الفتح</label>
              <select
                value={item.opening}
                onChange={(e) => updateItem(item.id, 'opening', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:appearance-none print:border-none print:p-0 print:font-bold cursor-pointer font-bold text-[#0F172A] text-xs sm:text-sm"
              >
                {OPENING_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">الجزء الداخلي</label>
              <select
                value={item.innerType || 'glass'}
                onChange={(e) => updateItem(item.id, 'innerType', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:appearance-none print:border-none print:p-0 print:font-bold cursor-pointer font-bold text-[#0F172A] text-xs sm:text-sm"
              >
                <option value="glass">زجاج</option>
                <option value="panel">بنل</option>
                <option value="panel_glass">بنل مع زجاج</option>
              </select>
            </div>

            <div className={item.opening === 'مفصلي' ? "col-span-1" : "col-span-2"}>
              <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">نوع الزجاج</label>
              <select
                value={item.glassType}
                disabled={item.innerType === 'panel'}
                onChange={(e) => updateItem(item.id, 'glassType', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:appearance-none print:border-none print:p-0 print:font-bold cursor-pointer font-bold text-[#0F172A] text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {item.innerType === 'panel' ? (
                  <option value="بدون زجاج (بنل فقط)">بدون زجاج (بنل فقط)</option>
                ) : (
                  GLASS_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))
                )}
              </select>
            </div>

            {item.opening === 'مفصلي' && (
              <div className="col-span-1">
                <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wider">عدد ضلف المفصلي</label>
                <select
                  value={item.hingePanes || 'ضلفة'}
                  onChange={(e) => updateItem(item.id, 'hingePanes', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all print:appearance-none print:border-none print:p-0 print:font-bold cursor-pointer font-bold text-[#0F172A] text-xs sm:text-sm"
                >
                  <option value="ضلفة">ضلفة</option>
                  <option value="ضلفتين">ضلفتين</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* رسم المعاينة التفاعلي */}
        <div className="sm:col-span-2 lg:col-span-1 flex flex-col space-y-4">
          <h3 className="font-black text-[#0F172A] border-b-2 border-slate-100 pb-2 text-sm uppercase tracking-wider">رسم المعاينة</h3>
          <DynamicPreview item={item} />
        </div>

        {/* الإضافات - Responsive & Mobile-friendly collapsible design */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-[#0F172A] text-sm uppercase tracking-wider">إضافات اختيارية</h3>
            <span className="hidden lg:inline text-xs text-slate-400 font-extrabold">({activeAddons.length}) مختار</span>
          </div>

          {/* Desktop-only view of all addons always expanded */}
          <div className="hidden lg:grid grid-cols-1 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {(Object.entries(addons) as [string, Addon][]).map(([key, addon]) => {
              const { isDisabled, conflictTag } = getAddonStatus(key);

              const formatAddonPrice = (ad: typeof addon) => {
                if (ad.id === 'panda') return 'متر × 1.5';
                if (ad.isFlat) {
                  return `+${ad.price} ج.م`;
                }
                return `+${ad.price} ج.م/م²`;
              };

              return (
                <div 
                  key={key} 
                  className={`p-2 rounded-xl transition-all duration-200 border-2 ${
                    item.addons.includes(key)
                      ? 'bg-[#FDFBF7] border-[#FACC15]'
                      : 'bg-white border-transparent'
                  }`}
                >
                  <label 
                    className={`flex items-start justify-between gap-2.5 ${
                      isDisabled 
                        ? 'opacity-40 cursor-not-allowed' 
                        : 'cursor-pointer group'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.addons.includes(key)}
                        disabled={isDisabled}
                        onChange={() => !isDisabled && toggleAddon(item.id, key)}
                        className={`w-4.5 h-4.5 mt-0.5 text-[#0F172A] rounded border-slate-300 focus:ring-[#FACC15] ${
                          isDisabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer'
                        }`}
                      />
                      <div className="flex flex-col text-right">
                        <span className={`text-sm font-black transition-colors duration-200 ${
                          isDisabled 
                            ? 'text-slate-400 line-through' 
                            : 'text-slate-800 group-hover:text-[#0F172A]'
                        }`}>
                          {addon.name}
                        </span>
                        {key === 'skewWindow1' || key === 'skewWindow2' || key === 'skewBalcony1' || key === 'skewBalcony2' ? (
                          <span className="text-[10px] text-slate-400 font-bold">
                            نظام المفصلي قلاب
                          </span>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="text-left shrink-0">
                      <span className="text-[10.5px] font-extrabold font-mono bg-slate-100 text-[#0F172A] px-2 py-0.5 rounded-lg border border-slate-200/60 inline-block">
                        {formatAddonPrice(addon)}
                      </span>
                    </div>
                  </label>
                  {isDisabled && (
                    <div className="text-[10px] text-amber-600 font-extrabold mr-7 mt-0.5">
                      ⚠️{conflictTag}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Collapsible Mobile/Tablet view */}
          <div className="lg:hidden block space-y-3">
            {/* active additions summary */}
            {activeAddons.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-55 bg-slate-100/60 rounded-2xl border border-slate-200/50">
                {activeAddons.map(key => (
                  <span 
                    key={key} 
                    className="text-[10.5px] font-black bg-[#0F172A] text-white px-2 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Check size={10} className="text-[#FACC15]" />
                    {((addons[key] as any) || {}).name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs font-bold text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/40">
                لا توجد إضافات نشطة لهذا البند.
              </p>
            )}

            {/* expand/collapse button */}
            <button
              type="button"
              onClick={() => setIsAddonsOpen(!isAddonsOpen)}
              className="w-full flex items-center justify-center gap-1.5 bg-[#0F172A] hover:bg-black text-white py-2 px-4 rounded-xl font-black text-xs shadow transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Sliders size={14} className="text-[#FACC15]" />
              <span>{isAddonsOpen ? 'حفظ وإغلاق قائمة الخيارات' : `تعديل واختيار الإضافات (${activeAddons.length})`}</span>
              {isAddonsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* mobile custom picker sheet */}
            <AnimatePresence>
              {isAddonsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border border-slate-150 rounded-2xl p-3 bg-slate-50/60 space-y-2 mt-2"
                >
                  {(Object.entries(addons) as [string, Addon][]).map(([key, addon]) => {
                    const { isDisabled, conflictTag } = getAddonStatus(key);

                    const formatAddonPrice = (ad: typeof addon) => {
                      if (ad.id === 'panda') return 'متر × 1.5';
                      if (ad.isFlat) {
                        return `+${ad.price} ج.م`;
                      }
                      return `+${ad.price} ج.م/م²`;
                    };

                    return (
                      <div 
                        key={key} 
                        className={`p-2.5 rounded-xl transition-all duration-200 border-2 ${
                          item.addons.includes(key)
                            ? 'bg-[#FDFBF7] border-[#FACC15]'
                            : 'bg-white border-transparent'
                        }`}
                      >
                        <label 
                          className={`flex items-start justify-between gap-2.5 ${
                            isDisabled 
                              ? 'opacity-40 cursor-not-allowed' 
                              : 'cursor-pointer group'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={item.addons.includes(key)}
                              disabled={isDisabled}
                              onChange={() => !isDisabled && toggleAddon(item.id, key)}
                              className={`w-5 h-5 mt-0.5 text-[#0F172A] rounded border-slate-300 focus:ring-[#FACC15] ${
                                isDisabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer'
                              }`}
                            />
                            <div className="flex flex-col text-right">
                              <span className={`text-sm font-black transition-colors duration-200 ${
                                isDisabled 
                                  ? 'text-slate-400 line-through' 
                                  : 'text-slate-800'
                              }`}>
                                {addon.name}
                              </span>
                              {key === 'skewWindow1' || key === 'skewWindow2' || key === 'skewBalcony1' || key === 'skewBalcony2' ? (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  نظام المفصلي قلاب
                                </span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="text-left shrink-0">
                            <span className="text-[10.5px] font-extrabold font-mono bg-slate-100 text-[#0F172A] px-2 py-0.5 rounded-lg border border-slate-200/60 inline-block">
                              {formatAddonPrice(addon)}
                            </span>
                          </div>
                        </label>
                        {isDisabled && (
                          <div className="text-[10px] text-amber-600 font-extrabold mr-7 mt-0.5">
                            ⚠️{conflictTag}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* إجمالي البند */}
      <div className="bg-slate-50 p-5 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:bg-white print:border-t-2 print:border-slate-800">
        <div className="text-slate-500 text-sm font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>سعر المتر المربع لهذا البند: <span className="font-bold text-slate-800">{formatCurrency(item.profilePrice + item.addonsPrice)}</span></span>
          {item.flatAddonsPrice && item.flatAddonsPrice > 0 ? (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-extrabold text-xs">
              + {formatCurrency(item.flatAddonsPrice)} إضافات مقطوعة
            </span>
          ) : null}
        </div>
        <div className="text-lg sm:text-xl font-bold text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 justify-end">
          {item.quantity && item.quantity > 1 ? (
            <span className="text-xs sm:text-sm text-slate-400 font-bold ml-2">
              ({formatCurrency(item.itemTotal / item.quantity)} × {item.quantity})
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <span>إجمالي البند:</span>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] font-display">{formatCurrency(item.itemTotal)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ItemCard;
