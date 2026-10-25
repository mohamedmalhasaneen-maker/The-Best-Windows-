import React from 'react';
import { 
  Calculator, 
  FileText, 
  Plus 
} from 'lucide-react';

interface MobileBottomBarProps {
  activeMainTab: 'input' | 'quote';
  setActiveMainTab: (tab: 'input' | 'quote') => void;
  savedQuotesCount?: number;
  customersCount?: number;
  onOpenSavedQuotes?: () => void;
  onOpenCustomers?: () => void;
  onAddNewItem: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeMainTab,
  setActiveMainTab,
  onAddNewItem
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] print:hidden">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1 text-center">
        {/* Tab 1: Calculator / Input */}
        <button
          type="button"
          onClick={() => setActiveMainTab('input')}
          className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'input'
              ? 'text-[#0F172A] font-black bg-slate-100'
              : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <Calculator size={20} className={activeMainTab === 'input' ? 'text-[#0F172A]' : 'text-slate-400'} />
          <span className="text-xs mt-0.5 leading-tight">الحاسبة</span>
        </button>

        {/* Primary Action Button: Add Item */}
        <div className="-mt-5 shrink-0 px-2">
          <button
            type="button"
            onClick={onAddNewItem}
            className="w-13 h-13 bg-[#0F172A] hover:bg-black text-[#FACC15] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/30 active:scale-90 transition-all cursor-pointer border-2 border-[#FACC15]"
            title="إضافة بند جديد"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab 2: PDF Quote View */}
        <button
          type="button"
          onClick={() => setActiveMainTab('quote')}
          className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'quote'
              ? 'text-[#0F172A] font-black bg-slate-100'
              : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <FileText size={20} className={activeMainTab === 'quote' ? 'text-[#0F172A]' : 'text-slate-400'} />
          <span className="text-xs mt-0.5 leading-tight">معاينة العرض</span>
        </button>
      </div>
    </nav>
  );
};
