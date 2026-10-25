import React from 'react';
import { Phone, MessageCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BRAND_NAME, COMPANY_CONTACTS } from '../constants';

interface ContactSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'phone' | 'whatsapp' | 'all';
}

export const ContactSelectModal: React.FC<ContactSelectModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen) return null;

  const isWhatsApp = type === 'whatsapp';
  const isPhone = type === 'phone';

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

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-sm max-h-[88vh] bg-[#0F172A] border-2 border-[#FACC15] text-white rounded-3xl shadow-2xl p-4 sm:p-5 z-10 flex flex-col overflow-hidden text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isWhatsApp
                    ? 'bg-[#25D366] text-white'
                    : 'bg-[#FACC15] text-slate-950'
                }`}
              >
                {isWhatsApp ? <MessageCircle size={18} /> : <Phone size={18} />}
              </div>
              <div>
                <h3 className="font-black text-sm text-white">
                  {isWhatsApp
                    ? 'اختر المسؤول للمراسلة عبر واتساب'
                    : isPhone
                    ? 'أرقام الاتصال المباشر'
                    : 'مسؤولو التواصل والمبيعات'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {isWhatsApp
                    ? 'انقر لفتح محادثة واتساب مباشرة'
                    : 'انقر على الرقم للاتصال الهاتفي المباشر'}
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

          {/* Contact Numbers Options (Exact Order 1..4) */}
          <div className="py-3 space-y-2.5 overflow-y-auto flex-1 pr-0.5">
            {COMPANY_CONTACTS.map((contact, idx) => (
              <div
                key={contact.id}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-2xl space-y-2 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-white block">
                      {idx + 1}. {contact.name}
                    </span>
                    {contact.role && (
                      <span className="text-[10px] font-bold text-slate-300 block mt-0.5">
                        {contact.role}
                      </span>
                    )}
                  </div>
                  <a
                    href={contact.telUrl}
                    className="font-mono tabular-nums text-xs sm:text-sm font-black text-[#FACC15] hover:underline shrink-0"
                    dir="ltr"
                  >
                    {contact.phone}
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {(isPhone || type === 'all') && (
                    <a
                      href={contact.telUrl}
                      onClick={onClose}
                      className="min-h-[38px] flex-1 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-[#FACC15] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-600 transition active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Phone size={13} />
                      <span>اتصال {contact.phone}</span>
                    </a>
                  )}

                  {(isWhatsApp || type === 'all') && (
                    <a
                      href={contact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="min-h-[38px] flex-1 py-1.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      <MessageCircle size={13} />
                      <span>واتساب {contact.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="pt-2.5 border-t border-slate-800 text-center shrink-0">
            <p className="text-[11px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <span>{BRAND_NAME} · خدمة العملاء والمبيعات متواجدة لخدمتكم</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
