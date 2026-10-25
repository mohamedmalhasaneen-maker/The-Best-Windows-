import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  UserPlus, 
  Phone, 
  MapPin, 
  Search, 
  Trash2, 
  Check, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  UserCheck
} from 'lucide-react';
import { SavedCustomer } from '../types';
import { normalizePhoneNumber } from '../firebase';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: SavedCustomer[];
  onSelectCustomer: (customer: SavedCustomer) => void;
  onSaveCustomer: (customer: { name: string; phone: string; address?: string; notes?: string }) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export default function CustomersModal({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onRefresh
}: CustomersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qClean = normalizePhoneNumber(q);
    if (!q) return customers;
    return customers.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const cClean = normalizePhoneNumber(c.phone);
      const matchPhone = qClean ? (cClean.includes(qClean) || qClean.includes(cClean)) : false;
      const matchAddress = Boolean(c.address && c.address.toLowerCase().includes(q));
      return matchName || matchPhone || matchAddress;
    });
  }, [customers, searchQuery]);

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setIsAddingNew(false);
      setSuccessToast('تم حفظ العميل في قاعدة البيانات بنجاح');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (customer: SavedCustomer) => {
    setSelectedCustomerId(customer.id);
    onSelectCustomer(customer);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onDeleteCustomer(id);
      setDeleteConfirmId(null);
      setSuccessToast('تم حذف العميل من السجل');
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col text-right"
        dir="rtl"
      >
        {/* Top Gold Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-[#0F172A] text-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Users size={22} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight font-display text-white">
                  سجل العملاء المسجلين
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud size={10} />
                  <span>Firestore Cloud</span>
                </span>
                <span className="bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#F59E0B]/30">
                  {customers.length} عميل
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                اختر عميلاً لتعبئة بياناته تلقائياً في عرض السعر الجديد بضغطة واحدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh();
                setTimeout(() => setIsRefreshing(false), 800);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="مزامنة مع قاعدة البيانات السحابية"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#F59E0B]" : "text-slate-300"} />
              <span className="hidden sm:inline">مزامنة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sub-bar / Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو العنوان..."
              className="w-full pr-10 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#0F172A] outline-none transition-all font-bold placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm ${
              isAddingNew
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-[#0F172A] text-[#F59E0B] hover:bg-slate-800'
            }`}
          >
            {isAddingNew ? (
              <>
                <X size={14} />
                <span>إلغاء الإضافة</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>إضافة عميل جديد</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-6 py-2.5 text-xs font-black flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{successToast}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add Form Collapse */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddNew}
              className="bg-amber-50/70 border-b border-amber-200/80 p-5 overflow-hidden"
            >
              <h4 className="text-xs font-black text-amber-900 mb-3 flex items-center gap-1.5 uppercase">
                <UserPlus size={14} className="text-amber-700" />
                <span>تسجيل عميل جديد في قاعدة البيانات السحابية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: م. وائل الشريف"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 01012345678"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">عنوان المعاينة / المشروع</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: الشيخ زايد - كمبوند الياسمين"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !phone.trim()}
                  className="px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-[#F59E0B] rounded-xl text-xs font-black transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  <span>حفظ في السجل</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Customers List Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 border border-slate-200">
                <Users size={28} />
              </div>
              <h4 className="text-base font-black text-slate-800 mb-1">
                {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد عملاء مسجلين بعد'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                {searchQuery 
                  ? 'جرب البحث باسم آخر أو تأكد من صحة رقم الهاتف'
                  : 'يمكنك إضافة وتخزين بيانات عملائك بسهولة لملء أي عرض سعر قادم بضغطة زر واحدة.'}
              </p>
              {!isAddingNew && !searchQuery && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-[#F59E0B] font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
                >
                  <UserPlus size={14} />
                  <span>تسجيل أول عميل الآن</span>
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const isSelected = selectedCustomerId === cust.id;
              const isDeleting = deleteConfirmId === cust.id;

              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelect(cust)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/card relative ${
                    isSelected 
                      ? 'border-[#F59E0B] bg-amber-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-[#0F172A] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover/card:bg-[#0F172A] flex items-center justify-center text-slate-600 group-hover/card:text-[#F59E0B] transition-colors shrink-0 mt-0.5">
                      <UserCheck size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 group-hover/card:text-[#0F172A]">
                          {cust.name}
                        </h4>
                        {cust.updatedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(cust.updatedAt).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]" dir="ltr">
                          <Phone size={11} className="text-[#0F172A]" />
                          {cust.phone}
                        </span>

                        {cust.address && (
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <MapPin size={11} className="text-slate-400" />
                            {cust.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(cust);
                      }}
                      className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-[#F59E0B] rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm group-hover/card:scale-105 active:scale-95"
                    >
                      <Check size={13} />
                      <span>اختيار وتعبئة</span>
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(cust.id, e)}
                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                          title="تأكيد الحذف"
                        >
                          حذف
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(cust.id);
                        }}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="حذف هذا العميل"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-bold">
            <Users size={14} className="text-slate-400" />
            <span>إجمالي العملاء: {customers.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
}
