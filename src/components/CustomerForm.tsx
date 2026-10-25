import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Users, 
  BookmarkCheck, 
  Save, 
  Check, 
  ChevronDown, 
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { CustomerInfo, SavedCustomer } from '../types';
import { normalizePhoneNumber } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  customer: CustomerInfo;
  onChange: (field: keyof CustomerInfo, value: any) => void;
  savedCustomers?: SavedCustomer[];
  onOpenCustomersModal?: () => void;
  onSaveCustomerToDirectory?: () => Promise<void>;
  onSelectCustomer?: (customer: SavedCustomer) => void;
}

export default function CustomerForm({ 
  customer, 
  onChange, 
  savedCustomers = [], 
  onOpenCustomersModal, 
  onSaveCustomerToDirectory,
  onSelectCustomer 
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter registered customers matching currently typed name or phone
  const suggestions = useMemo(() => {
    const qName = (customer.name || '').trim().toLowerCase();
    const qPhone = normalizePhoneNumber(customer.phone);

    if (!qName && !qPhone) {
      // Return first 5 most recent if user clicks and input is empty
      return savedCustomers.slice(0, 5);
    }

    return savedCustomers.filter(c => {
      const matchName = qName && c.name.toLowerCase().includes(qName);
      const cPhoneClean = normalizePhoneNumber(c.phone);
      const matchPhone = qPhone && (cPhoneClean.includes(qPhone) || qPhone.includes(cPhoneClean));
      return matchName || matchPhone;
    }).slice(0, 6);
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

  const canSaveCustomer = Boolean(customer.name?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border-2 border-slate-200 overflow-visible shadow-sm hover:border-[#FACC15] border-r-8 border-r-[#FACC15] p-6 sm:p-8 mb-10 print:hidden transition-all duration-300 relative"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-display font-black text-[#0F172A] flex items-center gap-3">
            <User className="text-[#0F172A]" size={26} />
            بيانات العميل والمشروع
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            أدخل بيانات العميل ليتم توليد عرض السعر باسمه، أو اختر من قائمة عملائك المسجلين للوصول السريع.
          </p>
        </div>

        {/* Action Status Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 py-1.5 px-3.5 bg-green-50 text-green-700 rounded-full text-xs font-black border border-green-200">
            <CheckCircle2 size={14} />
            جاهز للطباعة بالتفاصيل
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Customer Name with Autocomplete Suggestions */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              اسم العميل المحترم *
            </label>

            {savedCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-extrabold flex items-center gap-0.5 cursor-pointer"
              >
                <span>العملاء المسجلين</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          <input
            type="text"
            required
            value={customer.name}
            onFocus={() => {
              if (savedCustomers.length > 0) setShowSuggestions(true);
            }}
            onChange={(e) => {
              onChange('name', e.target.value);
              if (savedCustomers.length > 0) setShowSuggestions(true);
            }}
            placeholder="مثال: م. أحمد عبد العزيز"
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300"
          />

          {/* Floating Registered Customers Autocomplete Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                className="absolute right-0 left-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 max-h-64 overflow-y-auto"
              >
                <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 flex items-center justify-between border-b border-slate-100 mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    اختيار سريع من العملاء المسجلين
                  </span>
                  {onOpenCustomersModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        onOpenCustomersModal();
                      }}
                      className="text-amber-600 hover:underline cursor-pointer"
                    >
                      عرض الكل
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleApplyCustomer(item)}
                      className="w-full text-right p-2.5 rounded-xl hover:bg-amber-50/80 transition-colors flex items-center justify-between gap-2 group cursor-pointer border border-transparent hover:border-amber-200"
                    >
                      <div>
                        <div className="text-xs font-black text-slate-800 group-hover:text-[#0F172A]">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-600">{item.phone}</span>
                          {item.address && (
                            <span className="text-slate-400 truncate max-w-[120px]">
                              • {item.address}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-black bg-[#0F172A] text-[#FACC15] px-2 py-1 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        تعبئة
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Customer Phone */}
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Phone size={13} className="text-slate-400" />
            رقم الهاتف للتواصل *
          </label>
          <input
            type="text"
            value={customer.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="مثال: 01xxxxxxxxx"
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-mono font-bold placeholder:text-slate-300"
          />
        </div>

        {/* Project Address */}
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            عنوان المعاينة / المشروع
          </label>
          <input
            type="text"
            value={customer.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="مثال: التجمع الخامس، فيلا 12"
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300"
          />
        </div>

        {/* Quote Date */}
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            تاريخ عرض السعر
          </label>
          <input
            type="date"
            value={customer.date}
            onChange={(e) => onChange('date', e.target.value)}
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold cursor-pointer"
          />
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            أقصى تاريخ للتسليم
          </label>
          <input
            type="date"
            value={customer.deliveryDate || ''}
            onChange={(e) => onChange('deliveryDate', e.target.value)}
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold cursor-pointer"
          />
        </div>
      </div>
    </motion.div>
  );
}
