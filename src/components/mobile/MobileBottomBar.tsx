import React from 'react';
import { 
  Calculator, 
  DoorClosed, 
  FileText, 
  Plus 
} from 'lucide-react';

interface MobileBottomBarProps {
  activeMainTab: 'input' | 'wpc' | 'quote';
  setActiveMainTab: (tab: 'input' | 'wpc' | 'quote') => void;
  savedQuotesCount?: number;
  customersCount?: number;
  wpcDoorsCount?: number;
  onOpenSavedQuotes?: () => void;
  onOpenCustomers?: () => void;
  onAddNewItem: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeMainTab,
  setActiveMainTab,
  wpcDoorsCount = 0,
  onAddNewItem,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] print:hidden">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1 text-center">
        {/* Tab 1: Calculator / Input */}
        <button
          type="button"
          onClick={() => setActiveMainTab('input')}
          className={`flex-1 flex flex-col items-center py-2 px-1.5 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'input'
              ? 'text-[#0F172A] font-black bg-slate-100'
              : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <Calculator size={19} className={activeMainTab === 'input' ? 'text-[#0F172A]' : 'text-slate-400'} />
          <span className="text-[11px] mt-0.5 leading-tight font-display">حساب البنود</span>
        </button>

        {/* Tab 2: WPC Doors */}
        <button
          type="button"
          onClick={() => setActiveMainTab('wpc')}
          className={`flex-1 flex flex-col items-center py-2 px-1.5 rounded-xl transition-all cursor-pointer relative ${
            activeMainTab === 'wpc'
              ? 'text-[#0F172A] font-black bg-slate-100'
              : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <DoorClosed size={19} className={activeMainTab === 'wpc' ? 'text-[#0F172A]' : 'text-slate-400'} />
            {wpcDoorsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white font-mono font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {wpcDoorsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-tight font-display">أبواب WPC</span>
        </button>

        {/* Primary Action Button: Add UPVC Item */}
        <div className="-mt-5 shrink-0 px-1">
          <button
            type="button"
            onClick={onAddNewItem}
            className="w-12 h-12 bg-[#0F172A] hover:bg-black text-[#FACC15] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/30 active:scale-90 transition-all cursor-pointer border-2 border-[#FACC15]"
            title="إضافة بند شباك جديد"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab 3: PDF Quote View */}
        <button
          type="button"
          onClick={() => setActiveMainTab('quote')}
          className={`flex-1 flex flex-col items-center py-2 px-1.5 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'quote'
              ? 'text-[#0F172A] font-black bg-slate-100'
              : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <FileText size={19} className={activeMainTab === 'quote' ? 'text-[#0F172A]' : 'text-slate-400'} />
          <span className="text-[11px] mt-0.5 leading-tight font-display">معاينة العرض</span>
        </button>
      </div>
    </nav>
  );
};
