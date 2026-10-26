import { motion } from 'motion/react';
import { X, ExternalLink, QrCode } from 'lucide-react';
import { BRAND_NAME, SOCIAL_CHANNELS } from '../constants';
import { renderSocialIcon, getSocialButtonStyle } from './SocialIcons';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QrModal({ isOpen, onClose }: QrModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col text-right scrollbar-thin"
        dir="rtl"
      >
        <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 shrink-0" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-[#0F172A] text-white sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCode size={22} className="text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight font-display text-white">
                رموز الاستجابة السريعة (QR) وروابط التواصل
              </h3>
              <p className="text-xs text-slate-300">
                امسح الرمز بكاميرا هاتفك لفتح صفحات {BRAND_NAME} الرسمية مباشرة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h4 className="text-slate-900 font-black text-base mb-1">{BRAND_NAME}</h4>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              تصفح منصاتنا الرسمية عبر مسح رمز QR أو الضغط المباشر، أو تواصل هاتفياً مع مسؤولي الفروع والمبيعات.
            </p>
          </div>

          {/* 3 Official Social Platforms QR Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SOCIAL_CHANNELS.map((social) => {
              const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                social.url
              )}`;

              return (
                <div
                  key={social.id}
                  className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 justify-between gap-3"
                >
                  <div className="flex items-center gap-1.5 text-slate-900 font-black text-sm">
                    {renderSocialIcon(social.id, 16)}
                    <span>{social.nameAr}</span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                    <img
                      src={qrImgUrl}
                      alt={`${social.name} QR Code`}
                      className="w-32 h-32 object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full min-h-[40px] text-center py-2 px-3 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${getSocialButtonStyle(
                      social.id
                    )}`}
                  >
                    <span>فتح {social.nameAr}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] font-bold text-slate-500">
            © {new Date().getFullYear()} {BRAND_NAME}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-200 hover:bg-[#0F172A] hover:text-white text-slate-900 text-xs font-black rounded-xl transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  );
}
