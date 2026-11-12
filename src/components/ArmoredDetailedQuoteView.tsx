import React from 'react';
import { CustomerInfo, ArmoredDoorItem } from '../types';
import {
  Download,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
  Printer,
  Save,
  Check,
  Truck,
} from 'lucide-react';
import logoUrl from '../assets/images/the_best_windows_logo.jpeg';
import { BRAND_NAME, COMPANY_LOCATIONS } from '../constants';
import {
  A4_WIDTH,
  A4_HEIGHT,
  PdfGenerationProgress,
  generateQuotePdfBlob,
  triggerPdfBlobDownload,
  preloadLogoDataUrl,
  getCachedLogoSrc,
  warmUpPdfAssets,
  nextPaintFrame,
} from '../utils/pdfExportEngine';
import {
  ARMORED_INCLUSION_NOTE,
  ARMORED_EXCLUSION_NOTE,
  ARMORED_PDF_INCLUSION_BANNER,
  getArmoredDoorProductName,
  calculateArmoredQuoteTotal,
} from '../constants/armoredConstants';
import {
  ArmoredQuotePageDescriptor,
  paginateArmoredQuoteIntoPages,
} from '../utils/armoredPagination';

interface ArmoredDetailedQuoteViewProps {
  customer: CustomerInfo;
  armoredDoors: ArmoredDoorItem[];
  formatCurrency: (value: number) => string;
  isMobileViewport?: boolean;
  onBack?: () => void;
  onSaveQuoteAuto?: () => void;
}

void preloadLogoDataUrl(logoUrl);

const BRANCHES_FOOTER_LINE = COMPANY_LOCATIONS.map((l) => l.name).join(' · ');
const CURRENT_YEAR = new Date().getFullYear();

const ArmoredA4PageSheet = React.memo(function ArmoredA4PageSheet({
  page,
  totalPages,
  customer,
  formatCurrency,
  quoteNumber,
  armoredTotalPrice,
  totalQuantity,
  transportInclusionMode,
  logoSrc,
  exportMarker,
}: {
  page: ArmoredQuotePageDescriptor;
  totalPages: number;
  customer: CustomerInfo;
  formatCurrency: (value: number) => string;
  quoteNumber: string;
  armoredTotalPrice: number;
  totalQuantity: number;
  transportInclusionMode: 'all' | 'none' | 'partial';
  logoSrc: string;
  exportMarker?: boolean;
}) {
  const quoteDate = customer.date || new Date().toISOString().split('T')[0];
  const inclusionSummaryText =
    transportInclusionMode === 'all'
      ? ARMORED_PDF_INCLUSION_BANNER
      : transportInclusionMode === 'none'
      ? `جميع الأسعار ${ARMORED_EXCLUSION_NOTE}`
      : 'تُطبق شروط النقل والتركيب حسب الموضح أمام كل بند بالجدول';

  const rowHeightPx = page.equalRowHeightPx;
  const fontTitleSizeClass = 'text-[11.5px]';
  const fontCellSizeClass = 'text-[10.5px]';

  return (
    <div
      data-export-page={exportMarker ? String(page.pageNumber) : undefined}
      dir="rtl"
      className="a4-paper-lock bg-white text-slate-900 box-border flex flex-col justify-between select-none overflow-hidden"
      style={{
        width: `${A4_WIDTH}px`,
        height: `${A4_HEIGHT}px`,
        padding: '24px 28px',
      }}
    >
      <div className="flex-1 flex flex-col justify-start min-h-0 space-y-3">
        {/* Header */}
        {page.isFirstPage ? (
          <div className="flex flex-row justify-between items-stretch gap-5 pb-2.5 border-b-2 border-slate-900 shrink-0">
            <div className="flex flex-col justify-between text-right flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={`${BRAND_NAME} - عرض أسعار أبواب مصفحة`}
                  decoding="sync"
                  className="w-14 h-14 rounded-2xl border-2 border-[#0F172A] object-cover bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-[24px] leading-tight font-black font-display text-[#0F172A] tracking-tight">
                    {BRAND_NAME}
                  </div>
                  <p className="text-slate-700 font-black text-[12px] mt-0.5">
                    عرض أسعار أبواب مصفحة · {inclusionSummaryText}
                  </p>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-4 text-[11px] text-slate-600 font-bold tabular-nums">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">تاريخ العرض:</span>
                  <span className="font-mono text-slate-900" dir="ltr">
                    {quoteDate}
                  </span>
                </div>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">رقم العرض المعتمد:</span>
                  <span className="font-mono text-slate-900 font-extrabold" dir="ltr">
                    {quoteNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 w-[300px] space-y-1 text-right shrink-0 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h3 className="text-[10.5px] font-black text-slate-800">
                  بيانات العميل (عرض أبواب مصفحة)
                </h3>
                <span className="bg-[#0F172A] text-[#FACC15] text-[9px] font-black px-1.5 py-0.5 rounded">
                  معتمد رسمي
                </span>
              </div>
              <div className="space-y-0.5 text-[11px]">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 shrink-0 font-bold">اسم العميل:</span>
                  <span className="font-black text-slate-900 truncate">
                    {customer.name || `عميل ${BRAND_NAME} الموقر`}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 shrink-0 font-bold">رقم الهاتف:</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums" dir="ltr">
                    {customer.phone || 'لم يحدد'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 shrink-0 font-bold">موقع التركيب:</span>
                  <span className="font-bold text-slate-900 truncate">
                    {customer.address || 'بناءً على عنوان التركيب المتفق عليه'}
                  </span>
                </div>
                {customer.deliveryDate && (
                  <div className="flex items-start justify-between gap-2 border-t border-dashed border-slate-200 pt-0.5">
                    <span className="text-slate-500 shrink-0 font-bold">تاريخ التسليم:</span>
                    <span className="font-black text-[#0F172A] font-mono tabular-nums" dir="ltr">
                      {customer.deliveryDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-between gap-4 pb-2 border-b-2 border-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <img
                src={logoSrc}
                alt={`${BRAND_NAME} Logo`}
                decoding="sync"
                className="w-7 h-7 rounded-lg border border-[#0F172A] object-cover bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-right">
                <div className="text-xs font-black font-display text-[#0F172A] leading-tight">{BRAND_NAME}</div>
                <div className="text-[9.5px] font-bold text-slate-500">تابع عرض أسعار أبواب مصفحة</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10.5px] font-bold text-slate-600 tabular-nums">
              <span>العميل: {customer.name || `عميل ${BRAND_NAME}`}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-slate-900" dir="ltr">{quoteNumber}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-900">صفحة {page.pageNumber} من {totalPages}</span>
            </div>
          </div>
        )}

        {/* Armored Doors Items Table — ENDS IMMEDIATELY AFTER LAST ACTUAL ITEM */}
        {page.armoredDoors.length > 0 && (
          <div className="border-[1.5px] border-slate-900 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
            <div className="bg-[#0F172A] text-white px-3 py-1.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                <span className="font-display font-black text-xs text-[#FACC15]">
                  عرض أسعار أبواب مصفحة — جدول التفاصيل والمواصفات
                </span>
              </div>
              <span className="text-[9.5px] text-slate-300 font-bold">
                {page.armoredDoors.length} {page.armoredDoors.length === 1 ? 'بند' : 'بنود'}
              </span>
            </div>

            <table className="w-full table-fixed border-collapse text-right">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-black text-[9.5px] h-[28px]">
                  <th className="px-1 text-center w-[34px] border-l border-slate-200">م</th>
                  <th className="px-2 w-[250px] border-l border-slate-200">المنتج والمواصفات والبيان</th>
                  <th className="px-2 text-center border-l border-slate-200 w-[135px]">نوع الباب</th>
                  <th className="px-2 text-center border-l border-slate-200 w-[130px]">سعر الباب</th>
                  <th className="px-1 text-center border-l border-slate-200 w-[55px]">الكمية</th>
                  <th className="px-2 text-left w-[115px]">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {page.armoredDoors.map(({ door, serialNumber }) => (
                  <tr
                    key={door.id}
                    style={{ height: `${rowHeightPx}px` }}
                    className={fontCellSizeClass}
                  >
                    <td className="px-1 text-center font-mono font-bold text-slate-400 border-l border-slate-100 align-middle">
                      {String(serialNumber).padStart(2, '0')}
                    </td>
                    <td className="px-2 border-l border-slate-100 align-middle">
                      <div className={`${fontTitleSizeClass} font-black text-slate-900 leading-tight`}>
                        {door.title}
                      </div>
                      <div className="text-[8.5px] font-bold text-slate-500 mt-0.5">
                        {door.productName || getArmoredDoorProductName(door.manufactureType)}
                        {door.notes ? ` · ${door.notes}` : ''}
                      </div>
                    </td>
                    <td className="px-2 text-center border-l border-slate-100 align-middle">
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded inline-block ${
                          door.manufactureType === 'turkish_turkish'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : door.manufactureType === 'egyptian_single'
                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {door.manufactureLabel}
                      </span>
                    </td>
                    <td className="px-2 text-center border-l border-slate-100 align-middle">
                      <div className="font-mono font-bold text-slate-900" dir="ltr">
                        {formatCurrency(door.unitPrice)}
                      </div>
                      <div
                        className={`text-[8px] font-black ${
                          door.includesTransportAndInstall !== false
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {door.includesTransportAndInstall !== false
                          ? ARMORED_INCLUSION_NOTE
                          : ARMORED_EXCLUSION_NOTE}
                      </div>
                    </td>
                    <td className="px-1 text-center font-mono font-black text-slate-900 border-l border-slate-100 align-middle">
                      {door.quantity}
                    </td>
                    <td className="px-2 text-left font-mono font-black text-[#0F172A] align-middle" dir="ltr">
                      {formatCurrency(door.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 1. Independent Grand Total Card (Appears ONCE after all actual items) */}
        {page.showTotals && (
          <div className="bg-[#0F172A] text-white rounded-2xl border-2 border-[#F59E0B] px-5 py-3.5 flex flex-row justify-between items-center gap-5 shadow-md relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#F59E0B]" />

            <div className="text-right flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-[#FACC15]" />
              </div>
              <div>
                <h4 className="font-display font-black text-[15px] text-[#FACC15] tracking-tight">
                  السعر الإجمالي لعرض السعر
                </h4>
                <p className="text-slate-300 text-[10.5px] mt-0.5 font-bold">
                  إجمالي عروض أسعار الأبواب المصفحة ({totalQuantity} {totalQuantity === 1 ? 'باب' : totalQuantity === 2 ? 'بابين' : 'أبواب'})
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 tabular-nums">
              <span className="text-[9px] text-[#F59E0B] font-black block mb-0.5 tracking-wide">
                صافي السعر النهائي
              </span>
              <span className="text-2xl font-black font-display text-[#F59E0B] leading-none drop-shadow-sm" dir="ltr">
                {formatCurrency(armoredTotalPrice)}
              </span>
            </div>
          </div>
        )}

        {/* 2. Prominent Inclusion Banner */}
        {page.showTotals && (
          <div
            className={`rounded-xl px-4 py-2.5 flex items-center justify-between shrink-0 border-2 ${
              transportInclusionMode === 'all'
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-amber-50 border-amber-300'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-[12px] ${
                transportInclusionMode === 'all' ? 'text-emerald-950' : 'text-amber-950'
              }`}
            >
              <Truck
                size={16}
                className={
                  transportInclusionMode === 'all'
                    ? 'text-emerald-700 shrink-0'
                    : 'text-amber-700 shrink-0'
                }
              />
              <span>{inclusionSummaryText}</span>
            </div>
            <span
              className={`text-[10.5px] font-black bg-white px-2.5 py-0.5 rounded-md border ${
                transportInclusionMode === 'all'
                  ? 'text-emerald-900 border-emerald-200'
                  : 'text-amber-900 border-amber-200'
              }`}
            >
              أبواب مصفحة معتمدة
            </span>
          </div>
        )}

        {/* 3. Warranty, Terms & Signatures */}
        {page.showTermsAndSignatures && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-right space-y-2 shrink-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h5 className="font-display font-black text-[11px] text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#F59E0B]" />
                <span>مواصفات وشروط تسليم الأبواب المصفحة:</span>
              </h5>
              <span
                className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border ${
                  transportInclusionMode === 'all'
                    ? 'text-emerald-900 bg-emerald-100 border-emerald-300'
                    : 'text-amber-900 bg-amber-100 border-amber-300'
                }`}
              >
                {inclusionSummaryText}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] text-slate-700 font-bold">
              <p>✓ المواصفات الفنية: حسب النوع الموضح في كل بند أعلاه.</p>
              <p>
                ✓{' '}
                {transportInclusionMode === 'all'
                  ? `${ARMORED_PDF_INCLUSION_BANNER} بدون أي مصاريف إضافية.`
                  : `${inclusionSummaryText}.`}
              </p>
              <p>✓ فحص الكوالين والمفصلات وضمان ضبط التركيب عند الاستلام.</p>
              <p>✓ الشروط المالية: 50% دفعة تعاقد و50% عند التوريد والتركيب.</p>
            </div>

            {customer.notes && (
              <div className="bg-amber-50/80 border border-amber-200 p-1.5 rounded-xl text-[9.5px] font-bold text-amber-950">
                <strong>ملاحظة خاصة بالعميل:</strong> {customer.notes}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 text-center border-t border-slate-200 pt-2">
              <div>
                <p className="text-slate-400 mb-2 font-black text-[9.5px]">توقيع واعتماد العميل الموقر</p>
                <div className="border-b border-dashed border-slate-400 w-28 mx-auto" />
                <p className="text-slate-900 text-[10px] font-black mt-1">{customer.name || 'العميل المحترم'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-2 font-black text-[9.5px]">الاعتماد الرسمي - {BRAND_NAME}</p>
                <div className="border-b border-dashed border-slate-400 w-28 mx-auto" />
                <p className="text-[#0F172A] font-black text-[10px] mt-1">إدارة المبيعات وضبط الجودة</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Line */}
      <div className="pt-2 border-t border-slate-200 text-right shrink-0 mt-2">
        <div className="flex flex-row justify-between items-center gap-3 text-[8.5px] text-slate-500 font-bold tabular-nums">
          <p className="truncate">الفروع والمعارض: {BRANCHES_FOOTER_LINE}</p>
          <div className="flex items-center gap-2 shrink-0 text-slate-400">
            {totalPages > 1 && (
              <>
                <span className="text-slate-600 font-extrabold">صفحة {page.pageNumber} من {totalPages}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="font-extrabold">© {CURRENT_YEAR} {BRAND_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function ArmoredDetailedQuoteView({
  customer,
  armoredDoors,
  formatCurrency,
  isMobileViewport = false,
  onBack,
  onSaveQuoteAuto,
}: ArmoredDetailedQuoteViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [exportState, setExportState] = React.useState<'idle' | 'downloading'>('idle');
  const [exportProgress, setExportProgress] = React.useState<PdfGenerationProgress | null>(null);
  const [exportFeedback, setExportFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resolvedLogoSrc, setResolvedLogoSrc] = React.useState<string>(() => getCachedLogoSrc(logoUrl));
  const [justSaved, setJustSaved] = React.useState(false);

  const isExportingLockRef = React.useRef(false);
  const feedbackTimerRef = React.useRef<number | undefined>(undefined);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const previewSheetWrapperRef = React.useRef<HTMLDivElement>(null);
  const exportContainerRef = React.useRef<HTMLDivElement>(null);

  const computeInitialFitWidthScale = () => {
    if (typeof window === 'undefined') return 0.45;
    const estW = Math.max(120, Math.min(window.innerWidth, 980) - 24);
    return Math.floor(Math.min(estW / A4_WIDTH, 1.2) * 10000) / 10000;
  };

  const [activeScale, setActiveScale] = React.useState<number>(computeInitialFitWidthScale);

  const recomputeScale = React.useCallback(() => {
    const stageEl = stageRef.current;
    if (!stageEl || stageEl.clientWidth <= 0) return;
    const styles = window.getComputedStyle(stageEl);
    const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const availW = Math.max(120, stageEl.clientWidth - padX - 2);
    const nextFitWidth = Math.floor(Math.min(availW / A4_WIDTH, 1.2) * 10000) / 10000;
    setActiveScale((prev) => (Math.abs(prev - nextFitWidth) < 0.001 ? prev : nextFitWidth));
  }, []);

  React.useLayoutEffect(() => {
    recomputeScale();
  }, [recomputeScale, armoredDoors.length]);

  React.useEffect(() => {
    let rafId = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recomputeScale);
    };
    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    if (stageRef.current) {
      resizeObserver.observe(stageRef.current);
    }
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
    };
  }, [recomputeScale]);

  React.useEffect(() => {
    let mounted = true;
    preloadLogoDataUrl(logoUrl).then((dataUrl) => {
      if (mounted) setResolvedLogoSrc(dataUrl);
    });
    warmUpPdfAssets(logoUrl, previewSheetWrapperRef.current);

    return () => {
      mounted = false;
      window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedback = React.useCallback((type: 'success' | 'error', message: string) => {
    window.clearTimeout(feedbackTimerRef.current);
    setExportFeedback({ type, message });
    if (type === 'success') {
      feedbackTimerRef.current = window.setTimeout(() => setExportFeedback(null), 5000);
    }
  }, []);

  const quoteNumber = React.useMemo(() => {
    const baseDate = (customer.date || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(0, 6);
    const seedSource = `${customer.name || ''}-${customer.phone || ''}-${armoredDoors[0]?.id || 301}`;
    let hash = 0;
    for (let i = 0; i < seedSource.length; i++) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) % 900;
    }
    const seq = 100 + Math.abs(hash);
    return `ARM-${baseDate}-${seq}`;
  }, [customer.date, customer.name, customer.phone, armoredDoors]);

  const armoredTotalPrice = React.useMemo(() => {
    return calculateArmoredQuoteTotal(armoredDoors || []);
  }, [armoredDoors]);

  const totalQuantity = React.useMemo(() => {
    return (armoredDoors || []).reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [armoredDoors]);

  const transportInclusionMode = React.useMemo<'all' | 'none' | 'partial'>(() => {
    const list = armoredDoors || [];
    if (list.length === 0) return 'all';
    const includedCount = list.filter((d) => d.includesTransportAndInstall !== false).length;
    if (includedCount === list.length) return 'all';
    if (includedCount === 0) return 'none';
    return 'partial';
  }, [armoredDoors]);

  const pages = React.useMemo(() => {
    return paginateArmoredQuoteIntoPages(armoredDoors || [], customer);
  }, [armoredDoors, customer]);

  React.useEffect(() => {
    setCurrentPageIndex((prev) => Math.min(prev, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  const exportFileName = React.useMemo(() => {
    const clientNameClean = (customer.name || 'عميل').trim().replace(/\s+/g, '_');
    return `عرض_سعر_أبواب_مصفحة_${clientNameClean}.pdf`;
  }, [customer.name]);

  const activePage = pages[Math.min(currentPageIndex, pages.length - 1)] || pages[0];
  const scaledWidth = Math.round(A4_WIDTH * activeScale);
  const scaledHeight = Math.round(A4_HEIGHT * activeScale);

  const handleDownloadPdf = async () => {
    if (isExportingLockRef.current) return;
    isExportingLockRef.current = true;
    setExportFeedback(null);
    setExportState('downloading');
    setExportProgress({ completedPages: 0, totalPages: pages.length });

    try {
      await nextPaintFrame();

      const container = exportContainerRef.current;
      if (!container) {
        throw new Error('تعذر الوصول إلى حاوية صفحات التصدير');
      }

      const cacheKey = `armored-${quoteNumber}-${armoredDoors.length}-${armoredTotalPrice}`;
      const generated = await generateQuotePdfBlob({
        container,
        cacheKey,
        fileName: exportFileName,
        logoSrc: resolvedLogoSrc,
        onProgress: (progress) => setExportProgress(progress),
      });

      triggerPdfBlobDownload(generated.blob, exportFileName);
      showFeedback('success', 'تم تنزيل ملف PDF للأبواب المصفحة بنجاح!');
    } catch (err) {
      console.error('Armored PDF Export Error:', err);
      showFeedback('error', 'تعذر تنزيل ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setExportState('idle');
      isExportingLockRef.current = false;
      setExportProgress(null);
    }
  };

  const handleSave = () => {
    if (!onSaveQuoteAuto) return;
    onSaveQuoteAuto();
    setJustSaved(true);
    showFeedback('success', 'تم حفظ عرض أسعار الأبواب المصفحة بنجاح!');
    setTimeout(() => setJustSaved(false), 2200);
  };

  const handleNativePrint = () => {
    window.print();
  };

  const [isRenderingOffscreenPages, setIsRenderingOffscreenPages] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setIsRenderingOffscreenPages(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden ${
        isMobileViewport ? 'px-2 py-2 space-y-3' : 'max-w-5xl mx-auto px-4 py-8 space-y-6'
      }`}
      id={isMobileViewport ? 'mobile-armored-detailed-quote-view' : 'armored-detailed-quote-view'}
      dir="rtl"
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ChevronRight size={16} />
              <span className="hidden sm:inline">العودة للأبواب المصفحة</span>
              <span className="sm:hidden">رجوع</span>
            </button>
          )}
          <h2 className="text-sm sm:text-lg font-display font-black text-[#0F172A] truncate">
            معاينة عرض أسعار أبواب مصفحة
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSaveQuoteAuto && (
            <button
              type="button"
              onClick={handleSave}
              disabled={justSaved}
              className={`min-h-[44px] px-3.5 py-2 font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer whitespace-nowrap ${
                justSaved
                  ? 'bg-teal-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {justSaved ? <Check size={15} /> : <Save size={15} />}
              <span>{justSaved ? 'تم الحفظ' : 'حفظ العرض'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNativePrint}
            className="min-h-[44px] px-3.5 py-2 bg-[#0F172A] hover:bg-black text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer whitespace-nowrap"
          >
            <Printer size={15} />
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportState === 'downloading'}
            className="min-h-[44px] px-4 sm:px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download size={15} />
            <span>
              {exportState === 'downloading'
                ? exportProgress
                  ? `جاري التصدير (${exportProgress.completedPages}/${exportProgress.totalPages})`
                  : 'جاري التصدير...'
                : 'تنزيل PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {exportFeedback && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 print:hidden ${
            exportFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {exportFeedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="text-rose-600" />
          )}
          <span>{exportFeedback.message}</span>
        </div>
      )}

      {/* Central A4 Preview Stage */}
      <div ref={stageRef} className="w-full flex justify-center items-start print:hidden">
        <div
          dir="ltr"
          className="relative shrink-0 rounded-sm bg-white shadow-xl ring-1 ring-slate-900/10"
          style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
        >
          <div
            ref={previewSheetWrapperRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${activeScale})`,
              transformOrigin: '0 0',
            }}
          >
            <ArmoredA4PageSheet
              page={activePage}
              totalPages={pages.length}
              customer={customer}
              formatCurrency={formatCurrency}
              quoteNumber={quoteNumber}
              armoredTotalPrice={armoredTotalPrice}
              totalQuantity={totalQuantity}
              transportInclusionMode={transportInclusionMode}
              logoSrc={resolvedLogoSrc}
            />
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-xl border border-slate-200 print:hidden">
          <button
            type="button"
            onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
            disabled={currentPageIndex === 0}
            className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            السابقة
          </button>
          <span className="text-xs font-black text-slate-700">
            صفحة {currentPageIndex + 1} من {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}
            disabled={currentPageIndex >= pages.length - 1}
            className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            التالية
          </button>
        </div>
      )}

      {/* Native Print Pages */}
      <div className="hidden print:block">
        {pages.map((p) => (
          <div key={`print-${p.pageNumber}`} className="a4-print-page">
            <ArmoredA4PageSheet
              page={p}
              totalPages={pages.length}
              customer={customer}
              formatCurrency={formatCurrency}
              quoteNumber={quoteNumber}
              armoredTotalPrice={armoredTotalPrice}
              totalQuantity={totalQuantity}
              transportInclusionMode={transportInclusionMode}
              logoSrc={resolvedLogoSrc}
            />
          </div>
        ))}
      </div>

      {/* Offscreen Render Target for PDF */}
      {isRenderingOffscreenPages && (
        <div
          ref={exportContainerRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: '-10000px',
            width: `${A4_WIDTH}px`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {pages.map((p) => (
            <div key={p.pageNumber}>
              <ArmoredA4PageSheet
                page={p}
                totalPages={pages.length}
                customer={customer}
                formatCurrency={formatCurrency}
                quoteNumber={quoteNumber}
                armoredTotalPrice={armoredTotalPrice}
                totalQuantity={totalQuantity}
                transportInclusionMode={transportInclusionMode}
                logoSrc={resolvedLogoSrc}
                exportMarker
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
