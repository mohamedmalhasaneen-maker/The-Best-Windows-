import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, FolderOpen, Calendar, User, FileText, Check, AlertCircle, Cloud } from 'lucide-react';
import { SavedWpcQuote } from '../types';
import { BRAND_NAME } from '../constants';

interface SavedWpcQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedQuotes: SavedWpcQuote[];
  onSaveCurrent: (name: string) => void;
  onLoadQuote: (quote: SavedWpcQuote) => void;
  onDeleteQuote: (id: string) => void;
  currentCustomerName: string;
  formatCurrency: (val: number) => string;
  onRefresh: () => void;
}

export default function SavedWpcQuotesModal({
  isOpen,
  onClose,
  savedQuotes,
  onSaveCurrent,
  onLoadQuote,
  onDeleteQuote,
  currentCustomerName,
  formatCurrency,
  onRefresh,
}: SavedWpcQuotesModalProps) {
  const [newQuoteName, setNewQuoteName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmLoad, setShowConfirmLoad] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultName = currentCustomerName.trim()
        ? `عرض سعر أبواب WPC - ${currentCustomerName.trim()}`
        : `عرض سعر أبواب WPC جديد - ${new Date().toLocaleDateString('ar-EG')}`;
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
                <h3 className="text-lg font-black tracking-tight font-display text-white">إدارة عروض أسعار أبواب WPC المحفوظة</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud size={10} />
                  <span>أبواب WPC فقط</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">حفظ واسترجاع عروض أسعار أبواب WPC بشكل مستقل تماماً عن عروض النوافذ والأبواب PVC</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Save Current Quote Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Save size={16} className="text-[#F59E0B]" />
              <span>حفظ عرض السعر الحالي لأبواب WPC</span>
            </h4>
            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newQuoteName}
                onChange={(e) => setNewQuoteName(e.target.value)}
                placeholder="أدخل اسم عرض السعر (مثال: عرض عميل مميز)..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              />
              <button
                type="submit"
                disabled={!newQuoteName.trim() || saveSuccess}
                className="min-h-[44px] px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
              >
                {saveSuccess ? (
                  <>
                    <Check size={16} className="text-emerald-950" />
                    <span>تم الحفظ!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>حفظ بالسحاب</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Quotes List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FolderOpen size={16} className="text-slate-700" />
                <span>عروض أسعار أبواب WPC المحفوظة ({savedQuotes.length})</span>
              </h4>
              <button
                type="button"
                onClick={onRefresh}
                className="text-xs font-bold text-slate-500 hover:text-[#0F172A] transition flex items-center gap-1 cursor-pointer"
              >
                <span>تحديث القائمة</span>
              </button>
            </div>

            {savedQuotes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <FileText size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800">لا توجد عروض أسعار أبواب WPC محفوظة حتى الآن</p>
                  <p className="text-xs text-slate-500">قم بإضافة أبواب WPC واحفظ العرض ليسهل استرجاعه في أي وقت</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedQuotes.map((quote) => {
                  const doorCount = quote.wpcDoors?.length || 0;
                  return (
                    <div
                      key={quote.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-display font-black text-slate-900 text-sm">{quote.name}</h5>
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                            {doorCount} {doorCount === 1 ? 'باب' : 'أبواب'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                          {quote.customer?.name && (
                            <span className="flex items-center gap-1">
                              <User size={13} className="text-slate-400" />
                              <span>العميل: {quote.customer.name}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{quote.date || new Date().toLocaleDateString('ar-EG')}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="text-left font-mono font-black text-[#0F172A] text-sm">
                          {formatCurrency(quote.wpcTotal || 0)}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {showConfirmLoad === quote.id ? (
                            <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200">
                              <span className="text-[11px] font-black text-amber-900 px-1">تحميل؟</span>
                              <button
                                onClick={() => {
                                  onLoadQuote(quote);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-black hover:bg-amber-700 transition"
                              >
                                نعم
                              </button>
                              <button
                                onClick={() => setShowConfirmLoad(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowConfirmLoad(quote.id)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-[#0F172A] hover:text-white text-slate-800 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <FolderOpen size={14} />
                              <span>استرجاع</span>
                            </button>
                          )}

                          {showConfirmDelete === quote.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
                              <span className="text-[11px] font-black text-rose-900 px-1">حذف؟</span>
                              <button
                                onClick={() => {
                                  onDeleteQuote(quote.id);
                                  setShowConfirmDelete(null);
                                }}
                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-black hover:bg-rose-700 transition"
                              >
                                حذف
                              </button>
                              <button
                                onClick={() => setShowConfirmDelete(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowConfirmDelete(quote.id)}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                              aria-label="حذف عرض السعر"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
}
