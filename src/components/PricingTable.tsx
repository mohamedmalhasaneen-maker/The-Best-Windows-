/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, CheckCircle2, Sliders, ShieldCheck, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Profile, Addon } from '../types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { 
    maximumFractionDigits: 0 
  }).format(value) + ' ج.م';
};

interface PricingTableProps {
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
}

export default function PricingTable({ profiles, addons }: PricingTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-200 shadow-sm relative overflow-hidden print:hidden mb-6 sm:mb-12"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FACC15]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0F172A]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Accordion Trigger Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-6 md:p-8 cursor-pointer flex items-center justify-between transition-colors hover:bg-slate-50/50 select-none"
      >
        <div className="relative text-right flex-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#FACC15] text-[#0F172A] text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              لائحة الأسعار الرسمية
            </span>
            <span className="text-xs text-slate-400 font-extrabold hidden sm:inline">
              (اضغط للتوسيع أو الإغلاق)
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-display font-black text-[#0F172A] mt-2 mb-1 flex items-center gap-2">
            <BookOpen size={20} className="text-[#0F172A]" />
            أسعار قطاعات الـ UPVC والإضافات المعتمدة
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-bold">
            أسعار شفافة لجميع أنواع القطاعات التركية والأوروبية مع تفاصيل الإضافات والزجاج الدبل.
          </p>
        </div>

        <div className="mr-3 sm:mr-4 p-2 sm:p-2.5 bg-slate-100 rounded-xl sm:rounded-2xl text-[#0F172A] transition-all duration-200 group-hover:bg-[#FACC15] shrink-0">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-slate-150"
          >
            <div className="p-4 sm:p-6 md:p-8 pt-2 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8 relative z-10 bg-white">
              {/* Profiles Section */}
              <div className="bg-slate-50/50 rounded-xl sm:rounded-2xl border border-slate-100 p-3.5 sm:p-5 md:p-6">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5 mb-4">
                  <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
                    <Layers size={18} className="text-[#0F172A]" />
                    <span>أسعار قطاعات الـ UPVC</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">سعر المتر المربع</span>
                </div>
                
                <div className="space-y-3">
                  {Object.values(profiles).map((profile) => (
                    <div 
                      key={profile.id}
                      className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150 transition-all hover:shadow-md hover:border-[#FACC15]/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-[#0F172A]" />
                        <h4 className="text-sm font-black text-[#0F172A]">{profile.name}</h4>
                      </div>
                      <div className="text-left font-mono font-black text-[#0F172A]">
                        {profile.isFlat ? (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-bold block">
                            {formatCurrency(profile.price)} / {profile.unit || 'للقطعة'}
                          </span>
                        ) : (
                          formatCurrency(profile.price)
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2 bg-[#0F172A]/5 p-3 rounded-xl border border-[#0F172A]/10">
                  <ShieldCheck size={16} className="text-[#0F172A] shrink-0 mt-0.5" />
                  <p className="text-xs leading-normal font-bold text-slate-500">
                    جميع قطاعات الـ UPVC لدينا تتميز بمقاومتها الشديدة للعوامل الجوية والحرارة وعزل تام للصوت والتربة.
                  </p>
                </div>
              </div>

              {/* Addons / Options Section */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 md:p-6">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5 mb-4">
                  <h3 className="text-base sm:text-lg font-black text-[#0F172A] flex items-center gap-2">
                    <Sliders size={18} className="text-[#0F172A]" />
                    <span>الإضافات والأنظمة الخاصة</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">تكلفة إضافية</span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {Object.values(addons).map((addon) => (
                    <div 
                      key={addon.id}
                      className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150 transition-all hover:shadow-md hover:border-[#FACC15]/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={15} className="text-[#FACC15] shrink-0" />
                        <h4 className="text-sm font-black text-[#0F172A]">{addon.name}</h4>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-sm font-black text-[#0F172A] font-mono leading-none">
                          {addon.id === 'panda' ? (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold block">
                              سعر المتر × 1.5
                            </span>
                          ) : addon.isFlat ? (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-bold block">
                              +{formatCurrency(addon.price)} / {addon.unit || 'قطعة'}
                            </span>
                          ) : (
                            `${formatCurrency(addon.price)} / م²`
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2 bg-yellow-50/70 p-3 rounded-xl border border-yellow-100">
                  <span className="text-amber-600 font-black text-xs shrink-0 mt-0.5">⚠️</span>
                  <p className="text-xs text-slate-500 leading-normal font-bold">
                    يتم دمج واحتساب قيمة الإضافات المختارة ضمن تكلفة البند تلقائياً في حاسبة الأسعار بالأسفل.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
