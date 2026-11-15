import { useState } from 'react';
import {
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

export type SaveOutcomeStatus = 'cloud' | 'local-offline' | 'local-error';

export interface SaveFeedbackNotice {
  id: number;
  status: SaveOutcomeStatus;
  message: string;
}

export function PWAInstallButton() {
  const { canInstall, hasNativePrompt, isIos, isStandalone, promptInstall } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isStandalone || !canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-[#FACC15] font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
        title="تثبيت التطبيق للعمل على الهاتف والكمبيوتر بدون إنترنت"
      >
        <Download size={14} className="text-[#FACC15]" />
        <span>تثبيت التطبيق</span>
      </button>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          dir="rtl"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="bg-white text-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-[#0F172A]">
                <Download size={18} className="text-[#F59E0B]" />
                <span>تثبيت التطبيق على iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="space-y-3 text-xs font-bold text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 font-mono font-black">
                  1
                </span>
                <span className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  اضغط على زر المشاركة
                  <Share size={15} className="text-sky-600 inline shrink-0" />
                  في أسفل متصفح Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 font-mono font-black">
                  2
                </span>
                <span className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  اختر
                  <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-black text-slate-900">
                    <PlusSquare size={13} />
                    إضافة إلى الشاشة الرئيسية
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-[#FACC15] flex items-center justify-center shrink-0 font-mono font-black">
                  3
                </span>
                <span className="pt-0.5">اضغط «إضافة» لفتح التطبيق مباشرة والعمل بدون إنترنت.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-black text-white rounded-xl font-black text-xs cursor-pointer transition"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface ConnectionSyncBadgeProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  onSyncNow?: () => void;
}

export function ConnectionSyncBadge({
  isOnline,
  isSyncing,
  pendingSyncCount,
  onSyncNow,
}: ConnectionSyncBadgeProps) {
  if (!isOnline) {
    return (
      <div
        className="bg-amber-500/15 border border-amber-400/40 text-amber-200 font-extrabold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap"
        title="وضع عدم الاتصال: يتم حفظ التعديلات محلياً وستُرفع تلقائياً عند عودة الإنترنت"
      >
        <WifiOff size={13} className="text-amber-300 shrink-0" />
        <span>غير متصل</span>
        {pendingSyncCount > 0 && (
          <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black">
            {pendingSyncCount} قيد الانتظار
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-sky-500/15 border border-sky-400/40 text-sky-200 font-extrabold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
        <RefreshCw size={13} className="animate-spin text-sky-300 shrink-0" />
        <span>جاري المزامنة...</span>
      </div>
    );
  }

  if (pendingSyncCount > 0) {
    return (
      <button
        type="button"
        onClick={onSyncNow}
        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-extrabold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
        title="اضغط لمزامنة التعديلات المحلية مع السحابة الآن"
      >
        <RefreshCw size={13} className="text-amber-300 shrink-0" />
        <span>مزامنة ({pendingSyncCount})</span>
      </button>
    );
  }

  return (
    <div
      className="bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 font-extrabold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap"
      title="متصل بالإنترنت ومحدّث مع السحابة"
    >
      <Wifi size={13} className="text-emerald-400 shrink-0" />
      <span>متصل</span>
    </div>
  );
}

export function SaveFeedbackToast({
  notice,
  onDismiss,
}: {
  notice: SaveFeedbackNotice | null;
  onDismiss: () => void;
}) {
  if (!notice) return null;

  const isCloud = notice.status === 'cloud';
  const isOffline = notice.status === 'local-offline';

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 print:hidden"
    >
      <div
        className={`rounded-2xl border-2 px-4 py-3 shadow-2xl flex items-center justify-between gap-3 text-xs font-black ${
          isCloud
            ? 'bg-emerald-950 text-emerald-100 border-emerald-500'
            : isOffline
            ? 'bg-amber-950 text-amber-100 border-amber-500'
            : 'bg-slate-900 text-amber-200 border-amber-400'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isCloud ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <HardDrive size={18} className="text-amber-400 shrink-0" />
          )}
          <span className="leading-snug">{notice.message}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white shrink-0 cursor-pointer"
          aria-label="إغلاق التنبيه"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
