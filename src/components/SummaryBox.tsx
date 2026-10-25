import { FileText, Percent, Coins, NotebookPen, BadgePercent, Plus, Trash2 } from 'lucide-react';
import { CalculationResult, CustomerInfo } from '../types';
import { motion } from 'motion/react';

interface Props {
  calculations: CalculationResult;
  customer: CustomerInfo;
  onChange: (field: keyof CustomerInfo, value: any) => void;
  formatCurrency: (value: number) => string;
  handlePrint: () => void;
}

export default function SummaryBox({ calculations, customer, onChange, formatCurrency, handlePrint }: Props) {
  const discountType = customer.discountType || 'cash';
  const discountValue = customer.discountValue || 0;
  const notes = customer.notes || '';
  const notesAmount = customer.notesAmount || 0;
  const additionalNotes = customer.additionalNotes || [];
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (calculations.totalPrice * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }
  
  if (discountAmount > calculations.totalPrice) {
    discountAmount = calculations.totalPrice;
  }
  
  // Calculate total notes amount (primary notes amount + additional notes amount)
  const totalNotesAmount = notesAmount + additionalNotes.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  // Calculate final price: Subtotal - Discount + Total Notes Amount
  const finalPrice = Math.max(0, calculations.totalPrice - discountAmount + totalNotesAmount);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-6 md:mt-12 bg-[#F1F5F9] border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 relative overflow-hidden print:hidden flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 md:gap-8"
    >
      {/* القسم التفاعلي للخصومات والملاحظات */}
      <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 text-right w-full">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0F172A] mb-1 font-display flex items-center gap-2">
            <NotebookPen size={16} />
            خيارات التخفيض والملاحظات الإضافية
          </h3>
          <p className="text-slate-500 text-xs">
            تحكّم في ميزانية المعاملة بالكامل؛ طبّق نسب خصم دقيقة أو مبالغ مقطوعة واكتب ملاحظات الفنيين شاملة التكلفة الإضافية.
          </p>
        </div>

        {/* 1. الخصم المباشر التفاعلي */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-150/80 shadow-sm">
          <div>
            <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <BadgePercent size={14} className="text-[#0F172A]" />
              نوع خصم العميل
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onChange('discountType', 'cash')}
                className={`flex-1 py-2 px-3 text-center rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  discountType === 'cash' ? 'bg-[#0F172A] text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500'
                }`}
              >
                <Coins size={13} />
                <span>خصم نقدي (ج.م)</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('discountType', 'percentage')}
                className={`flex-1 py-2 px-3 text-center rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  discountType === 'percentage' ? 'bg-[#0F172A] text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500'
                }`}
              >
                <Percent size={13} />
                <span>خصم نسبة (%)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
              قيمة الخصم المطلوب
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                max={discountType === 'percentage' ? 100 : undefined}
                value={discountValue || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange('discountValue', isNaN(val) ? 0 : val);
                }}
                placeholder={discountType === 'percentage' ? "0%" : "0 ج.م"}
                className="w-full p-2.5 min-h-[44px] bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold text-sm sm:text-base placeholder:text-slate-350 text-right pr-3 pl-12"
              />
              <div className="absolute left-3 top-3 text-slate-400 font-extrabold text-sm pointer-events-none">
                {discountType === 'percentage' ? '%' : 'ج.م'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. ملاحظات ومبلغ من الملاحظة */}
        <div id="notes-management-section" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-150/80 shadow-sm">
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                ملاحظات إضافية لعرض السعر (تظهر الملاحظات أسفل الطباعة)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => onChange('notes', e.target.value)}
                placeholder="مثال: الأسعار شاملة التوريد والتركيب والضمان لمدة 10 سنوات على القطاعات، أو أي ملاحظات فنية أخرى..."
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300 text-right text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#0F172A] mb-2 uppercase tracking-wider flex items-center gap-1 bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-lg border border-yellow-250 inline-block">
                💰 مبلغ مضاف للملاحظة
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={notesAmount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChange('notesAmount', isNaN(val) ? 0 : val);
                  }}
                  placeholder="0 ج.م"
                  className="w-full p-2.5 bg-yellow-50/20 border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-yellow-600/40 text-right pr-3 pl-12 text-[#0F172A]"
                />
                <div className="absolute left-3 top-2.5 text-[#0F172A] font-extrabold text-xs pointer-events-none">
                  ج.م
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-extrabold mt-1.5 leading-tight">
                * قيمة مالية مضافة للملاحظة (مثال: تكاليف نقل إضافية أو أعمال زجاج خاصة بالإنشاء). اكتب رقماً سالباً للخصم الإضافي.
              </p>
            </div>
          </div>

          {/* Additional Notes Container */}
          {additionalNotes.map((note, index) => (
            <motion.div 
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative text-right"
            >
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    ملاحظة إضافية رقم {index + 2}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = additionalNotes.filter(n => n.id !== note.id);
                      onChange('additionalNotes', updated);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    حذف الملاحظة
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={note.text}
                  onChange={(e) => {
                    const updated = additionalNotes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n);
                    onChange('additionalNotes', updated);
                  }}
                  placeholder="اكتب تفاصيل الملاحظة الإضافية هنا..."
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-slate-350 text-right text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-2 uppercase tracking-wider flex items-center gap-1 bg-[#0F172A]/5 text-[#0F172A] px-2 py-0.5 rounded-lg border border-[#0F172A]/10 inline-block">
                  💰 مبلغ مضاف للملاحظة
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={note.amount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const updated = additionalNotes.map(n => n.id === note.id ? { ...n, amount: isNaN(val) ? 0 : val } : n);
                      onChange('additionalNotes', updated);
                    }}
                    placeholder="0 ج.م"
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] focus:bg-white outline-none transition-all font-bold placeholder:text-slate-350 text-right pr-3 pl-12 text-[#0F172A]"
                  />
                  <div className="absolute left-3 top-2.5 text-[#0F172A] font-extrabold text-xs pointer-events-none">
                    ج.م
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold mt-1.5 leading-tight">
                  * قيمة مالية مضافة للملاحظة. اكتب رقماً سالباً للتخفيض.
                </p>
              </div>
            </motion.div>
          ))}

          {/* Button to add another note */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                const newNote = {
                  id: Date.now().toString(),
                  text: '',
                  amount: 0
                };
                onChange('additionalNotes', [...additionalNotes, newNote]);
              }}
              className="px-5 py-2.5 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm hover:shadow transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus size={14} className="text-[#FACC15]" />
              <span>إضافة ملاحظة وتكلفة مالية أخرى</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* مربع ملخص الحساب الكلي */}
      <div className="w-full lg:w-[350px] flex-none flex flex-col gap-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 font-display">ملخص التكلفة الكلية</h3>
          <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-[#0F172A] space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-bold text-sm">إجمالي الأمتار</span>
              <span className="text-sm font-black text-[#0F172A] font-mono" dir="ltr">{calculations.totalArea.toFixed(2)} م²</span>
            </div>
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-bold text-sm">الإجمالي قبل الخصم</span>
              <span className="text-sm font-black text-slate-700 font-mono" dir="ltr">{formatCurrency(calculations.totalPrice)}</span>
            </div>

            {discountValue > 0 && (
              <div className="flex justify-between items-center pb-3 border-b border-slate-150 text-emerald-600 font-bold text-xs bg-emerald-50/40 p-2 rounded-lg">
                <span>
                  الخصم ({discountType === 'percentage' ? `${discountValue}%` : 'نقدي'})
                </span>
                <span className="font-mono font-black" dir="ltr">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {totalNotesAmount !== 0 && (
              <div className={`flex justify-between items-center pb-3 border-b border-slate-150 font-bold text-xs p-2 rounded-lg ${
                totalNotesAmount > 0 
                  ? 'bg-amber-50/70 text-amber-800 border border-amber-100'
                  : 'bg-emerald-50/40 text-emerald-800 border border-emerald-100'
              }`}>
                <span>إجمالي مبالغ الملاحظات والتكلفة الإضافية</span>
                <span className="font-mono font-black" dir="ltr">
                  {totalNotesAmount > 0 ? '+' : ''}{formatCurrency(totalNotesAmount)}
                </span>
              </div>
            )}

            <div className="text-center pt-2">
              <p className="text-xs font-bold text-slate-400 mb-1">المبلغ النهائي المطلوب</p>
              <p className="text-3xl font-black text-[#0F172A] tracking-tighter sm:text-4xl tabular-nums">
                {formatCurrency(finalPrice)}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full min-h-[44px] py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-[#FACC15] rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText size={17} className="shrink-0" />
              <span>معاينة العرض (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

