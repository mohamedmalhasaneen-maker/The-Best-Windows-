import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, FolderOpen, Calendar, User, FileText, Check, AlertCircle, RefreshCw, Cloud, Database } from 'lucide-react';
import { SavedQuote } from '../types';
import { BRAND_NAME } from '../constants';

interface SavedQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedQuotes: SavedQuote[];
  onSaveCurrent: (name: string) => void;
  onLoadQuote: (quote: SavedQuote) => void;
  onDeleteQuote: (id: string) => void;
  currentCustomerName: string;
  formatCurrency: (val: number) => string;
  onRefresh: () => void;
}

export default function SavedQuotesModal({
  isOpen,
  onClose,
  savedQuotes,
  onSaveCurrent,
  onLoadQuote,
  onDeleteQuote,
  currentCustomerName,
  formatCurrency,
  onRefresh,
}: SavedQuotesModalProps) {
  const [newQuoteName, setNewQuoteName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmLoad, setShowConfirmLoad] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultName = currentCustomerName.trim() 
        ? `عرض سعر - ${currentCustomerName.trim()}`
        : `عرض سعر جديد - ${new Date().toLocaleDateString('ar-EG')}`;
      setNewQuoteName(defaultName);
      setSaveSuccess(false);
      setShowConfirmLoad(null);
      setShowConfirmDelete(null);
    }
  }, [isOpen, currentCustomerName]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteName.trim()) return;
    onSaveCurrent(newQuoteName.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-slate-150 z-10 flex flex-col text-right"
        dir="rtl"
      >
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-[#0F172A] text-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText size={22} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight font-display text-white">إدارة عروض الأسعار المحفوظة</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud size={10} />
                  <span>تخزين سحابي مباشر</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">يتم تخزين عروض الأسعار في قاعدة بيانات الموقع السحابية للاسترجاع الفوري من أي جهاز</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh();
                setTimeout(() => setIsRefreshing(false), 800);
              }}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="تحديث عروض الأسعار من الموقع"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#F59E0B]" : "text-slate-300"} />
              <span className="hidden sm:inline">مزامنة سحابية</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin">
          
          {/* Section: Save Current Quote */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <h4 className="text-slate-800 font-extrabold text-sm flex items-center gap-2 border-b border-slate-200/50 pb-2.5">
              <Save size={16} className="text-slate-500" />
              <span>حفظ عرض السعر الحالي</span>
            </h4>
            
            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="مثال: فيلا المهندس أحمد - التجمع"
                  value={newQuoteName}
                  onChange={(e) => setNewQuoteName(e.target.value)}
                  className="w-full p-3 text-sm bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F59E0B] focus:border-[#0F172A] outline-none transition-all font-bold text-slate-800"
                  required
                />
              </div>
              <button
                type="submit"
                className={`px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition duration-200 cursor-pointer active:scale-95 shrink-0 ${
                  saveSuccess 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]'
                }`}
              >
                {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                <span>{saveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ العرض الحالي'}</span>
              </button>
            </form>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>ميزة تلقائية: يتم حفظ اسم العميل ورقم هاتفه تلقائياً في <strong>دليل العملاء</strong> عند حفظ أي عرض سعر.</span>
            </div>
          </div>

          {/* Section: List of Saved Quotes */}
          <div className="space-y-4">
            <h4 className="text-slate-800 font-extrabold text-sm flex items-center gap-2">
              <FolderOpen size={16} className="text-[#0F172A]" />
              <span>العروض المحفوظة سابقاً ({savedQuotes.length})</span>
            </h4>

            {savedQuotes.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <FileText size={40} className="mx-auto text-slate-300 mb-2.5" />
                <p className="text-slate-500 font-extrabold text-sm">لا توجد عروض أسعار محفوظة حالياً</p>
                <p className="text-slate-400 text-xs mt-1">قم بتسمية وحفظ العرض الحالي لسهولة الوصول إليه لاحقاً</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <AnimatePresence mode="popLayout">
                  {savedQuotes.map((quote) => {
                    const isConfirming = showConfirmLoad === quote.id;

                    return (
                      <motion.div
                        key={quote.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="p-4 border-2 border-slate-150 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white"
                      >
                        <div className="space-y-1.5 flex-1 text-right">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-[#0F172A] text-sm sm:text-base">{quote.name}</span>
                            <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Calendar size={11} />
                              {quote.date}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-slate-400" />
                              العميل: {quote.customer.name || 'غير محدد'}
                            </span>
                            <span>البنود: {quote.items.length}</span>
                            <span className="text-indigo-600 font-black">إجمالي القيمة: {formatCurrency(quote.totalPrice)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          {isConfirming ? (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-1.5 rounded-xl text-xs font-bold text-amber-900">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span>استبدال المسودة الحالية؟</span>
                              <button
                                onClick={() => {
                                  onLoadQuote(quote);
                                  setShowConfirmLoad(null);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-[#0F172A] text-white hover:bg-black rounded-lg cursor-pointer transition-all text-xs"
                              >
                                نعم
                              </button>
                              <button
                                onClick={() => setShowConfirmLoad(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer transition-all text-xs"
                              >
                                لا
                              </button>
                            </div>
                          ) : showConfirmDelete === quote.id ? (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded-xl text-xs font-bold text-rose-950">
                              <AlertCircle size={14} className="text-rose-600 animate-pulse" />
                              <span>هل تريد إزالة عرض السعر هذا؟</span>
                              <button
                                onClick={() => {
                                  onDeleteQuote(quote.id);
                                  setShowConfirmDelete(null);
                                }}
                                className="px-2.5 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-lg cursor-pointer transition-all text-xs"
                              >
                                نعم
                              </button>
                              <button
                                onClick={() => setShowConfirmDelete(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer transition-all text-xs"
                              >
                                لا
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setShowConfirmLoad(quote.id);
                                  setShowConfirmDelete(null);
                                }}
                                className="px-3.5 py-2 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                                title="تحميل واستعادة عرض السعر"
                              >
                                <FolderOpen size={14} />
                                <span>استعادة</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  setShowConfirmDelete(quote.id);
                                  setShowConfirmLoad(null);
                                }}
                                className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition cursor-pointer active:scale-95 border border-rose-100"
                                title="حذف عرض السعر"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-extrabold text-slate-400">© {new Date().getFullYear()} {BRAND_NAME}</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-[#0F172A] hover:bg-black text-white text-xs font-black rounded-xl transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  );
}
