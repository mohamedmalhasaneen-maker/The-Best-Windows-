import React from 'react';
import { MapPin, Navigation, Building2, Factory, Phone, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BRAND_NAME, COMPANY_CONTACTS, COMPANY_LOCATIONS } from '../constants';

interface LocationsSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationsSelectModal: React.FC<LocationsSelectModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        />

        {/* Compact Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md max-h-[88vh] bg-[#0F172A] border-2 border-[#FACC15] text-white rounded-3xl shadow-2xl p-4 sm:p-5 z-10 flex flex-col overflow-hidden text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FACC15] text-slate-950">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">
                  الفروع والمعارض والمواقع الجغرافية
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  اختر الفرع لعرض موقعه أو الحصول على الاتجاهات مباشرة عبر Google Maps
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Locations List */}
          <div className="py-3 space-y-2.5 overflow-y-auto flex-1 pr-0.5">
            {COMPANY_LOCATIONS.map((loc, idx) => {
              const isFactory = loc.type === 'factory';
              const linkedContact = loc.contactId
                ? COMPANY_CONTACTS.find((c) => c.id === loc.contactId)
                : undefined;

              return (
                <div
                  key={loc.id}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-2xl space-y-2.5 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-[#FACC15] flex items-center justify-center shrink-0 mt-0.5">
                        {isFactory ? <Factory size={14} /> : <Building2 size={14} />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-white block">
                          {idx + 1}. {loc.name}
                        </span>
                        {loc.address ? (
                          <span className="text-[11px] font-bold text-slate-300 block mt-0.5 leading-snug">
                            {loc.address}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                            {isFactory ? 'المقر الصناعي والإنتاج' : 'موقع المعرض الرسمي على الخريطة'}
                          </span>
                        )}
                      </div>
                    </div>

                    {linkedContact && (
                      <a
                        href={linkedContact.telUrl}
                        title={`اتصال بـ ${linkedContact.name}`}
                        className="px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[#FACC15] font-mono tabular-nums text-[11px] font-bold inline-flex items-center gap-1 hover:border-[#FACC15] transition shrink-0"
                        dir="ltr"
                      >
                        <Phone size={11} />
                        <span>{linkedContact.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Direct Map & Directions Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="min-h-[38px] py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 border border-slate-600 transition active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <MapPin size={13} className="text-[#FACC15] shrink-0" />
                      <span>عرض الموقع على الخريطة</span>
                    </a>

                    <a
                      href={loc.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="min-h-[38px] py-1.5 px-2.5 bg-[#FACC15] hover:bg-[#F59E0B] text-slate-950 font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      <Navigation size={13} className="text-slate-950 shrink-0" />
                      <span>الحصول على الاتجاهات</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="pt-2.5 border-t border-slate-800 text-center shrink-0">
            <p className="text-[11px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <span>{BRAND_NAME} · الفروع والمعارض والمصنع المعتمدة</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
