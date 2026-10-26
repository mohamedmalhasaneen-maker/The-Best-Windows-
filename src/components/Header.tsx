import { useState } from 'react';
import {
  Phone,
  MapPin,
  MessageCircle,
  Settings,
  FileText,
  Save,
  Check,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import logoUrl from '../assets/images/the_best_windows_logo.jpeg';
import { ContactSelectModal } from './ContactSelectModal';
import { LocationsSelectModal } from './LocationsSelectModal';
import { BRAND_NAME, SOCIAL_CHANNELS } from '../constants';
import { renderSocialIcon, getSocialButtonStyle } from './SocialIcons';

interface HeaderProps {
  onOpenDevSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  savedQuotesCount: number;
  onOpenSavedQuotes: () => void;
  onSaveQuoteAuto: () => void;
  customersCount?: number;
  onOpenCustomers?: () => void;
  isPrimaryHeading?: boolean;
}

export default function Header({
  onOpenDevSettings,
  savedQuotesCount,
  onOpenSavedQuotes,
  onSaveQuoteAuto,
  customersCount,
  onOpenCustomers,
  isPrimaryHeading = true,
}: HeaderProps) {
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
    }, 2000);
  };

  const BrandHeadingTag = isPrimaryHeading ? 'h1' : 'div';

  return (
    <header className="bg-[#0F172A] text-white py-5 border-b-4 border-[#F59E0B] shadow-xl print:hidden">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-4 text-right">
        {/* Top Row: Brand Identity, Quick Navigation, Workspace Controls & Socials */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 text-right shrink-0"
          >
            <img
              src={logoUrl}
              alt={`${BRAND_NAME} - شبابيك وأبواب UPVC في مصر`}
              className="w-15 h-15 rounded-2xl border-2 border-[#F59E0B] object-cover shadow-md shrink-0 bg-white"
              referrerPolicy="no-referrer"
            />
            <BrandHeadingTag className="text-right m-0">
              <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none font-display text-white whitespace-nowrap block">
                {BRAND_NAME}
              </span>
              <span className="text-slate-300 text-xs mt-1.5 font-bold font-sans block">
                أبواب وشبابيك UPVC & WPC المعتمدة
              </span>
              <span className="sr-only"> - توريد وتركيب في مصر</span>
            </BrandHeadingTag>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-wrap items-center gap-2 text-right justify-start lg:justify-end"
          >
            {/* Save current Quote button */}
            <button
              type="button"
              onClick={handleAutoSave}
              disabled={justSaved}
              className={`${
                justSaved
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md whitespace-nowrap`}
              title="حفظ عرض السعر الحالي تلقائياً"
            >
              {justSaved ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>تم حفظ العرض</span>
                </>
              ) : (
                <>
                  <Save size={14} className="text-white" />
                  <span>حفظ عرض السعر</span>
                </>
              )}
            </button>

            {/* Saved Quotes trigger */}
            <button
              type="button"
              onClick={onOpenSavedQuotes}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
              title="عرض وإدارة عروض الأسعار المحفوظة"
            >
              <FileText size={14} className="text-white" />
              <span>عروض الأسعار {savedQuotesCount > 0 ? `(${savedQuotesCount})` : ''}</span>
            </button>

            {/* Registered Customers Directory Button */}
            {onOpenCustomers && (
              <button
                type="button"
                onClick={onOpenCustomers}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
                title="عرض وإدارة قائمة العملاء المسجلين"
              >
                <Users size={14} className="text-[#F59E0B]" />
                <span>
                  دليل العملاء{' '}
                  {typeof customersCount === 'number' && customersCount > 0
                    ? `(${customersCount})`
                    : ''}
                </span>
              </button>
            )}

            {/* Developer Settings Trigger Button */}
            <button
              type="button"
              onClick={onOpenDevSettings}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md group/btn whitespace-nowrap"
              title="تعديل جدول الأسعار الأساسية للمصنع"
            >
              <Settings
                size={14}
                className="text-slate-950 group-hover/btn:rotate-90 transition-transform duration-200"
              />
              <span>إعدادات المطور</span>
            </button>

            {/* Direct Phone Call Icon Button (Like Mobile System) */}
            <button
              type="button"
              onClick={() => setContactModalType('phone')}
              aria-label="أرقام الاتصال المباشر"
              title="أرقام الاتصال المباشر"
              className="bg-slate-800 hover:bg-slate-700 text-[#F59E0B] font-extrabold text-xs px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-sm"
            >
              <Phone size={15} className="text-[#F59E0B]" />
            </button>

            {/* Geographic Locations Popup Icon Button */}
            <button
              type="button"
              onClick={() => setIsLocationsModalOpen(true)}
              aria-label="المواقع الجغرافية للفروع والمصنع"
              title="المواقع الجغرافية للفروع والمصنع"
              className="bg-slate-800 hover:bg-slate-700 text-[#F59E0B] font-extrabold text-xs px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-sm"
            >
              <MapPin size={15} className="text-[#F59E0B]" />
            </button>

            {/* Green WhatsApp Modal Trigger */}
            <button
              type="button"
              onClick={() => setContactModalType('whatsapp')}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
            >
              <MessageCircle size={14} className="text-white" />
              <span>واتساب</span>
            </button>

            {/* Official Social Channels: Facebook, TikTok, Instagram */}
            <div className="flex items-center gap-1.5">
              {SOCIAL_CHANNELS.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  title={social.nameAr}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap ${getSocialButtonStyle(
                    social.id
                  )}`}
                >
                  {renderSocialIcon(social.id, 14)}
                  <span className="hidden xl:inline">{social.nameAr}</span>
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <ContactSelectModal
        isOpen={!!contactModalType}
        type={contactModalType || 'whatsapp'}
        onClose={() => setContactModalType(null)}
      />

      <LocationsSelectModal
        isOpen={isLocationsModalOpen}
        onClose={() => setIsLocationsModalOpen(false)}
      />
    </header>
  );
}
