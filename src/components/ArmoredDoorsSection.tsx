import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Check,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Truck,
  Save,
  Lock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArmoredDoorItem,
  ArmoredDoorManufactureType,
  ArmoredDoorTypeConfig,
} from '../types';
import {
  ARMORED_DOOR_PRODUCT_NAME,
  ARMORED_DOOR_EGYPTIAN_SINGLE_NAME,
  ARMORED_INCLUSION_NOTE,
  ARMORED_EXCLUSION_NOTE,
  ARMORED_PDF_INCLUSION_BANNER,
  DEFAULT_ARMORED_DOOR_TYPES,
  getArmoredDoorProductName,
  calculateArmoredDoorPrice,
  calculateArmoredQuoteTotal,
} from '../constants/armoredConstants';

interface ArmoredDoorsSectionProps {
  armoredDoors: ArmoredDoorItem[];
  armoredTypes?: ArmoredDoorTypeConfig[];
  pricingSyncStatus?: 'loading' | 'synced' | 'error';
  pricingErrorText?: string | null;
  onRetryLoadPricing?: () => void;
  onAddDoor: (door: ArmoredDoorItem) => void;
  onUpdateDoor: (id: number, door: Partial<ArmoredDoorItem>) => void;
  onRemoveDoor: (id: number) => void;
  onDuplicateDoor: (door: ArmoredDoorItem) => void;
  formatCurrency: (value: number) => string;
  onSaveQuoteAuto: () => void;
  onNavigateNext: () => void;
}

export const ArmoredDoorsSection: React.FC<ArmoredDoorsSectionProps> = ({
  armoredDoors,
  armoredTypes = DEFAULT_ARMORED_DOOR_TYPES,
  pricingSyncStatus = 'synced',
  pricingErrorText = null,
  onRetryLoadPricing,
  onAddDoor,
  onUpdateDoor,
  onRemoveDoor,
  onDuplicateDoor,
  formatCurrency,
  onSaveQuoteAuto,
  onNavigateNext,
}) => {
  const allTypes =
    Array.isArray(armoredTypes) && armoredTypes.length > 0
      ? armoredTypes
      : DEFAULT_ARMORED_DOOR_TYPES;

  const activeTypes = allTypes.filter((t) => t.isActive !== false);
  const selectableTypes = activeTypes.length > 0 ? activeTypes : allTypes;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [manufactureType, setManufactureType] = useState<ArmoredDoorManufactureType>(
    () => selectableTypes[0]?.id || 'turkish_turkish'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [justSavedQuote, setJustSavedQuote] = useState(false);

  // Ensure selected manufactureType stays valid if active types change while creating a new item
  const effectiveManufactureType =
    editingId !== null
      ? manufactureType
      : selectableTypes.some((t) => t.id === manufactureType)
      ? manufactureType
      : selectableTypes[0]?.id || manufactureType;

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setManufactureType(selectableTypes[0]?.id || 'turkish_turkish');
    setQuantity(1);
    setNotes('');
  };

  const handleStartEdit = (door: ArmoredDoorItem) => {
    setEditingId(door.id);
    const defaultSpecName = getArmoredDoorProductName(door.manufactureType, allTypes);
    setTitle(
      door.title === ARMORED_DOOR_PRODUCT_NAME ||
        door.title === ARMORED_DOOR_EGYPTIAN_SINGLE_NAME ||
        door.title === defaultSpecName
        ? ''
        : door.title || ''
    );
    setManufactureType(door.manufactureType || selectableTypes[0]?.id || 'turkish_turkish');
    setQuantity(door.quantity || 1);
    setNotes(door.notes || '');

    const formElement = document.getElementById('armored-door-builder');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentCalculation = calculateArmoredDoorPrice(
    effectiveManufactureType,
    quantity,
    allTypes
  );

  const handleSubmitDoor = (e: React.FormEvent) => {
    e.preventDefault();
    if (pricingSyncStatus === 'error') {
      return;
    }

    const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
    const calc = calculateArmoredDoorPrice(effectiveManufactureType, safeQty, allTypes);
    const trimmedTitle = title.trim();
    const defaultTitle = trimmedTitle
      ? trimmedTitle
      : `باب مصفح (${calc.manufactureLabel})`;

    const doorData: ArmoredDoorItem = {
      id: editingId || Date.now(),
      title: defaultTitle,
      productName: calc.productName,
      manufactureType: calc.manufactureType,
      manufactureLabel: calc.manufactureLabel,
      unitPrice: calc.unitPrice,
      quantity: calc.quantity,
      totalPrice: calc.totalPrice,
      includesTransportAndInstall: calc.includesTransportAndInstall,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      onUpdateDoor(editingId, doorData);
    } else {
      onAddDoor(doorData);
    }

    resetForm();
  };

  const handleTriggerSaveQuote = () => {
    onSaveQuoteAuto();
    setJustSavedQuote(true);
    setTimeout(() => setJustSavedQuote(false), 2200);
  };

  const totalDoorsCount = armoredDoors.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalArmoredPrice = calculateArmoredQuoteTotal(armoredDoors);

  return (
    <div className="w-full space-y-8" dir="rtl">
      {/* DB Error Alert (Never silently fall back if database pricing failed to load) */}
      {pricingSyncStatus === 'error' && (
        <div
          role="alert"
          className="bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm">تعذر تحميل أسعار الأبواب المعتمدة من قاعدة البيانات</h4>
              <p className="text-xs font-bold text-rose-700 mt-0.5">
                {pricingErrorText ||
                  'فشل الاتصال بقاعدة البيانات لتحميل أحدث أسعار الأبواب المصفحة. تم إيقاف إضافة بنود جديدة مؤقتاً لضمان عدم اعتماد أسعار قديمة.'}
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
          <div className="space-y-2.5 min-w-0">
            <div className="inline-flex items-center gap-2 bg-[#0F172A] text-[#FACC15] px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm">
              <Shield size={16} />
              <span>نظام عروض أسعار الأبواب المصفحة المستقل</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] tracking-tight">
              قسم الأبواب المصفحة
            </h2>
            <p className="text-slate-700 font-black text-sm sm:text-base flex flex-wrap items-center gap-2">
              <Lock size={16} className="text-[#F59E0B] shrink-0" />
              <span>{currentCalculation.productName}</span>
            </p>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black">
              <Truck size={16} className="text-emerald-600 shrink-0" />
              <span>
                {currentCalculation.includesTransportAndInstall
                  ? ARMORED_PDF_INCLUSION_BANNER
                  : ARMORED_EXCLUSION_NOTE}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0 flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-[11px] font-black text-slate-400">إجمالي الأبواب المصفحة</div>
              <div className="text-xl sm:text-2xl font-black font-display text-[#0F172A]">
                {totalDoorsCount} {totalDoorsCount === 1 ? 'باب' : totalDoorsCount === 2 ? 'بابين' : 'أبواب'}
              </div>
              <div className="text-xs font-black text-amber-600 font-mono" dir="ltr">
                {formatCurrency(totalArmoredPrice)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Armored Door Builder / Editor */}
      <div
        id="armored-door-builder"
        className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-8 shadow-sm relative overflow-hidden space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0">
              {editingId ? <Edit3 size={20} /> : <Plus size={22} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-display font-black text-[#0F172A]">
                {editingId ? 'تعديل بند باب مصفح' : 'إضافة باب مصفح جديد للعرض'}
              </h3>
              <p className="text-xs text-slate-500 font-bold truncate">
                {currentCalculation.productName} —{' '}
                {currentCalculation.includesTransportAndInstall
                  ? ARMORED_INCLUSION_NOTE
                  : ARMORED_EXCLUSION_NOTE}
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition cursor-pointer shrink-0"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitDoor} className="space-y-6">
          {/* Product Specification Display for Selected Type */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-black text-slate-400 block">
                المواصفات المعتمدة للنوع المختار ({currentCalculation.manufactureLabel})
              </span>
              <span className="text-sm sm:text-base font-black text-[#0F172A]">
                {currentCalculation.productName}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-xs font-black shrink-0 self-start sm:self-center ${
                currentCalculation.includesTransportAndInstall
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              <Check size={14} strokeWidth={3} />
              <span>
                {currentCalculation.includesTransportAndInstall
                  ? ARMORED_INCLUSION_NOTE
                  : ARMORED_EXCLUSION_NOTE}
              </span>
            </span>
          </div>

          {/* Mandatory Single-Choice Manufacture Type */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#0F172A]" />
              <span>1. اختيار نوع الباب والمواصفات (إلزامي — اختيار واحد فقط):</span>
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {selectableTypes.map((option) => {
                const isSelected = effectiveManufactureType === option.id;
                const inc = option.includesTransportAndInstall !== false;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setManufactureType(option.id)}
                    aria-pressed={isSelected}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative text-right w-full flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-lg ring-2 ring-[#FACC15]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'border-[#FACC15] bg-[#FACC15] text-[#0F172A]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base sm:text-lg font-black font-display tracking-tight">
                              {option.label}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                isSelected
                                  ? 'bg-[#FACC15] text-[#0F172A]'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {option.badge}
                            </span>
                          </div>
                          <p
                            className={`text-xs mt-1.5 font-bold ${
                              isSelected ? 'text-slate-200' : 'text-slate-700'
                            }`}
                          >
                            {option.specs}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`pt-2.5 border-t flex items-center justify-between gap-2 w-full ${
                        isSelected ? 'border-slate-700' : 'border-slate-200'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-black ${
                          inc
                            ? isSelected
                              ? 'text-emerald-300'
                              : 'text-emerald-700'
                            : isSelected
                            ? 'text-amber-300'
                            : 'text-amber-700'
                        }`}
                      >
                        {inc ? ARMORED_INCLUSION_NOTE : ARMORED_EXCLUSION_NOTE}
                      </span>
                      <span
                        className={`font-black font-mono text-lg sm:text-xl ${
                          isSelected ? 'text-[#FACC15]' : 'text-[#0F172A]'
                        }`}
                        dir="ltr"
                      >
                        {formatCurrency(option.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Location/Title and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                تسمية / مكان الباب (اختياري)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: باب الشقة الرئيسي / باب المدخل"
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition font-bold text-sm text-right text-[#0F172A] placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                ملاحظات إضافية للبند (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: اتجاه الفتح يمين للداخل / لون جوزي"
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition font-bold text-sm text-right text-[#0F172A] placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quantity & Live Price Calculation Box */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-black text-slate-700 shrink-0">
                الكمية المطلوبة:
              </label>
              <div className="flex items-center bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-black text-lg transition cursor-pointer"
                  aria-label="تقليل الكمية"
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
                  aria-label="زيادة الكمية"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-black block">
                  سعر الباب ({currentCalculation.manufactureLabel})
                </span>
                <span className="text-base font-black font-mono text-slate-800" dir="ltr">
                  {formatCurrency(currentCalculation.unitPrice)}
                </span>
                <span className="text-[10px] text-emerald-700 font-black block">
                  {currentCalculation.includesTransportAndInstall
                    ? ARMORED_INCLUSION_NOTE
                    : ARMORED_EXCLUSION_NOTE}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-slate-300 hidden sm:block" />

              <div className="text-right">
                <span className="text-[10px] text-amber-600 font-black block">
                  إجمالي البند ({currentCalculation.quantity} × {formatCurrency(currentCalculation.unitPrice)})
                </span>
                <span className="text-xl sm:text-2xl font-black font-display text-[#0F172A]" dir="ltr">
                  {formatCurrency(currentCalculation.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pricingSyncStatus === 'error'}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#0F172A] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-[#FACC15] font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition cursor-pointer"
            >
              {editingId ? <Check size={20} /> : <Plus size={20} />}
              <span>{editingId ? 'حفظ تعديلات الباب المصفح' : 'إضافة الباب المصفح إلى العرض'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Added Armored Doors List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#0F172A] text-[#FACC15] text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
              {armoredDoors.length} {armoredDoors.length === 1 ? 'بند' : 'بنود'}
            </span>
            <h3 className="font-display font-black text-lg text-[#0F172A]">
              بنود الأبواب المصفحة المدرجة بالعرض
            </h3>
          </div>
          {armoredDoors.length > 0 && (
            <span className="text-xs font-bold text-slate-600">
              الإجمالي الكلي:{' '}
              <strong className="text-[#0F172A] font-mono text-sm" dir="ltr">
                {formatCurrency(totalArmoredPrice)}
              </strong>
            </span>
          )}
        </div>

        {armoredDoors.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Shield size={32} />
            </div>
            <h4 className="text-base font-black text-slate-700">لم تقم بإضافة أي أبواب مصفحة بعد</h4>
            <p className="text-xs text-slate-500 font-bold max-w-md mx-auto">
              اختر نوع الباب المطلوب (تركي تقفيل تركي، تركي تقفيل مصري، أو مصري كالون واحد) والكمية من النموذج أعلاه لإضافتها إلى عرض السعر.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {armoredDoors.map((door, index) => (
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
                        <span
                          className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
                            door.manufactureType === 'turkish_turkish'
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : door.manufactureType === 'egyptian_single'
                              ? 'bg-sky-100 text-sky-900 border-sky-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {door.manufactureLabel}
                        </span>
                        <span
                          className={`text-[10px] font-black border px-2 py-0.5 rounded-md ${
                            door.includesTransportAndInstall !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {door.includesTransportAndInstall !== false
                            ? ARMORED_INCLUSION_NOTE
                            : ARMORED_EXCLUSION_NOTE}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-500">
                        {door.productName || getArmoredDoorProductName(door.manufactureType, allTypes)}
                      </p>

                      {door.notes && (
                        <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
                          ملاحظة: {door.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-black block" dir="ltr">
                        {formatCurrency(door.unitPrice)} × {door.quantity}
                      </span>
                      <span className="text-lg sm:text-xl font-black font-display text-[#0F172A]" dir="ltr">
                        {formatCurrency(door.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDuplicateDoor(door)}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title="نسخ البند"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(door)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                        title="تعديل البند"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveDoor(door.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 4. Final Grand Total Summary Card */}
      <div className="bg-[#0F172A] text-white rounded-3xl border-2 border-[#F59E0B] p-5 sm:p-7 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-xs font-black text-[#FACC15]">ملخص عرض أسعار الأبواب المصفحة</div>
          <div className="text-xl sm:text-2xl font-black font-display">
            الإجمالي النهائي ({totalDoorsCount} {totalDoorsCount === 1 ? 'باب' : totalDoorsCount === 2 ? 'بابين' : 'أبواب'})
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <Check size={14} strokeWidth={3} />
            <span>{ARMORED_PDF_INCLUSION_BANNER}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto justify-end">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-3 text-center sm:text-left">
            <span className="text-[10px] text-slate-400 font-black block">صافي السعر النهائي</span>
            <span className="text-2xl sm:text-3xl font-black font-display text-[#FACC15]" dir="ltr">
              {formatCurrency(totalArmoredPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleTriggerSaveQuote}
            disabled={justSavedQuote}
            className={`min-h-[48px] px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
              justSavedQuote
                ? 'bg-teal-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {justSavedQuote ? <Check size={18} /> : <Save size={18} />}
            <span>{justSavedQuote ? 'تم حفظ العرض!' : 'حفظ عرض السعر'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateNext}
            className="min-h-[48px] px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
          >
            <span>معاينة وتنزيل PDF</span>
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>

      {/* 5. Bottom Navigation Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <ArrowRight size={14} className="text-[#F59E0B]" />
          <span>{currentCalculation.productName} — {ARMORED_PDF_INCLUSION_BANNER}</span>
        </div>

        <button
          type="button"
          onClick={onNavigateNext}
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#0F172A] hover:bg-black text-[#FACC15] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer shadow-lg shadow-slate-900/10"
        >
          <span>المتابعة إلى معاينة وطباعة عرض سعر أبواب مصفحة (PDF)</span>
          <ArrowLeft size={18} />
        </button>
      </div>
    </div>
  );
};
