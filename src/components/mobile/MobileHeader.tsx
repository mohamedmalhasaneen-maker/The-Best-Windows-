import React, { useState } from 'react';
import {
  Menu,
  X,
  Phone,
  Settings,
  QrCode,
  Sun,
  Moon,
  Save,
  Check,
  MessageCircle,
  FileText,
  Users,
  ShieldCheck,
  ChevronLeft,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import logoUrl from '../../assets/images/the_best_windows_logo.jpeg';
import { ContactSelectModal } from '../ContactSelectModal';
import { LocationsSelectModal } from '../LocationsSelectModal';
import { BRAND_NAME, COMPANY_CONTACTS, SOCIAL_CHANNELS } from '../../constants';
import { renderSocialIcon, getSocialButtonStyle } from '../SocialIcons';

interface MobileHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  savedQuotesCount: number;
  customersCount: number;
  onOpenSavedQuotes: () => void;
  onOpenCustomers: () => void;
  onOpenDevSettings: () => void;
  onOpenQr: () => void;
  onSaveQuoteAuto: () => void;
  onNavigateToSection?: (sectionId: string) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  theme,
  onToggleTheme,
  savedQuotesCount,
  customersCount,
  onOpenSavedQuotes,
  onOpenCustomers,
  onOpenDevSettings,
  onOpenQr,
  onSaveQuoteAuto,
  onNavigateToSection,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [contactModalType, setContactModalType] = useState<'phone' | 'whatsapp' | 'all' | null>(
    null
  );
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);

  const handleAutoSave = () => {
    onSaveQuoteAuto();
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
    }, 2200);
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#0F172A] text-white border-b-2 border-[#F59E0B] shadow-md px-3 py-2.5 print:hidden">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoUrl}
              alt={`${BRAND_NAME} Logo`}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl border border-[#F59E0B] object-cover shadow-sm shrink-0 bg-white"
            />
            <div className="min-w-0">
              <span className="font-black text-sm text-white font-display tracking-tight truncate block">
                {BRAND_NAME}
              </span>
              <p className="text-slate-300 text-[10px] font-bold truncate">
                أبواب وشبابيك UPVC & WPC
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Auto Save Button */}
            <button
              type="button"
              onClick={handleAutoSave}
              disabled={justSaved}
              className={`p-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                justSaved
                  ? 'bg-teal-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
              title="حفظ تلقائي"
            >
              {justSaved ? <Check size={16} /> : <Save size={16} />}
            </button>

            {/* Quick WhatsApp Link Button */}
            <button
              type="button"
              onClick={() => setContactModalType('whatsapp')}
              className="p-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl transition active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
              title="تواصل عبر واتساب"
            >
              <MessageCircle size={16} />
            </button>

            {/* Direct Phone Call Button */}
            <button
              type="button"
              onClick={() => setContactModalType('phone')}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-[#F59E0B] rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
              title="اتصال بالمبيعات"
            >
              <Phone size={16} />
            </button>

            {/* Drawer Menu Trigger */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2.5 bg-[#F59E0B] text-slate-950 rounded-xl font-black transition active:scale-95 shadow-sm cursor-pointer"
              title="القائمة"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-Over Drawer Menu */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end print:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-xs bg-[#0F172A] text-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto"
              dir="rtl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt={`${BRAND_NAME} Logo`}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl border border-[#F59E0B] object-cover bg-white"
                  />
                  <div>
                    <h3 className="font-black text-sm text-white">{BRAND_NAME}</h3>
                    <p className="text-[11px] text-[#F59E0B] font-bold">
                      أبواب وشبابيك UPVC & WPC
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body Items */}
              <div className="p-4 space-y-4 flex-1">
                {/* Theme Toggle */}
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-300">مظهر التطبيق:</span>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun size={14} className="text-[#F59E0B]" />
                        <span>مظهر فاتح</span>
                      </>
                    ) : (
                      <>
                        <Moon size={14} className="text-amber-300" />
                        <span>مظهر داكن</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick App & Navigation Actions */}
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 px-1">
                    قوائم النظام والفروع
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsLocationsModalOpen(true);
                    }}
                    className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 text-white rounded-2xl font-black text-xs flex items-center justify-between border border-slate-700/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={16} className="text-[#F59E0B]" />
                      <span>فروعنا ومعارضنا ومصنعنا</span>
                    </div>
                    <ChevronLeft size={14} className="text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setContactModalType('all');
                    }}
                    className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 text-white rounded-2xl font-black text-xs flex items-center justify-between border border-slate-700/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone size={16} className="text-emerald-400" />
                      <span>أرقام التواصل ومسؤولو المبيعات</span>
                    </div>
                    <ChevronLeft size={14} className="text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenSavedQuotes();
                    }}
                    className="w-full p-3 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-200 rounded-2xl font-black text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-indigo-400" />
                      <span>عروض الأسعار المحفوظة</span>
                    </div>
                    <span className="bg-indigo-500 text-white text-[11px] font-mono tabular-nums font-extrabold px-2 py-0.5 rounded-lg">
                      {savedQuotesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenCustomers();
                    }}
                    className="w-full p-3 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-200 rounded-2xl font-black text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={16} className="text-emerald-400" />
                      <span>دليل العملاء المسجلين</span>
                    </div>
                    <span className="bg-emerald-500 text-white text-[11px] font-mono tabular-nums font-extrabold px-2 py-0.5 rounded-lg">
                      {customersCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenDevSettings();
                    }}
                    className="w-full p-3 bg-[#F59E0B]/15 border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 text-amber-200 rounded-2xl font-black text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings size={16} className="text-[#F59E0B]" />
                      <span>إعدادات المطور والمشرف</span>
                    </div>
                    <ChevronLeft size={14} className="text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenQr();
                    }}
                    className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-slate-700/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <QrCode size={16} className="text-teal-400" />
                      <span>رمز الاستجابة السريعة (QR)</span>
                    </div>
                    <ChevronLeft size={14} className="text-slate-500" />
                  </button>
                </div>

                {/* Official Social Media Channels: Facebook, TikTok, Instagram */}
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-black text-slate-400 px-1">
                    صفحاتنا الرسمية على التواصل الاجتماعي
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {SOCIAL_CHANNELS.map((social) => (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-h-[42px] p-2.5 rounded-xl text-center font-bold text-[11px] flex flex-col items-center justify-center gap-1 active:scale-95 shadow-sm ${getSocialButtonStyle(
                          social.id
                        )}`}
                      >
                        {renderSocialIcon(social.id, 16)}
                        <span>{social.nameAr}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* All 4 Official Sales & Branch Contacts in Exact Order */}
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-black text-slate-400 px-1">
                    مسؤولو التواصل والفروع والمبيعات
                  </p>
                  <div className="space-y-2">
                    {COMPANY_CONTACTS.map((contact, idx) => (
                      <div
                        key={contact.id}
                        className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/70 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-white block">
                              {idx + 1}. {contact.name}
                            </span>
                            {contact.role && (
                              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                                {contact.role}
                              </span>
                            )}
                          </div>
                          <span
                            className="font-mono tabular-nums text-xs font-black text-[#FACC15]"
                            dir="ltr"
                          >
                            {contact.phone}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={contact.telUrl}
                            className="min-h-[38px] py-1.5 px-2.5 bg-slate-900 hover:bg-slate-950 text-[#FACC15] rounded-xl text-[11px] font-black flex items-center justify-center gap-1 border border-slate-700"
                          >
                            <Phone size={12} />
                            <span>اتصال</span>
                          </a>
                          <a
                            href={contact.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] py-1.5 px-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1"
                          >
                            <MessageCircle size={12} />
                            <span>واتساب</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-center shrink-0">
                <p className="text-[10px] font-extrabold text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>{BRAND_NAME} · خامات معتمدة وتركيب احترافي</span>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selection Modals */}
      <ContactSelectModal
        isOpen={!!contactModalType}
        type={contactModalType || 'phone'}
        onClose={() => setContactModalType(null)}
      />
      <LocationsSelectModal
        isOpen={isLocationsModalOpen}
        onClose={() => setIsLocationsModalOpen(false)}
      />
    </>
  );
};
