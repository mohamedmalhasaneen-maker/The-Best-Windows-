import React from 'react';
import { AnimatePresence } from 'motion/react';
import {
  QuoteItem,
  CalculatedItem,
  CalculationResult,
  CustomerInfo,
  Profile,
  Addon,
  SavedQuote,
  SavedCustomer,
} from '../../types';

import { MobileHeader } from './MobileHeader';
import { MobileBottomBar } from './MobileBottomBar';
import { MobileItemCard } from './MobileItemCard';
import { MobileCustomerForm } from './MobileCustomerForm';
import { MobileSummaryBox } from './MobileSummaryBox';
import DetailedQuoteView from '../DetailedQuoteView';
import PricingTable from '../PricingTable';
import Features from '../Features';
import { CompanyFooter } from '../CompanySections';

interface MobileViewProps {
  customer: CustomerInfo;
  items: QuoteItem[];
  calculations: CalculationResult;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  savedQuotes: SavedQuote[];
  savedCustomers: SavedCustomer[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  handleCustomerChange: (field: keyof CustomerInfo, value: any) => void;
  updateItem: (id: number, field: string, value: any) => void;
  removeItem: (id: number) => void;
  addNewItem: () => void;
  toggleAddon: (itemId: number, addonId: string) => void;
  handleSaveQuoteAuto: () => void;
  handleSaveCurrentQuote: (name: string) => void;
  onOpenDevSettings: () => void;
  onOpenSavedQuotes: () => void;
  onOpenCustomers: () => void;
  onOpenQr: () => void;
  handlePrint: () => void;
  activeMainTab: 'input' | 'quote';
  setActiveMainTab: (tab: 'input' | 'quote') => void;
  formatCurrency: (value: number) => string;
  handleSelectCustomer: (c: SavedCustomer) => void;
  handleSaveCustomerFromForm: () => Promise<void>;
  onDuplicateItem?: (item: CalculatedItem) => void;
  isPrimaryHeading?: boolean;
}

export const MobileView: React.FC<MobileViewProps> = ({
  customer,
  calculations,
  profiles,
  addons,
  savedQuotes,
  savedCustomers,
  theme,
  onToggleTheme,
  handleCustomerChange,
  updateItem,
  removeItem,
  addNewItem,
  toggleAddon,
  handleSaveQuoteAuto,
  onOpenDevSettings,
  onOpenSavedQuotes,
  onOpenCustomers,
  onOpenQr,
  handlePrint,
  activeMainTab,
  setActiveMainTab,
  formatCurrency,
  handleSelectCustomer,
  handleSaveCustomerFromForm,
  onDuplicateItem,
  isPrimaryHeading = false,
}) => {
  const handleNavigateToSection = (sectionId: string) => {
    setActiveMainTab('input');
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  React.useEffect(() => {
    if (activeMainTab === 'quote') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeMainTab]);

  return (
    <div
      className="block md:hidden min-h-screen bg-[#F8F9FA] text-[#1A1A1A] pb-24 font-sans print:hidden select-none"
      dir="rtl"
    >
      {/* Mobile Header Top App Bar */}
      <MobileHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        savedQuotesCount={savedQuotes.length}
        customersCount={savedCustomers.length}
        onOpenSavedQuotes={onOpenSavedQuotes}
        onOpenCustomers={onOpenCustomers}
        onOpenDevSettings={onOpenDevSettings}
        onOpenQr={onOpenQr}
        onSaveQuoteAuto={handleSaveQuoteAuto}
        onNavigateToSection={handleNavigateToSection}
        isPrimaryHeading={isPrimaryHeading}
      />

      {/* Main Container */}
      <main className={activeMainTab === 'quote' ? 'px-2 py-2.5' : 'px-3 py-4 space-y-4'}>
        {activeMainTab === 'input' ? (
          <div className="space-y-4">
            {/* Guide Accordion Table */}
            <PricingTable profiles={profiles} addons={addons} />

            {/* Customer Details Form */}
            <MobileCustomerForm
              customer={customer}
              onChange={handleCustomerChange}
              savedCustomers={savedCustomers}
              onOpenCustomersModal={onOpenCustomers}
              onSaveCustomerToDirectory={handleSaveCustomerFromForm}
              onSelectCustomer={handleSelectCustomer}
            />

            {/* Items Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="bg-[#0F172A] text-[#FACC15] text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                  {calculations.itemsCalculated.length} بنود
                </span>
                <span className="font-black text-sm text-[#0F172A]">بنود الشباك والأبواب</span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {calculations.itemsCalculated.map((item, index) => (
                  <MobileItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    toggleAddon={toggleAddon}
                    formatCurrency={formatCurrency}
                    profiles={profiles}
                    addons={addons}
                    onDuplicateItem={onDuplicateItem}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Summary Box */}
            <MobileSummaryBox
              calculations={calculations}
              customer={customer}
              onChange={handleCustomerChange}
              formatCurrency={formatCurrency}
              handlePrint={handlePrint}
              onSaveQuoteAuto={handleSaveQuoteAuto}
            />

            {/* Features & Unified Footer */}
            <div className="pt-2">
              <Features />
              <CompanyFooter onOpenQr={onOpenQr} compact />
            </div>
          </div>
        ) : (
          <DetailedQuoteView
            customer={customer}
            calculations={calculations}
            formatCurrency={formatCurrency}
            profiles={profiles}
            addons={addons}
            isMobileViewport
          />
        )}
      </main>

      {/* Sticky Bottom Thumb Navigation Bar */}
      <MobileBottomBar
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        savedQuotesCount={savedQuotes.length}
        customersCount={savedCustomers.length}
        onOpenSavedQuotes={onOpenSavedQuotes}
        onOpenCustomers={onOpenCustomers}
        onAddNewItem={addNewItem}
      />
    </div>
  );
};
