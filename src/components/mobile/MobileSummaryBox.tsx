import React from 'react';
import { 
  Calculator, 
  Coins, 
  Percent, 
  BadgePercent, 
  FileText, 
  Save, 
  Sparkles, 
  NotebookPen 
} from 'lucide-react';
import { CalculationResult, CustomerInfo } from '../../types';

interface MobileSummaryBoxProps {
  calculations: CalculationResult;
  customer: CustomerInfo;
  onChange: (field: keyof CustomerInfo, value: any) => void;
  formatCurrency: (value: number) => string;
  handlePrint: () => void;
  onSaveQuoteAuto: () => void;
}

export const MobileSummaryBox: React.FC<MobileSummaryBoxProps> = ({
  calculations,
  customer,
  onChange,
  formatCurrency,
  handlePrint,
  onSaveQuoteAuto
}) => {
  const discountType = customer.discountType || 'cash';
  const discountValue = customer.discountValue || 0;

  const rawTotal = calculations.totalPrice;
  const discountAmt = discountType === 'percentage' 
    ? rawTotal * (discountValue / 100) 
    : discountValue;

  const notesAmount = customer.notesAmount || 0;
  const additionalNotesSum = customer.additionalNotes?.reduce((sum, n) => sum + (n.amount || 0), 0) || 0;
  const totalNotesAmount = notesAmount + additionalNotesSum;

  const finalTotal = Math.max(0, rawTotal - discountAmt + totalNotesAmount);

  return (
    <div className="bg-[#0F172A] text-white rounded-2xl p-4 shadow-lg border-2 border-[#FACC15] space-y-4 text-right" dir="rtl">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#FACC15]" />
          <span className="font-black text-sm text-[#FACC15]">إجمالي تكلفة العرض والتخفيضات</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
          إجمالي المساحة: {calculations.totalArea.toFixed(2)} م²
        </span>
      </div>

      {/* Discount Selector */}
      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-300 flex items-center gap-1">
            <BadgePercent size={14} className="text-[#FACC15]" />
            <span>تطبيق خصم إضافي:</span>
          </span>
          <div className="flex gap-1 bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => onChange('discountType', 'cash')}
              className={`px-2.5 py-1 text-[11px] font-black rounded-md transition ${
                discountType === 'cash'
                  ? 'bg-[#FACC15] text-[#0F172A]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              خصم نقدي (ج.م)
            </button>
            <button
              type="button"
              onClick={() => onChange('discountType', 'percentage')}
              className={`px-2.5 py-1 text-[11px] font-black rounded-md transition ${
                discountType === 'percentage'
                  ? 'bg-[#FACC15] text-[#0F172A]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              خصم نسبة (%)
            </button>
          </div>
        </div>

        {/* Discount Value Input */}
        <div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max={discountType === 'percentage' ? 100 : undefined}
            value={discountValue || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange('discountValue', isNaN(val) ? 0 : val);
            }}
            placeholder={discountType === 'percentage' ? 'مثال: 5%' : 'أدخل قيمة الخصم بالجنية'}
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-xs text-white outline-none focus:border-[#FACC15]"
          />
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-1.5 text-xs font-bold text-slate-300 pt-1 border-t border-slate-800">
        <div className="flex justify-between">
          <span>الإجمالي المبدئي (قبل الخصم):</span>
          <span className="font-mono">{formatCurrency(rawTotal)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-emerald-400 font-extrabold">
            <span>قيمة الخصم المخصوم:</span>
            <span className="font-mono">-{formatCurrency(discountAmt)}</span>
          </div>
        )}
        {totalNotesAmount > 0 && (
          <div className="flex justify-between text-amber-300">
            <span>إضافات وملاحظات إضافية:</span>
            <span className="font-mono">+{formatCurrency(totalNotesAmount)}</span>
          </div>
        )}
      </div>

      {/* Final Net Cost Display */}
      <div className="bg-[#0F172A] p-3 rounded-xl border-2 border-[#FACC15] flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-black">الصافي الإجمالي النهائي:</p>
          <p className="text-xl font-black font-mono text-[#FACC15]">
            {formatCurrency(finalTotal)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaveQuoteAuto}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
          >
            <Save size={14} />
            <span>حفظ</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[#FACC15] hover:bg-amber-400 text-[#0F172A] rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
          >
            <FileText size={14} />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
