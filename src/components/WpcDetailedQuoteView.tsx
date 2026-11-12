import React from 'react';
import { CustomerInfo, WpcDoorItem } from '../types';
import {
  Download,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
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
import { formatWpcDoorSize, getWpcDoorDisplayData } from '../constants/wpcConstants';

interface WpcDetailedQuoteViewProps {
  customer: CustomerInfo;
  wpcDoors: WpcDoorItem[];
  formatCurrency: (value: number) => string;
  isMobileViewport?: boolean;
  onBack?: () => void;
}

void preloadLogoDataUrl(logoUrl);

export interface WpcQuotePageDescriptor {
  pageNumber: number;
  isFirstPage: boolean;
  wpcDoors: {
    door: WpcDoorItem;
    serialNumber: number;
    formattedSize: string;
    activeAddonsList: { key: string; name: string; price: number }[];
  }[];
  showTotals: boolean;
  showTermsAndSignatures: boolean;
  equalRowHeightPx: number;
}

/**
 * Calculates equal row height for a set of items on a page based on printable space.
 */
function computePageRowHeight(
  count: number,
  isFirstPage: boolean,
  includeSummary: boolean
): number {
  if (count <= 0) return 40;
  const PRINTABLE_HEIGHT = 1045; // 1123px - 48px padding - 30px footer
  const headerH = isFirstPage ? 150 : 45;
  const chromeH = 54;
  const summaryH = includeSummary ? 254 : 0;
  const spacingGaps = 24;

  const availForRows = PRINTABLE_HEIGHT - headerH - chromeH - summaryH - spacingGaps;
  const raw = Math.floor(availForRows / count);
  return Math.min(52, Math.max(28, raw));
}

function canFitDoorsOnPage(
  doorsSubset: WpcDoorItem[],
  isFirstPage: boolean,
  includeSummary: boolean
): { fits: boolean; rowHeight: number } {
  const count = doorsSubset.length;
  if (count === 0) return { fits: true, rowHeight: 40 };

  const rowH = computePageRowHeight(count, isFirstPage, includeSummary);
  const PRINTABLE_HEIGHT = 1045;
  const headerH = isFirstPage ? 150 : 45;
  const chromeH = 54;
  const summaryH = includeSummary ? 254 : 0;
  const totalRequired = headerH + chromeH + count * rowH + summaryH + 24;

  return {
    fits: totalRequired <= PRINTABLE_HEIGHT,
    rowHeight: rowH,
  };
}

function paginateWpcQuoteIntoPages(
  wpcDoors: WpcDoorItem[],
  _customer: CustomerInfo
): WpcQuotePageDescriptor[] {
  if (!wpcDoors || wpcDoors.length === 0) {
    return [
      {
        pageNumber: 1,
        isFirstPage: true,
        wpcDoors: [],
        showTotals: true,
        showTermsAndSignatures: true,
        equalRowHeightPx: 40,
      },
    ];
  }

  const pages: WpcQuotePageDescriptor[] = [];
  let doorIndex = 0;
  let currentDoorsStartSerial = 1;

  while (doorIndex < wpcDoors.length) {
    const isFirstPage = pages.length === 0;
    const remainingDoors = wpcDoors.slice(doorIndex);

    // 1. Test if ALL remaining doors + Grand Total + Terms fit on this current page
    const tryAllWithSummary = canFitDoorsOnPage(remainingDoors, isFirstPage, true);
    if (tryAllWithSummary.fits) {
      pages.push({
        pageNumber: pages.length + 1,
        isFirstPage,
        wpcDoors: remainingDoors.map((door, idx) => ({
          door,
          serialNumber: currentDoorsStartSerial + idx,
          formattedSize: formatWpcDoorSize(door),
          activeAddonsList: getWpcDoorDisplayData(door).activeAddonsList,
        })),
        showTotals: true,
        showTermsAndSignatures: true,
        equalRowHeightPx: tryAllWithSummary.rowHeight,
      });
      break;
    }

    // 2. Otherwise, find maximum doors that fit on this page WITHOUT summary
    let maxFitCount = 0;
    let chosenRowH = 32;

    for (let testCount = remainingDoors.length; testCount >= 1; testCount--) {
      const testSubset = remainingDoors.slice(0, testCount);
      const res = canFitDoorsOnPage(testSubset, isFirstPage, false);
      if (res.fits) {
        maxFitCount = testCount;
        chosenRowH = res.rowHeight;
        break;
      }
    }

    if (maxFitCount === 0) {
      maxFitCount = 1;
      chosenRowH = 28;
    }

    // 3. Page balancing: avoid leaving 1, 2, or 3 items on a final page alongside summary
    const leftoverCount = remainingDoors.length - maxFitCount;
    if (leftoverCount > 0 && leftoverCount < 4 && maxFitCount > 5) {
      const shiftAmount = 4 - leftoverCount;
      maxFitCount = Math.max(4, maxFitCount - shiftAmount);
      chosenRowH = computePageRowHeight(maxFitCount, isFirstPage, false);
    }

    const pageSubset = remainingDoors.slice(0, maxFitCount);

    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage,
      wpcDoors: pageSubset.map((door, idx) => ({
        door,
        serialNumber: currentDoorsStartSerial + idx,
        formattedSize: formatWpcDoorSize(door),
        activeAddonsList: getWpcDoorDisplayData(door).activeAddonsList,
      })),
      showTotals: false,
      showTermsAndSignatures: false,
      equalRowHeightPx: chosenRowH,
    });

    doorIndex += maxFitCount;
    currentDoorsStartSerial += maxFitCount;
  }

  return pages;
}

const BRANCHES_FOOTER_LINE = COMPANY_LOCATIONS.map((l) => l.name).join(' · ');
const CURRENT_YEAR = new Date().getFullYear();

const WpcA4PageSheet = React.memo(function WpcA4PageSheet({
  page,
  totalPages,
  customer,
  formatCurrency,
  quoteNumber,
  discountAmount,
  totalNotesAmount,
  finalPrice,
  wpcTotalPrice,
  logoSrc,
  exportMarker,
}: {
  page: WpcQuotePageDescriptor;
  totalPages: number;
  customer: CustomerInfo;
  formatCurrency: (value: number) => string;
  quoteNumber: string;
  discountAmount: number;
  totalNotesAmount: number;
  finalPrice: number;
  wpcTotalPrice: number;
  logoSrc: string;
  exportMarker?: boolean;
}) {
  const { notes = '' } = customer;
  const quoteDate = customer.date || new Date().toISOString().split('T')[0];

  // Equal row height styles
  const rowHeightPx = page.equalRowHeightPx;
  const isCompactRow = rowHeightPx < 34;

  const fontTitleSizeClass = isCompactRow ? 'text-[10px]' : rowHeightPx < 42 ? 'text-[11px]' : 'text-[12px]';
  const fontCellSizeClass = isCompactRow ? 'text-[9.5px]' : rowHeightPx < 42 ? 'text-[10.5px]' : 'text-[11px]';

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
      {/* Content Area - Sequential flow: Header -> Table -> Grand Total -> Terms */}
      <div className="flex-1 flex flex-col justify-start min-h-0 space-y-3">
        {/* Header Section */}
        {page.isFirstPage ? (
          <div className="flex flex-row justify-between items-stretch gap-5 pb-2.5 border-b-2 border-slate-900 shrink-0">
            <div className="flex flex-col justify-between text-right flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={`${BRAND_NAME} - أبواب WPC`}
                  decoding="sync"
                  className="w-14 h-14 rounded-2xl border-2 border-[#0F172A] object-cover bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-[24px] leading-tight font-black font-display text-[#0F172A] tracking-tight">
                    {BRAND_NAME}
                  </div>
                  <p className="text-slate-500 font-bold text-[10.5px] mt-0.5">
                    ذا بيست ويندوز · عرض أسعار أبواب WPC المعالجة ضد المياه والرطوبة 100%
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
                  بيانات العميل الموقر (عرض أبواب WPC)
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
                    {customer.address || 'بناءً على مقاسات وتجهيزات الموقع'}
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
                <div className="text-[9.5px] font-bold text-slate-500">تابع عرض أسعار أبواب WPC</div>
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

        {/* 1. Actual Doors Table - ENDS IMMEDIATELY AFTER LAST ITEM (NO empty rows, NO fixed height) */}
        {page.wpcDoors.length > 0 && (
          <div className="border-[1.5px] border-slate-900 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
            <div className="bg-[#0F172A] text-white px-3 py-1 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                <span className="font-display font-black text-xs text-[#FACC15]">
                  جدول تفاصيل ومواصفات أبواب WPC (المعالجة ضد المياه والرطوبة)
                </span>
              </div>
              <span className="text-[9.5px] text-slate-300 font-bold">
                {page.wpcDoors.length} {page.wpcDoors.length === 1 ? 'باب معروض' : 'أبواب معروضة'}
              </span>
            </div>
            <table className="w-full table-fixed border-collapse text-right">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-black text-[9.5px] h-[28px]">
                  <th className="px-1 text-center w-[32px] border-l border-slate-200">م</th>
                  <th className="px-2 w-[165px] border-l border-slate-200">بيان البند والوصف</th>
                  <th className="px-1.5 text-center border-l border-slate-200 w-[110px]">المقاس المطلوب</th>
                  <th className="px-1.5 border-l border-slate-200 w-[135px]">الباقة والتوريد</th>
                  <th className="px-1.5 border-l border-slate-200 w-[160px]">المواصفات والإضافات</th>
                  <th className="px-1 text-center border-l border-slate-200 w-[38px]">العدد</th>
                  <th className="px-1.5 text-center border-l border-slate-200 w-[82px]">الفئة</th>
                  <th className="px-2 text-left w-[95px]">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {page.wpcDoors.map(({ door, serialNumber, formattedSize, activeAddonsList }) => {
                  const display = getWpcDoorDisplayData(door);
                  return (
                  <tr
                    key={door.id}
                    style={{ height: `${rowHeightPx}px` }}
                    className={`${fontCellSizeClass} transition-colors`}
                  >
                    <td className="px-1 text-center font-mono font-bold text-slate-400 border-l border-slate-100 align-middle">
                      {String(serialNumber).padStart(2, '0')}
                    </td>
                    <td className="px-2 border-l border-slate-100 align-middle">
                      <div className={`${fontTitleSizeClass} font-black text-slate-900 leading-tight`}>
                        {door.title}
                      </div>
                    </td>
                    <td className="px-1.5 text-center border-l border-slate-100 font-mono font-bold text-slate-800 align-middle" dir="ltr">
                      <div>{formattedSize}</div>
                      {door.sizeType === 'custom' && (
                        <span className="text-[8px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded inline-block mt-0.5">
                          مقاس مخصص
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 border-l border-slate-100 align-middle">
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded inline-block ${display.isFullPackage ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'}`}>
                        {display.packageName}
                      </span>
                    </td>
                    <td className="px-1.5 border-l border-slate-100 align-middle">
                      {activeAddonsList.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {activeAddonsList.map((a) => (
                            <span key={a.key} className="bg-slate-100 text-slate-800 border border-slate-200 font-bold px-1 py-0.2 rounded text-[8px] whitespace-nowrap">
                              ✓ {a.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[8px]">بدون إضافات</span>
                      )}
                    </td>
                    <td className="px-1 text-center font-mono font-bold text-slate-800 border-l border-slate-100 align-middle">
                      {door.quantity}
                    </td>
                    <td className="px-1.5 text-center font-mono font-bold text-slate-800 border-l border-slate-100 align-middle" dir="ltr">
                      {formatCurrency(display.unitPrice)}
                    </td>
                    <td className="px-2 text-left font-mono font-black text-[#0F172A] align-middle" dir="ltr">
                      {formatCurrency(display.totalPrice)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Grand Total Card ("السعر الإجمالي لعرض السعر") - Renders IMMEDIATELY after table */}
        {page.showTotals && (
          <div className="bg-[#0F172A] text-white rounded-2xl border-2 border-[#F59E0B] px-4 py-3 flex flex-row justify-between items-center gap-5 shadow-md relative overflow-hidden shrink-0 mt-2">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#F59E0B]" />

            <div className="text-right flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-[#FACC15]" />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-[#FACC15] tracking-tight">
                  السعر الإجمالي لعرض السعر
                </h4>
                <p className="text-slate-300 text-[9.5px] mt-0.5 font-bold">
                  القيمة النهائية الكلية لكافة أبواب WPC والتجهيزات المعروضة:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 shrink-0 tabular-nums">
              {discountAmount > 0 || totalNotesAmount !== 0 ? (
                <>
                  <div className="text-right">
                    <span className="text-[8.5px] text-slate-400 font-black block mb-0.5">قبل الخصم</span>
                    <span className="text-[11px] font-bold font-mono leading-none text-slate-300 line-through decoration-red-500/50" dir="ltr">
                      {formatCurrency(wpcTotalPrice)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <>
                      <div className="bg-slate-700 h-7 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[8.5px] text-emerald-400 font-black block mb-0.5">خصم خاص</span>
                        <span className="text-[11px] font-bold font-mono leading-none text-emerald-400" dir="ltr">
                          - {formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  {totalNotesAmount !== 0 && (
                    <>
                      <div className="bg-slate-700 h-7 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[8.5px] text-sky-400 font-black block mb-0.5">تسويات</span>
                        <span className="text-[11px] font-bold font-mono leading-none text-sky-400" dir="ltr">
                          {totalNotesAmount > 0 ? '+' : ''}{formatCurrency(totalNotesAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-700 h-7 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[8.5px] text-[#F59E0B] font-black block mb-0.5 tracking-wide">الإجمالي النهائي</span>
                    <span className="text-2xl font-black font-display text-[#F59E0B] leading-none drop-shadow-sm" dir="ltr">
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-right">
                  <span className="text-[8.5px] text-[#F59E0B] font-black block mb-0.5 tracking-wide">صافي السعر الإجمالي</span>
                  <span className="text-2xl font-black font-display text-[#F59E0B] leading-none drop-shadow-sm" dir="ltr">
                    {formatCurrency(wpcTotalPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Quality Warranty & Terms & Signatures - Renders IMMEDIATELY after Grand Total */}
        {page.showTermsAndSignatures && (
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-right space-y-1.5 shrink-0 shadow-sm mt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h5 className="font-display font-black text-[11px] text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#F59E0B]" />
                <span>ضمان الجودة ومواصفات تسليم أبواب WPC:</span>
              </h5>
              <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md">
                ضمان 10 سنوات ضد المياه والرطوبة ونسوس الخشب
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-slate-700 font-bold">
              <p>✓ الخامات معالجة 100% ضد امتصاص المياه، الرطوبة، الفطريات، وحشرات الخشب.</p>
              <p>✓ المقاسات نهائية بعد المعاينة الهندسية وتحديد اتجاه الفتح بالموقع.</p>
              <p>✓ الشروط المالية: 50% مقدم تعاقد عند الاعتماد، و50% عند الاستلام النهائي.</p>
              <p>✓ الأسعار شاملة كافة الملحقات والمواصفات الموضحة لكل باقة في عرض السعر.</p>
            </div>

            {notes && (
              <div className="bg-amber-50/80 border border-amber-200 p-1 rounded-xl text-[9.5px] font-bold text-amber-950">
                <strong>ملاحظة خاصة بالعميل:</strong> {notes}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 text-center border-t border-slate-200 pt-1.5">
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

export default function WpcDetailedQuoteView({
  customer,
  wpcDoors,
  formatCurrency,
  isMobileViewport = false,
  onBack,
}: WpcDetailedQuoteViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [exportState, setExportState] = React.useState<'idle' | 'downloading' | 'preparing-share' | 'ready-to-share'>('idle');
  const [exportProgress, setExportProgress] = React.useState<PdfGenerationProgress | null>(null);
  const [exportFeedback, setExportFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resolvedLogoSrc, setResolvedLogoSrc] = React.useState<string>(() => getCachedLogoSrc(logoUrl));

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
  }, [recomputeScale, wpcDoors.length]);

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
    const seedSource = `${customer.name || ''}-${customer.phone || ''}-${wpcDoors[0]?.id || 201}`;
    let hash = 0;
    for (let i = 0; i < seedSource.length; i++) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) % 900;
    }
    const seq = 100 + Math.abs(hash);
    return `WPC-${baseDate}-${seq}`;
  }, [customer.date, customer.name, customer.phone, wpcDoors]);

  const { discountType = 'cash', discountValue = 0, notesAmount = 0, additionalNotes = [] } = customer;

  const wpcTotalPrice = React.useMemo(() => {
    return (wpcDoors || []).reduce((sum, d) => sum + d.totalPrice, 0);
  }, [wpcDoors]);

  const discountAmount = React.useMemo(() => {
    const raw = discountType === 'percentage' ? (wpcTotalPrice * discountValue) / 100 : discountValue;
    return raw > wpcTotalPrice ? wpcTotalPrice : raw;
  }, [wpcTotalPrice, discountType, discountValue]);

  const totalNotesAmount = React.useMemo(() => {
    return notesAmount + additionalNotes.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [notesAmount, additionalNotes]);

  const finalPrice = React.useMemo(() => {
    return Math.max(0, wpcTotalPrice - discountAmount + totalNotesAmount);
  }, [wpcTotalPrice, discountAmount, totalNotesAmount]);

  const pages = React.useMemo(() => {
    return paginateWpcQuoteIntoPages(wpcDoors || [], customer);
  }, [wpcDoors, customer]);

  const exportFileName = React.useMemo(() => {
    const clientNameClean = (customer.name || 'عميل').trim().replace(/\s+/g, '_');
    return `عرض_سعر_أبواب_WPC_${clientNameClean}.pdf`;
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

      const cacheKey = `wpc-${quoteNumber}-${wpcDoors.length}-${finalPrice}`;
      const generated = await generateQuotePdfBlob({
        container,
        cacheKey,
        fileName: exportFileName,
        logoSrc: resolvedLogoSrc,
        onProgress: (progress) => setExportProgress(progress),
      });

      triggerPdfBlobDownload(generated.blob, exportFileName);
      showFeedback('success', 'تم تنزيل ملف PDF لأبواب WPC بنجاح!');
    } catch (err) {
      console.error('WPC PDF Export Error:', err);
      showFeedback('error', 'تعذر تنزيل ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setExportState('idle');
      isExportingLockRef.current = false;
      setExportProgress(null);
    }
  };

  const [isRenderingOffscreenPages, setIsRenderingOffscreenPages] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setIsRenderingOffscreenPages(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`w-full max-w-full overflow-x-hidden ${isMobileViewport ? 'px-2 py-2 space-y-3' : 'max-w-5xl mx-auto px-4 py-8 space-y-6'}`} id={isMobileViewport ? 'mobile-wpc-detailed-quote-view' : 'wpc-detailed-quote-view'} dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ChevronRight size={16} />
              <span className="hidden sm:inline">العودة لإدارة أبواب WPC</span>
              <span className="sm:hidden">رجوع</span>
            </button>
          )}
          <h2 className="text-sm sm:text-lg font-display font-black text-[#0F172A] truncate">
            معاينة عرض سعر أبواب WPC
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportState === 'downloading'}
            className="min-h-[44px] px-4 sm:px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download size={15} />
            <span>{exportState === 'downloading' ? 'جاري التصدير...' : 'تنزيل PDF'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {exportFeedback && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${exportFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
          {exportFeedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
          <span>{exportFeedback.message}</span>
        </div>
      )}

      {/* Central A4 Preview Stage */}
      <div ref={stageRef} className="w-full flex justify-center items-start">
        <div dir="ltr" className="relative shrink-0 rounded-sm bg-white shadow-xl ring-1 ring-slate-900/10" style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
          <div ref={previewSheetWrapperRef} style={{ position: 'absolute', top: 0, left: 0, width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`, transform: `scale(${activeScale})`, transformOrigin: '0 0' }}>
            <WpcA4PageSheet
              page={activePage}
              totalPages={pages.length}
              customer={customer}
              formatCurrency={formatCurrency}
              quoteNumber={quoteNumber}
              discountAmount={discountAmount}
              totalNotesAmount={totalNotesAmount}
              finalPrice={finalPrice}
              wpcTotalPrice={wpcTotalPrice}
              logoSrc={resolvedLogoSrc}
            />
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
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
          <span className="text-xs font-black text-slate-700">صفحة {currentPageIndex + 1} من {pages.length}</span>
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

      {/* Offscreen Render Target for PDF */}
      {isRenderingOffscreenPages && (
        <div ref={exportContainerRef} aria-hidden="true" style={{ position: 'fixed', top: 0, left: '-10000px', width: `${A4_WIDTH}px`, pointerEvents: 'none', zIndex: -1 }}>
          {pages.map((p) => (
            <div key={p.pageNumber}>
              <WpcA4PageSheet
                page={p}
                totalPages={pages.length}
                customer={customer}
                formatCurrency={formatCurrency}
                quoteNumber={quoteNumber}
                discountAmount={discountAmount}
                totalNotesAmount={totalNotesAmount}
                finalPrice={finalPrice}
                wpcTotalPrice={wpcTotalPrice}
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
