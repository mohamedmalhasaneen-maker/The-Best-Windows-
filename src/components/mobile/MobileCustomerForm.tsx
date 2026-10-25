import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Save, 
  Check, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  UserCheck 
} from 'lucide-react';
import { CustomerInfo, SavedCustomer } from '../../types';
import { normalizePhoneNumber } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface MobileCustomerFormProps {
  customer: CustomerInfo;
  onChange: (field: keyof CustomerInfo, value: any) => void;
  savedCustomers?: SavedCustomer[];
  onOpenCustomersModal?: () => void;
  onSaveCustomerToDirectory?: () => Promise<void>;
  onSelectCustomer?: (customer: SavedCustomer) => void;
}

export const MobileCustomerForm: React.FC<MobileCustomerFormProps> = ({
  customer,
  onChange,
  savedCustomers = [],
  onOpenCustomersModal,
  onSaveCustomerToDirectory,
  onSelectCustomer
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const qName = (customer.name || '').trim().toLowerCase();
    const qPhone = normalizePhoneNumber(customer.phone);

    if (!qName && !qPhone) {
      return savedCustomers.slice(0, 4);
    }

    return savedCustomers.filter(c => {
      const matchName = qName && c.name.toLowerCase().includes(qName);
      const cPhoneClean = normalizePhoneNumber(c.phone);
      const matchPhone = qPhone && (cPhoneClean.includes(qPhone) || qPhone.includes(cPhoneClean));
      return matchName || matchPhone;
    }).slice(0, 5);
  }, [customer.name, customer.phone, savedCustomers]);

  const handleSaveCustomer = async () => {
    if (!customer.name?.trim() || !onSaveCustomerToDirectory) return;
    setIsSaving(true);
    try {
      await onSaveCustomerToDirectory();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyCustomer = (selected: SavedCustomer) => {
    if (onSelectCustomer) {
      onSelectCustomer(selected);
    } else {
      onChange('name', selected.name);
      onChange('phone', selected.phone);
      if (selected.address) onChange('address', selected.address);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 text-white p-3.5 flex items-center justify-between cursor-pointer border-b-2 border-[#FACC15]"
      >
        <div className="flex items-center gap-2">
          <User className="text-[#FACC15]" size={18} />
          <span className="font-black text-xs sm:text-sm">بيانات العميل والمعاينة</span>
          {customer.name?.trim() && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.2 rounded-md truncate max-w-[120px]">
              {customer.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onOpenCustomersModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCustomersModal();
              }}
              className="text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Users size={12} />
              <span>الدليل</span>
            </button>
          )}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Form Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3.5 space-y-3"
          >
            {/* Customer Name input with dropdown suggestions */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                اسم العميل الكريـم *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => {
                    onChange('name', e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="أدخل اسم العميل (مثال: أ. محمد أحمد)"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#FACC15] rounded-xl outline-none font-bold text-xs text-[#0F172A]"
                />
                <User size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                  >
                    <div className="p-2 bg-slate-100 text-[10px] font-black text-slate-500 border-b border-slate-200 flex justify-between items-center">
                      <span>عملاء مسجلين سابقاً (اضغط للاختيار السريع):</span>
                      <button 
                        type="button" 
                        onClick={() => setShowSuggestions(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        إغلاق ✕
                      </button>
                    </div>
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyCustomer(s)}
                        className="w-full text-right p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="font-extrabold text-[#0F172A]">
                          {s.name}
                          {s.address && <span className="block text-[10px] text-slate-400 font-normal">{s.address}</span>}
                        </div>
                        <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {s.phone}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phone & Date Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  رقم الهاتف / واتساب
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customer.phone}
                    onChange={(e) => onChange('phone', e.target.value)}
                    placeholder="010xxxxxxx"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl outline-none font-bold font-mono text-xs text-[#0F172A]"
                  />
                  <Phone size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  تاريخ العرض
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customer.date}
                    onChange={(e) => onChange('date', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl outline-none font-bold text-xs text-[#0F172A]"
                  />
                  <Calendar size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                العنوان وموقع المشروع
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) => onChange('address', e.target.value)}
                  placeholder="أدخل عنوان أو موقع العميل (مثال: القاهرة - التجمع الخامس)"
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 focus:border-[#0F172A] focus:bg-white rounded-xl outline-none font-bold text-xs text-[#0F172A]"
                />
                <MapPin size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Direct Save Customer Button */}
            {onSaveCustomerToDirectory && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  disabled={!customer.name?.trim() || isSaving}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    saveSuccess
                      ? 'bg-teal-600 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-sm'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={14} className="animate-bounce" />
                      <span>تم حفظ العميل في دليل العملاء!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>حفظ العميل في قاعدة البيانات لسهولة الاسترجاع</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
