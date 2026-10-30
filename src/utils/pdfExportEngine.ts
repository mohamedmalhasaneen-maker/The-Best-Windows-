import jspdf from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { Addon, CalculatedItem, CalculationResult, CustomerInfo, Profile } from '../types';
import {
  ITEM_ROW_FIXED_HEIGHT,
  ItemRowAutoFit,
  NotesSectionAutoFit,
  computeItemRowAutoFit,
  computeNotesSectionAutoFit,
} from './itemAutoFit';

// Canonical A4 Portrait dimensions at 96 DPI (210mm × 297mm -> exact 1 : 1.4142857 ratio)
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

export interface IndexedQuoteItem {
  item: CalculatedItem;
  serialNumber: number;
  isComplex: boolean;
  isMinArea: boolean;
  estimatedHeight: number;
  autoFit: ItemRowAutoFit;
}

export interface QuotePageDescriptor {
  pageNumber: number;
  isFirstPage: boolean;
  items: IndexedQuoteItem[];
  hasMoreItemsAfter: boolean;
  showTotals: boolean;
  showNotes: boolean;
  notesAutoFit?: NotesSectionAutoFit;
  showTermsAndSignatures: boolean;
  pageItemCount: number;
  pageItemRange: string;
  pageTotalArea: number;
  pageTotalPrice: number;
}

export interface CachedPdfEntry {
  cacheKey: string;
  blob: Blob;
  fileName: string;
  pageCount: number;
  createdAt: number;
}

export interface PdfGenerationProgress {
  completedPages: number;
  totalPages: number;
}

// Module-level singletons so logo & fonts are loaded at most ONCE per session
let resolvedLogoDataUrl: string | null = null;
let logoPreloadPromise: Promise<string> | null = null;

let resolvedFontEmbedCss: string | null = null;
let fontEmbedCssPromise: Promise<string> | null = null;

// Keep up to 3 recent PDF blobs in memory for 0ms repeat downloads / share reuse
const MAX_PDF_CACHE_ENTRIES = 3;
const pdfBlobCache = new Map<string, CachedPdfEntry>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode asset as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Preloads and converts the brand logo URL into an inline Base64 data URI once.
 * Subsequent calls and all A4 pages reuse the in-memory data URI with zero network/IO cost.
 */
export function preloadLogoDataUrl(logoSrc: string): Promise<string> {
  if (resolvedLogoDataUrl) {
    return Promise.resolve(resolvedLogoDataUrl);
  }
  if (logoSrc.startsWith('data:')) {
    resolvedLogoDataUrl = logoSrc;
    return Promise.resolve(logoSrc);
  }
  if (logoPreloadPromise) {
    return logoPreloadPromise;
  }

  logoPreloadPromise = fetch(logoSrc, { cache: 'force-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(blobToDataUrl)
    .then((dataUrl) => {
      resolvedLogoDataUrl = dataUrl;
      return dataUrl;
    })
    .catch(() => {
      // Fallback to original bundled URL so rendering never breaks
      logoPreloadPromise = null;
      return logoSrc;
    });

  return logoPreloadPromise;
}

export function getCachedLogoSrc(fallbackSrc: string): string {
  return resolvedLogoDataUrl || fallbackSrc;
}

/**
 * Computes webfont embed CSS at most once per browser session, bounded by a timeout
 * so slow or offline font CDNs never stall PDF creation.
 */
export function preloadFontEmbedCss(referenceNode: HTMLElement): Promise<string> {
  if (resolvedFontEmbedCss !== null) {
    return Promise.resolve(resolvedFontEmbedCss);
  }
  if (fontEmbedCssPromise) {
    return fontEmbedCssPromise;
  }

  const timeoutGuard = new Promise<string>((resolve) => {
    window.setTimeout(() => resolve(''), 1500);
  });

  const extractTask = htmlToImage
    .getFontEmbedCSS(referenceNode, {
      preferredFontFormat: 'woff2',
    })
    .catch(() => '');

  fontEmbedCssPromise = Promise.race([extractTask, timeoutGuard]).then((css) => {
    resolvedFontEmbedCss = css;
    return css;
  });

  return fontEmbedCssPromise;
}

/**
 * Warms up logo and webfont CSS asynchronously during browser idle frames
 * so everything is already cached in memory before the user clicks Download.
 */
export function warmUpPdfAssets(logoSrc: string, referenceNode?: HTMLElement | null): void {
  const runWarmup = () => {
    void preloadLogoDataUrl(logoSrc);
    if (referenceNode && resolvedFontEmbedCss === null) {
      void preloadFontEmbedCss(referenceNode);
    }
  };

  if (typeof window === 'undefined') return;

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(runWarmup, { timeout: 600 });
  } else {
    globalThis.setTimeout(runWarmup, 80);
  }
}

/**
 * Computes independent per-item auto-fit font metrics while strictly preserving the fixed
 * row height (ITEM_ROW_FIXED_HEIGHT = 72px) so long text never expands row height or shifts items.
 */
export function analyzeQuoteItemLayout(
  item: CalculatedItem,
  profiles: Record<string, Profile>,
  addons: Record<string, Addon>
): {
  isComplex: boolean;
  isMinArea: boolean;
  estimatedHeight: number;
  autoFit: ItemRowAutoFit;
} {
  const threshold = 1.0;
  const isMinArea = (item.width * item.height) / 10000 < threshold;
  const autoFit = computeItemRowAutoFit(item, profiles, addons);
  const isComplex =
    autoFit.description.titleFontPx < 12 ||
    autoFit.details.titleFontPx < 11 ||
    autoFit.addons.fontPx < 10;

  return {
    isComplex,
    isMinArea,
    estimatedHeight: ITEM_ROW_FIXED_HEIGHT,
    autoFit,
  };
}

export function estimateItemRowHeight(
  _item: CalculatedItem,
  _profiles: Record<string, Profile>,
  _addons: Record<string, Addon>
): number {
  return ITEM_ROW_FIXED_HEIGHT;
}

export function estimateNotesHeight(customer: CustomerInfo, maxAllowedHeight = 960): number {
  return computeNotesSectionAutoFit(customer, maxAllowedHeight).estimatedHeight;
}

function finalizePageSummaries(pages: Omit<QuotePageDescriptor, 'pageNumber'>[]): void {
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p.items.length > 0) {
      p.pageItemCount = p.items.length;
      const firstS = p.items[0].serialNumber;
      const lastS = p.items[p.items.length - 1].serialNumber;
      p.pageItemRange = firstS === lastS ? String(firstS) : `${firstS}-${lastS}`;
      p.pageTotalArea = p.items.reduce(
        (sum, entry) => sum + entry.item.area * (entry.item.quantity || 1),
        0
      );
      p.pageTotalPrice = p.items.reduce((sum, entry) => sum + entry.item.itemTotal, 0);
    } else {
      p.pageItemCount = 0;
      p.pageItemRange = '';
      p.pageTotalArea = 0;
      p.pageTotalPrice = 0;
    }

    const laterPagesHaveItems = pages.slice(i + 1).some((nextPage) => nextPage.items.length > 0);
    p.hasMoreItemsAfter = p.items.length > 0 && laterPagesHaveItems;
  }
}

/**
 * Smart A4 pagination with fixed 72px item row geometry and independent per-item auto-fit font sizing.
 * Guarantees identical item positions, column widths, and font sizes across Preview, PDF, Share, and Print.
 */
export function paginateQuoteIntoA4Pages(
  items: CalculatedItem[],
  customer: CustomerInfo,
  profiles: Record<string, Profile>,
  addons: Record<string, Addon>
): QuotePageDescriptor[] {
  // Total A4 height is 1123px; subtracting top/bottom sheet padding (44px) and pinned footer (~32px)
  // leaves ~1047px interior height. Using 1028px provides a clean safety cushion with zero clipping.
  const SAFE_PAGE_BUDGET = 1028;
  const FIRST_HEADER_HEIGHT = customer.deliveryDate ? 162 : 140;
  const CONT_HEADER_HEIGHT = 60;
  const TABLE_CHROME_HEIGHT = 98; // thead + tfoot + borders + bottom margin
  const INDICATOR_HEIGHT = 18;

  const TOTALS_HEIGHT =
    (customer.discountValue && customer.discountValue > 0) ||
    (customer.notesAmount && customer.notesAmount !== 0) ||
    (customer.additionalNotes && customer.additionalNotes.some((n) => (n.amount || 0) !== 0))
      ? 96
      : 84;
  const MAX_NOTES_BUDGET = SAFE_PAGE_BUDGET - CONT_HEADER_HEIGHT - 8;
  const notesAutoFit = computeNotesSectionAutoFit(customer, MAX_NOTES_BUDGET);
  const NOTES_HEIGHT = notesAutoFit.estimatedHeight;
  const TERMS_AND_SIGNATURES_HEIGHT = 352;

  const rawPages: Omit<QuotePageDescriptor, 'pageNumber'>[] = [];

  let currentPage: Omit<QuotePageDescriptor, 'pageNumber'> = {
    isFirstPage: true,
    items: [],
    hasMoreItemsAfter: false,
    showTotals: false,
    showNotes: false,
    showTermsAndSignatures: false,
    pageItemCount: 0,
    pageItemRange: '',
    pageTotalArea: 0,
    pageTotalPrice: 0,
  };
  let usedHeight = FIRST_HEADER_HEIGHT;

  const startNewPage = () => {
    rawPages.push(currentPage);
    currentPage = {
      isFirstPage: false,
      items: [],
      hasMoreItemsAfter: false,
      showTotals: false,
      showNotes: false,
      showTermsAndSignatures: false,
      pageItemCount: 0,
      pageItemRange: '',
      pageTotalArea: 0,
      pageTotalPrice: 0,
    };
    usedHeight = CONT_HEADER_HEIGHT;
  };

  // Step 1: Measure each item's independent font auto-fit while keeping row height strictly fixed (72px)
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const layout = analyzeQuoteItemLayout(item, profiles, addons);
    const rowH = ITEM_ROW_FIXED_HEIGHT;
    const isFirstOnPage = currentPage.items.length === 0;
    const overhead = isFirstOnPage ? TABLE_CHROME_HEIGHT : 0;
    const hasRemainingItems = idx < items.length - 1;
    const reserveForIndicator = hasRemainingItems ? INDICATOR_HEIGHT : 0;

    if (!isFirstOnPage && usedHeight + overhead + rowH + reserveForIndicator > SAFE_PAGE_BUDGET) {
      startNewPage();
    }

    if (currentPage.items.length === 0) {
      usedHeight += TABLE_CHROME_HEIGHT;
    }

    currentPage.items.push({
      item,
      serialNumber: idx + 1,
      isComplex: layout.isComplex,
      isMinArea: layout.isMinArea,
      estimatedHeight: rowH,
      autoFit: layout.autoFit,
    });
    usedHeight += rowH;
  }

  // Step 2: Granular placement of Financial Summary, Notes, and Terms/Signatures
  if (usedHeight + TOTALS_HEIGHT > SAFE_PAGE_BUDGET) {
    const prevPageHadMultipleItems = currentPage.items.length > 1;
    const carriedItem = prevPageHadMultipleItems ? currentPage.items.pop()! : null;
    startNewPage();

    if (carriedItem) {
      const carriedTableHeight = TABLE_CHROME_HEIGHT + carriedItem.estimatedHeight;
      if (usedHeight + carriedTableHeight + TOTALS_HEIGHT <= SAFE_PAGE_BUDGET) {
        currentPage.items.push(carriedItem);
        usedHeight += carriedTableHeight;
      } else {
        // Put item back on previous page if carrying it would overflow the new page's totals
        rawPages[rawPages.length - 1].items.push(carriedItem);
      }
    }
  }
  currentPage.showTotals = true;
  usedHeight += TOTALS_HEIGHT;

  if (NOTES_HEIGHT > 0) {
    if (usedHeight + NOTES_HEIGHT > SAFE_PAGE_BUDGET) {
      startNewPage();
    }
    currentPage.showNotes = true;
    currentPage.notesAutoFit = notesAutoFit;
    usedHeight += NOTES_HEIGHT;
  }

  if (usedHeight + TERMS_AND_SIGNATURES_HEIGHT > SAFE_PAGE_BUDGET) {
    startNewPage();
  }
  currentPage.showTermsAndSignatures = true;

  rawPages.push(currentPage);

  // Compute accurate per-page totals & continuation flags after all item movements are finalized
  finalizePageSummaries(rawPages);

  return rawPages.map((p, index) => ({
    ...p,
    pageNumber: index + 1,
  }));
}

/**
 * Deterministic fingerprint of all data rendered in the PDF so unchanged quotes
 * reuse the already-generated PDF Blob in <5ms.
 */
export function buildQuotePdfCacheKey(
  quoteNumber: string,
  customer: CustomerInfo,
  calculations: CalculationResult,
  profiles: Record<string, Profile>,
  addons: Record<string, Addon>
): string {
  const itemsKey = calculations.itemsCalculated
    .map((it) => {
      const p = profiles[it.profile];
      const addonSig = it.addons
        .map((id) => `${id}:${addons[id]?.name || ''}:${addons[id]?.price || 0}`)
        .join(',');
      return [
        it.id,
        it.title,
        it.itemType,
        it.width,
        it.height,
        it.area.toFixed(3),
        it.quantity || 1,
        it.profile,
        p?.name || '',
        p?.unit || '',
        it.opening,
        it.innerType || 'glass',
        it.glassType,
        it.hingePanes || '',
        it.itemTotal,
        it.profilePrice,
        it.flatProfilePrice || 0,
        it.addonsPrice,
        it.flatAddonsPrice || 0,
        addonSig,
      ].join('|');
    })
    .join(';;');

  const extraNotesKey = (customer.additionalNotes || [])
    .map((n) => `${n.id}:${n.text}:${n.amount}`)
    .join('||');

  return [
    'v3-autofit',
    quoteNumber,
    customer.name || '',
    customer.phone || '',
    customer.address || '',
    customer.date || '',
    customer.deliveryDate || '',
    customer.discountType || 'cash',
    customer.discountValue || 0,
    customer.notes || '',
    customer.notesAmount || 0,
    extraNotesKey,
    calculations.totalArea.toFixed(3),
    calculations.totalPrice,
    itemsKey,
  ].join('###');
}

export function getCachedPdf(cacheKey: string): CachedPdfEntry | undefined {
  return pdfBlobCache.get(cacheKey);
}

function storeCachedPdf(entry: CachedPdfEntry): void {
  if (pdfBlobCache.has(entry.cacheKey)) {
    pdfBlobCache.delete(entry.cacheKey);
  }
  pdfBlobCache.set(entry.cacheKey, entry);
  if (pdfBlobCache.size > MAX_PDF_CACHE_ENTRIES) {
    const oldestKey = pdfBlobCache.keys().next().value;
    if (oldestKey) {
      pdfBlobCache.delete(oldestKey);
    }
  }
}

export function nextPaintFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function selectOptimalPixelRatio(pageCount: number): number {
  if (pageCount <= 6) return 2.0; // 1588 × 2246 px (~192 DPI crisp print quality)
  if (pageCount <= 12) return 1.85; // ~178 DPI for large multi-page quotes
  return 1.7; // ~163 DPI memory-safe cap for 13+ pages (50+ items)
}

async function capturePageNodeToJpeg(
  node: HTMLElement,
  pixelRatio: number,
  fontEmbedCSS: string
): Promise<string> {
  // IMPORTANT: Do NOT pass multiplied canvasWidth/canvasHeight alongside pixelRatio —
  // html-to-image multiplies width * pixelRatio internally!
  const canvas = await htmlToImage.toCanvas(node, {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    pixelRatio,
    backgroundColor: '#ffffff',
    fontEmbedCSS,
    cacheBust: false,
    skipAutoScale: true,
  });

  try {
    return canvas.toDataURL('image/jpeg', 0.94);
  } finally {
    // Release backing GPU/RAM buffer immediately so 20–50+ item quotes stay lightweight
    canvas.width = 0;
    canvas.height = 0;
  }
}

export interface GenerateQuotePdfOptions {
  container: HTMLElement;
  cacheKey: string;
  fileName: string;
  logoSrc: string;
  onProgress?: (progress: PdfGenerationProgress) => void;
}

/**
 * Generates a crisp A4 multi-page PDF Blob using cached assets, non-blocking batched
 * rasterization, and zero-recompression native JPEG DCT streams in jsPDF.
 */
export async function generateQuotePdfBlob({
  container,
  cacheKey,
  fileName,
  logoSrc,
  onProgress,
}: GenerateQuotePdfOptions): Promise<CachedPdfEntry> {
  const existing = pdfBlobCache.get(cacheKey);
  if (existing && existing.blob.size > 0) {
    return existing;
  }

  const pageNodes = Array.from(
    container.querySelectorAll('[data-export-page]')
  ) as HTMLElement[];

  if (pageNodes.length === 0) {
    throw new Error('لم يتم العثور على صفحات لتجهيز ملف PDF');
  }

  const totalPages = pageNodes.length;
  onProgress?.({ completedPages: 0, totalPages });

  // Prepare fonts + logo once in parallel (0ms if already warmed up)
  const fontReadyPromise =
    typeof document !== 'undefined' && 'fonts' in document
      ? Promise.race([
          (document as Document & { fonts: FontFaceSet }).fonts.ready.catch(() => undefined),
          new Promise<void>((r) => window.setTimeout(r, 600)),
        ])
      : Promise.resolve();

  const [, fontEmbedCSS] = await Promise.all([
    preloadLogoDataUrl(logoSrc),
    preloadFontEmbedCss(pageNodes[0]),
    fontReadyPromise,
  ]);

  const pixelRatio = selectOptimalPixelRatio(totalPages);
  const renderedJpegPages: string[] = new Array(totalPages);

  // Process pages in controlled async batches of 2 so browser rasterization overlaps
  // without spiking RAM or freezing the main UI thread, preserving exact page order.
  const CONCURRENCY = 2;
  for (let start = 0; start < totalPages; start += CONCURRENCY) {
    const end = Math.min(start + CONCURRENCY, totalPages);
    const batchPromises: Promise<void>[] = [];

    for (let idx = start; idx < end; idx++) {
      const pageIndex = idx;
      batchPromises.push(
        capturePageNodeToJpeg(pageNodes[pageIndex], pixelRatio, fontEmbedCSS).then((jpegUrl) => {
          renderedJpegPages[pageIndex] = jpegUrl;
        })
      );
    }

    await Promise.all(batchPromises);
    onProgress?.({ completedPages: end, totalPages });

    if (end < totalPages) {
      await yieldToMainThread();
    }
  }

  await yieldToMainThread();

  // Assemble PDF in strict page order using native JPEG DCTDecode passthrough (~1ms/page)
  const pdf = new jspdf({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }
    pdf.addImage(renderedJpegPages[i], 'JPEG', 0, 0, 210, 297);
  }

  const blob = pdf.output('blob');
  if (!blob || blob.size === 0) {
    throw new Error('فشل إنشاء محتوى ملف PDF');
  }

  const entry: CachedPdfEntry = {
    cacheKey,
    blob,
    fileName,
    pageCount: totalPages,
    createdAt: Date.now(),
  };

  storeCachedPdf(entry);
  return entry;
}

/**
 * Triggers an automatic browser file download from a verified PDF Blob without blocking.
 */
export function triggerPdfBlobDownload(blob: Blob, fileName: string): void {
  if (!blob || blob.size === 0) {
    throw new Error('ملف PDF غير صالح للتنزيل');
  }
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke after 30s to allow mobile browsers plenty of time to stream the download
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 30000);
}
