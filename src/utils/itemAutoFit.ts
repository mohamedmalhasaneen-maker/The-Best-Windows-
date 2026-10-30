import { Addon, CalculatedItem, CustomerInfo, Profile } from '../types';

// Fixed geometry constants matching the canonical A4 (794×1123) quotation table design
export const ITEM_ROW_FIXED_HEIGHT = 72; // Total fixed <tr> height in px (never grows with long text)
export const ITEM_CELL_INNER_HEIGHT = 60; // Usable inner height per cell after vertical padding & border
export const MIN_ITEM_FONT_PX = 7; // Minimum readable font size (7px)
export const FONT_STEP_PX = 0.5; // Gradual step-down increment

// Exact locked inner text widths for each column inside the 727px fixed-layout table
export const COL_INNER_WIDTHS = {
  serial: 20, // Col 1: 32px - 1px border - 11px padding
  descriptionText: 74, // Col 2: 141px - 1px border - 16px padding - 44px SVG box - 6px gap
  dimensions: 73, // Col 3: 86px - 1px border - 12px padding
  area: 61, // Col 4: 74px - 1px border - 12px padding
  quantity: 33, // Col 5: 42px - 1px border - 8px padding
  details: 115, // Col 6: 132px - 1px border - 16px padding
  addons: 95, // Col 7: 112px - 1px border - 16px padding
  price: 92, // Col 8: 108px - 16px padding
} as const;

export type FontSizeStep =
  | 13
  | 12.5
  | 12
  | 11.5
  | 11
  | 10.5
  | 10
  | 9.5
  | 9
  | 8.5
  | 8
  | 7.5
  | 7;

export type LineHeightStep = 1.3 | 1.26 | 1.22 | 1.18 | 1.14 | 1.12;

// Static Tailwind arbitrary class lookup maps so Vite/Tailwind compiles every utility statically
const FONT_CLASS_BY_PX: Record<string, string> = {
  '13': 'text-[13px]',
  '12.5': 'text-[12.5px]',
  '12': 'text-[12px]',
  '11.5': 'text-[11.5px]',
  '11': 'text-[11px]',
  '10.5': 'text-[10.5px]',
  '10': 'text-[10px]',
  '9.5': 'text-[9.5px]',
  '9': 'text-[9px]',
  '8.5': 'text-[8.5px]',
  '8': 'text-[8px]',
  '7.5': 'text-[7.5px]',
  '7': 'text-[7px]',
};

const LEADING_CLASS_BY_VAL: Record<string, string> = {
  '1.3': 'leading-[1.3]',
  '1.26': 'leading-[1.26]',
  '1.22': 'leading-[1.22]',
  '1.18': 'leading-[1.18]',
  '1.14': 'leading-[1.14]',
  '1.12': 'leading-[1.12]',
};

export function fontPxToClass(px: number): string {
  const snapped = snapHalf(px, MIN_ITEM_FONT_PX, 13);
  return FONT_CLASS_BY_PX[String(snapped)] || 'text-[10px]';
}

export function lineHeightToClass(lh: LineHeightStep): string {
  return LEADING_CLASS_BY_VAL[String(lh)] || 'leading-[1.22]';
}

function snapHalf(value: number, min: number, max: number): FontSizeStep {
  const clamped = Math.max(min, Math.min(max, Math.round(value * 2) / 2));
  return clamped as FontSizeStep;
}

function pickLineHeightForStep(stepIndex: number): LineHeightStep {
  if (stepIndex === 0) return 1.3;
  if (stepIndex <= 2) return 1.26;
  if (stepIndex <= 4) return 1.22;
  if (stepIndex <= 6) return 1.18;
  if (stepIndex <= 8) return 1.14;
  return 1.12;
}

interface ProbeLineDescriptor {
  text: string;
  inlineSuffix?: {
    text: string;
    fontPx: number;
    fontWeight: number;
  };
  fontPx: number;
  fontWeight: number;
  fontFamily: 'sans' | 'display' | 'mono';
  nowrap?: boolean;
  marginTopPx?: number;
}

// Reusable singleton offscreen DOM probe for exact browser glyph shaping, BiDi, and line-wrap measurement
let sharedDomProbe: HTMLDivElement | null = null;

function getSharedDomProbe(): HTMLDivElement | null {
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }
  if (sharedDomProbe && sharedDomProbe.isConnected) {
    return sharedDomProbe;
  }
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.dir = 'rtl';
  el.style.position = 'fixed';
  el.style.top = '-12000px';
  el.style.left = '-12000px';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-9999';
  el.style.boxSizing = 'border-box';
  el.style.padding = '0';
  el.style.margin = '0';
  el.style.contain = 'layout style paint';
  document.body.appendChild(el);
  sharedDomProbe = el;
  return el;
}

function getFontFamilyCss(family: 'sans' | 'display' | 'mono'): string {
  if (family === 'display') return '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif';
  if (family === 'mono') return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  return '"Inter", ui-sans-serif, system-ui, sans-serif';
}

/**
 * Deterministic fallback measurement when running in non-DOM environments (SSR / CLI tests).
 */
function measureLinesFallback(
  lines: ProbeLineDescriptor[],
  boxWidth: number,
  lineHeight: number
): { width: number; height: number } {
  let totalHeight = 0;
  let maxLineWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.marginTopPx) {
      totalHeight += ln.marginTopPx;
    }

    const avgCharWidth = ln.fontPx * (ln.fontWeight >= 800 ? 0.58 : 0.54);
    const fullText = ln.inlineSuffix ? `${ln.text} ${ln.inlineSuffix.text}` : ln.text;

    if (ln.nowrap) {
      const w = fullText.length * avgCharWidth;
      maxLineWidth = Math.max(maxLineWidth, w);
      totalHeight += ln.fontPx * lineHeight;
    } else {
      const paragraphs = (fullText || ' ').split('\n');
      let wrappedCount = 0;
      for (const p of paragraphs) {
        const lineW = p.length * avgCharWidth;
        maxLineWidth = Math.max(maxLineWidth, Math.min(boxWidth, lineW));
        wrappedCount += Math.max(1, Math.ceil(lineW / Math.max(16, boxWidth)));
      }
      totalHeight += wrappedCount * ln.fontPx * lineHeight;
    }
  }

  return { width: Math.ceil(maxLineWidth), height: Math.ceil(totalHeight) };
}

/**
 * Measures the exact rendered pixel width & height of a stack of styled text blocks
 * inside the real browser layout engine at a given column width and line-height.
 */
function measureLinesActual(
  lines: ProbeLineDescriptor[],
  boxWidth: number,
  lineHeight: number
): { width: number; height: number } {
  const probe = getSharedDomProbe();
  if (!probe) {
    return measureLinesFallback(lines, boxWidth, lineHeight);
  }

  probe.style.width = `${boxWidth}px`;
  probe.style.lineHeight = String(lineHeight);
  probe.textContent = '';

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const row = document.createElement('div');
    row.style.margin = '0';
    row.style.padding = '0';
    row.style.marginTop = ln.marginTopPx ? `${ln.marginTopPx}px` : '0px';
    row.style.fontSize = `${ln.fontPx}px`;
    row.style.fontWeight = String(ln.fontWeight);
    row.style.fontFamily = getFontFamilyCss(ln.fontFamily);
    row.style.lineHeight = String(lineHeight);

    if (ln.nowrap) {
      row.style.whiteSpace = 'nowrap';
    } else {
      row.style.whiteSpace = 'pre-wrap';
      row.style.overflowWrap = 'anywhere';
      row.style.wordBreak = 'break-word';
    }

    const mainSpan = document.createElement('span');
    mainSpan.textContent = ln.text;
    row.appendChild(mainSpan);

    if (ln.inlineSuffix) {
      const suffixSpan = document.createElement('span');
      suffixSpan.style.fontSize = `${ln.inlineSuffix.fontPx}px`;
      suffixSpan.style.fontWeight = String(ln.inlineSuffix.fontWeight);
      suffixSpan.style.marginRight = '4px';
      suffixSpan.textContent = ln.inlineSuffix.text;
      row.appendChild(suffixSpan);
    }

    probe.appendChild(row);
  }

  const height = probe.scrollHeight;
  const width = probe.scrollWidth;
  probe.textContent = '';
  return { width, height };
}

export interface DescriptionCellFit {
  titleClass: string;
  badgeClass: string;
  subClass: string;
  leadingClass: string;
  subMarginClass: string;
  titleFontPx: FontSizeStep;
  fitsAtMin: boolean;
}

export interface DetailsCellFit {
  titleClass: string;
  subClass: string;
  leadingClass: string;
  gapClass: string;
  titleFontPx: FontSizeStep;
  fitsAtMin: boolean;
}

export interface AddonsCellFit {
  textClass: string;
  leadingClass: string;
  gapClass: string;
  fontPx: FontSizeStep;
  fitsAtMin: boolean;
}

export interface PriceCellFit {
  totalClass: string;
  subClass: string;
  badgeClass: string;
  leadingClass: string;
  totalFontPx: FontSizeStep;
  fitsAtMin: boolean;
}

export interface SimpleMetricCellFit {
  mainClass: string;
  badgeClass: string;
  leadingClass: string;
  fitsAtMin: boolean;
}

export interface ItemRowAutoFit {
  description: DescriptionCellFit;
  dimensions: SimpleMetricCellFit;
  area: SimpleMetricCellFit;
  quantity: SimpleMetricCellFit;
  details: DetailsCellFit;
  addons: AddonsCellFit;
  price: PriceCellFit;
  hasOverflow: boolean;
  overflowColumns: string[];
}

const MAX_FIT_CACHE_SIZE = 600;
const itemFitCache = new Map<string, ItemRowAutoFit>();

function getItemTypeArabicLabel(itemType: CalculatedItem['itemType']): string {
  switch (itemType) {
    case 'armored_door':
      return 'باب مصفح';
    case 'door':
      return 'باب';
    case 'balcony':
      return 'بلكونة';
    default:
      return 'شباك';
  }
}

function fitDescriptionCell(item: CalculatedItem): DescriptionCellFit {
  const titleText = (item.title || '').trim() || 'بند';
  const typeLabel = `· ${getItemTypeArabicLabel(item.itemType)}`;
  const openingText = `نظام الفتح: ${item.opening}`;

  // Step down from 12px to MIN_ITEM_FONT_PX (7px) in 0.5px increments
  const totalSteps = Math.round((12 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  for (let step = 0; step <= totalSteps; step++) {
    const titlePx = snapHalf(12 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 12);
    const badgePx = snapHalf(10 - step * 0.35, MIN_ITEM_FONT_PX, 10);
    const subPx = snapHalf(10 - step * 0.35, MIN_ITEM_FONT_PX, 10);
    const lh = pickLineHeightForStep(step);
    const mtPx = step >= 4 ? 1 : 2;

    const measured = measureLinesActual(
      [
        {
          text: titleText,
          inlineSuffix: { text: typeLabel, fontPx: badgePx, fontWeight: 600 },
          fontPx: titlePx,
          fontWeight: 700,
          fontFamily: 'sans',
        },
        {
          text: openingText,
          fontPx: subPx,
          fontWeight: 500,
          fontFamily: 'sans',
          marginTopPx: mtPx,
        },
      ],
      COL_INNER_WIDTHS.descriptionText,
      lh
    );

    if (
      measured.height <= ITEM_CELL_INNER_HEIGHT &&
      measured.width <= COL_INNER_WIDTHS.descriptionText + 1
    ) {
      return {
        titleClass: fontPxToClass(titlePx),
        badgeClass: fontPxToClass(badgePx),
        subClass: fontPxToClass(subPx),
        leadingClass: lineHeightToClass(lh),
        subMarginClass: step >= 4 ? 'mt-0' : 'mt-0.5',
        titleFontPx: titlePx,
        fitsAtMin: true,
      };
    }
  }

  return {
    titleClass: fontPxToClass(MIN_ITEM_FONT_PX),
    badgeClass: fontPxToClass(MIN_ITEM_FONT_PX),
    subClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    subMarginClass: 'mt-0',
    titleFontPx: MIN_ITEM_FONT_PX,
    fitsAtMin: false,
  };
}

function fitDetailsCell(item: CalculatedItem, profiles: Record<string, Profile>): DetailsCellFit {
  const profileName = profiles[item.profile]?.name || item.profile || '';
  const innerLabel =
    item.innerType === 'panel'
      ? 'بنل بالكامل'
      : item.innerType === 'panel_glass'
      ? 'بنل مع زجاج'
      : 'زجاج بالكامل';

  const totalSteps = Math.round((11 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  for (let step = 0; step <= totalSteps; step++) {
    const titlePx = snapHalf(11 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 11);
    const subPx = snapHalf(10 - step * 0.4, MIN_ITEM_FONT_PX, 10);
    const lh = pickLineHeightForStep(step);
    const gapPx = step >= 3 ? 0 : 1;

    const lines: ProbeLineDescriptor[] = [
      { text: profileName, fontPx: titlePx, fontWeight: 700, fontFamily: 'sans' },
      { text: innerLabel, fontPx: subPx, fontWeight: 500, fontFamily: 'sans', marginTopPx: gapPx },
    ];
    if (item.innerType !== 'panel') {
      lines.push({
        text: `زجاج: ${item.glassType}`,
        fontPx: subPx,
        fontWeight: 500,
        fontFamily: 'sans',
        marginTopPx: gapPx,
      });
    }
    if (item.opening === 'مفصلي') {
      lines.push({
        text: `ضلف: ${item.hingePanes || 'ضلفة'}`,
        fontPx: subPx,
        fontWeight: 700,
        fontFamily: 'sans',
        marginTopPx: gapPx,
      });
    }

    const measured = measureLinesActual(lines, COL_INNER_WIDTHS.details, lh);
    if (
      measured.height <= ITEM_CELL_INNER_HEIGHT &&
      measured.width <= COL_INNER_WIDTHS.details + 1
    ) {
      return {
        titleClass: fontPxToClass(titlePx),
        subClass: fontPxToClass(subPx),
        leadingClass: lineHeightToClass(lh),
        gapClass: step >= 3 ? 'space-y-0' : 'space-y-0.5',
        titleFontPx: titlePx,
        fitsAtMin: true,
      };
    }
  }

  return {
    titleClass: fontPxToClass(MIN_ITEM_FONT_PX),
    subClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    gapClass: 'space-y-0',
    titleFontPx: MIN_ITEM_FONT_PX,
    fitsAtMin: false,
  };
}

function fitAddonsCell(item: CalculatedItem, addons: Record<string, Addon>): AddonsCellFit {
  if (item.addons.length === 0) {
    return {
      textClass: 'text-[10px]',
      leadingClass: 'leading-[1.3]',
      gapClass: 'gap-0.5',
      fontPx: 10,
      fitsAtMin: true,
    };
  }

  const labels = item.addons.map((id) => `• ${addons[id]?.name || id}`);
  const totalSteps = Math.round((10 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);

  for (let step = 0; step <= totalSteps; step++) {
    const fontPx = snapHalf(10 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 10);
    const lh = pickLineHeightForStep(step + 1);
    const gapPx = step >= 2 ? 0 : 2;

    const lines: ProbeLineDescriptor[] = labels.map((text, idx) => ({
      text,
      fontPx,
      fontWeight: 700,
      fontFamily: 'sans',
      marginTopPx: idx === 0 ? 0 : gapPx,
    }));

    const measured = measureLinesActual(lines, COL_INNER_WIDTHS.addons, lh);
    if (
      measured.height <= ITEM_CELL_INNER_HEIGHT &&
      measured.width <= COL_INNER_WIDTHS.addons + 1
    ) {
      return {
        textClass: fontPxToClass(fontPx),
        leadingClass: lineHeightToClass(lh),
        gapClass: step >= 2 ? 'gap-0' : 'gap-0.5',
        fontPx,
        fitsAtMin: true,
      };
    }
  }

  return {
    textClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    gapClass: 'gap-0',
    fontPx: MIN_ITEM_FONT_PX,
    fitsAtMin: false,
  };
}

function fitPriceCell(
  item: CalculatedItem,
  profiles: Record<string, Profile>,
  formatCurrency: (val: number) => string
): PriceCellFit {
  const totalText = formatCurrency(item.itemTotal);
  const unitText =
    item.flatProfilePrice && item.flatProfilePrice > 0
      ? `${formatCurrency(item.flatProfilePrice)} / ${profiles[item.profile]?.unit || 'للقطعة'}`
      : `${formatCurrency(item.profilePrice + item.addonsPrice)} / م²`;
  const qtyText =
    item.quantity && item.quantity > 1
      ? `(${formatCurrency(item.itemTotal / item.quantity)} × ${item.quantity})`
      : '';
  const flatText =
    item.flatAddonsPrice && item.flatAddonsPrice > 0
      ? `+ ${formatCurrency(item.flatAddonsPrice)} (مقطوع)`
      : '';

  const totalSteps = Math.round((13 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  for (let step = 0; step <= totalSteps; step++) {
    const totalPx = snapHalf(13 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 13);
    const subPx = snapHalf(9.5 - step * 0.3, MIN_ITEM_FONT_PX, 9.5);
    const badgePx = snapHalf(9 - step * 0.3, MIN_ITEM_FONT_PX, 9);
    const lh = pickLineHeightForStep(step);
    const gapPx = step >= 3 ? 0 : 1;

    const lines: ProbeLineDescriptor[] = [
      { text: totalText, fontPx: totalPx, fontWeight: 900, fontFamily: 'display', nowrap: true },
      {
        text: unitText,
        fontPx: subPx,
        fontWeight: 500,
        fontFamily: 'sans',
        nowrap: true,
        marginTopPx: gapPx,
      },
    ];
    if (qtyText) {
      lines.push({
        text: qtyText,
        fontPx: badgePx,
        fontWeight: 700,
        fontFamily: 'sans',
        nowrap: true,
        marginTopPx: gapPx,
      });
    }
    if (flatText) {
      lines.push({
        text: flatText,
        fontPx: badgePx,
        fontWeight: 700,
        fontFamily: 'sans',
        nowrap: true,
        marginTopPx: gapPx,
      });
    }

    const measured = measureLinesActual(lines, COL_INNER_WIDTHS.price, lh);
    if (
      measured.height <= ITEM_CELL_INNER_HEIGHT &&
      measured.width <= COL_INNER_WIDTHS.price + 2
    ) {
      return {
        totalClass: fontPxToClass(totalPx),
        subClass: fontPxToClass(subPx),
        badgeClass: fontPxToClass(badgePx),
        leadingClass: lineHeightToClass(lh),
        totalFontPx: totalPx,
        fitsAtMin: true,
      };
    }
  }

  return {
    totalClass: fontPxToClass(MIN_ITEM_FONT_PX),
    subClass: fontPxToClass(MIN_ITEM_FONT_PX),
    badgeClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    totalFontPx: MIN_ITEM_FONT_PX,
    fitsAtMin: false,
  };
}

function fitAreaCell(item: CalculatedItem, isMinArea: boolean): SimpleMetricCellFit {
  const areaText = `${item.area.toFixed(2)} م²`;
  const minText = '(حد أدنى 1.0 م²)';

  const totalSteps = Math.round((11 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  for (let step = 0; step <= totalSteps; step++) {
    const mainPx = snapHalf(11 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 11);
    const badgePx = snapHalf(9 - step * 0.35, MIN_ITEM_FONT_PX, 9);
    const lh = pickLineHeightForStep(step);

    const lines: ProbeLineDescriptor[] = [
      { text: areaText, fontPx: mainPx, fontWeight: 700, fontFamily: 'sans', nowrap: true },
    ];
    if (isMinArea) {
      lines.push({
        text: minText,
        fontPx: badgePx,
        fontWeight: 700,
        fontFamily: 'sans',
        nowrap: true,
        marginTopPx: step >= 3 ? 0 : 2,
      });
    }

    const measured = measureLinesActual(lines, COL_INNER_WIDTHS.area, lh);
    if (measured.height <= ITEM_CELL_INNER_HEIGHT && measured.width <= COL_INNER_WIDTHS.area + 2) {
      return {
        mainClass: fontPxToClass(mainPx),
        badgeClass: fontPxToClass(badgePx),
        leadingClass: lineHeightToClass(lh),
        fitsAtMin: true,
      };
    }
  }

  return {
    mainClass: fontPxToClass(MIN_ITEM_FONT_PX),
    badgeClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    fitsAtMin: false,
  };
}

function fitSingleLineNumericCell(
  text: string,
  boxWidth: number,
  startPx: FontSizeStep = 11
): SimpleMetricCellFit {
  const totalSteps = Math.round((startPx - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  for (let step = 0; step <= totalSteps; step++) {
    const px = snapHalf(startPx - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, startPx);
    const measured = measureLinesActual(
      [{ text, fontPx: px, fontWeight: 700, fontFamily: 'mono', nowrap: true }],
      boxWidth,
      1.22
    );
    if (measured.width <= boxWidth + 2 && measured.height <= ITEM_CELL_INNER_HEIGHT) {
      return {
        mainClass: fontPxToClass(px),
        badgeClass: fontPxToClass(px),
        leadingClass: 'leading-[1.22]',
        fitsAtMin: true,
      };
    }
  }
  return {
    mainClass: fontPxToClass(MIN_ITEM_FONT_PX),
    badgeClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: 'leading-[1.14]',
    fitsAtMin: false,
  };
}

const defaultCurrencyFormatter = (value: number): string =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ج.م`;

/**
 * Computes independent, per-item auto-shrinking font metrics for every cell of a quotation row
 * using actual text measurement. Cached in memory so Preview, PDF Export, and Print share
 * identical results in O(1) time.
 */
export function computeItemRowAutoFit(
  item: CalculatedItem,
  profiles: Record<string, Profile>,
  addons: Record<string, Addon>,
  formatCurrency: (val: number) => string = defaultCurrencyFormatter
): ItemRowAutoFit {
  const isBrowserDom = typeof document !== 'undefined' && Boolean(document.body);
  const profileObj = profiles[item.profile];
  const addonSig = item.addons.map((id) => `${id}:${addons[id]?.name || ''}`).join(',');
  const cacheKey = [
    isBrowserDom ? 'dom' : 'ssr',
    item.title,
    item.itemType,
    item.width,
    item.height,
    item.area.toFixed(2),
    item.quantity || 1,
    item.profile,
    profileObj?.name || '',
    profileObj?.unit || '',
    item.opening,
    item.innerType || 'glass',
    item.glassType,
    item.hingePanes || '',
    item.itemTotal,
    item.profilePrice,
    item.flatProfilePrice || 0,
    item.addonsPrice,
    item.flatAddonsPrice || 0,
    addonSig,
  ].join('|');

  const cached = itemFitCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const isMinArea = (item.width * item.height) / 10000 < 1.0;

  const description = fitDescriptionCell(item);
  const dimensions = fitSingleLineNumericCell(
    `${item.width} × ${item.height}`,
    COL_INNER_WIDTHS.dimensions,
    11
  );
  const area = fitAreaCell(item, isMinArea);
  const quantity = fitSingleLineNumericCell(
    String(item.quantity || 1),
    COL_INNER_WIDTHS.quantity,
    11
  );
  const details = fitDetailsCell(item, profiles);
  const addonsFit = fitAddonsCell(item, addons);
  const price = fitPriceCell(item, profiles, formatCurrency);

  const overflowColumns: string[] = [];
  if (!description.fitsAtMin) overflowColumns.push('بيان البند');
  if (!details.fitsAtMin) overflowColumns.push('تفاصيل القطاع');
  if (!addonsFit.fitsAtMin) overflowColumns.push('الإضافات');
  if (!price.fitsAtMin) overflowColumns.push('إجمالي البند');
  if (!dimensions.fitsAtMin) overflowColumns.push('المقاسات');
  if (!area.fitsAtMin) overflowColumns.push('المساحة');

  const result: ItemRowAutoFit = {
    description,
    dimensions,
    area,
    quantity,
    details,
    addons: addonsFit,
    price,
    hasOverflow: overflowColumns.length > 0,
    overflowColumns,
  };

  if (itemFitCache.size >= MAX_FIT_CACHE_SIZE) {
    const oldest = itemFitCache.keys().next().value;
    if (oldest) itemFitCache.delete(oldest);
  }
  itemFitCache.set(cacheKey, result);

  return result;
}

export interface NotesSectionAutoFit {
  textClass: string;
  leadingClass: string;
  estimatedHeight: number;
  hasOverflow: boolean;
}

/**
 * Measures the quote's general & additional notes section and auto-shrinks its font
 * only if an exceptionally long note would exceed a full A4 page's available height.
 */
export function computeNotesSectionAutoFit(
  customer: CustomerInfo,
  maxAllowedHeight: number = 880
): NotesSectionAutoFit {
  const mainNote = (customer.notes || '').trim();
  const extraNotes = (customer.additionalNotes || []).filter(
    (n) => n.text && n.text.trim().length > 0
  );

  if (!mainNote && extraNotes.length === 0) {
    return {
      textClass: 'text-[12px]',
      leadingClass: 'leading-[1.3]',
      estimatedHeight: 0,
      hasOverflow: false,
    };
  }

  const NOTES_INNER_WIDTH = 702; // 730px sheet inner width - 24px padding - 4px borders
  const baseChromeHeight =
    48 +
    (mainNote && customer.notesAmount ? 28 : 0) +
    extraNotes.reduce((sum, n) => sum + (n.amount ? 34 : 12), 0);

  const totalSteps = Math.round((12 - MIN_ITEM_FONT_PX) / FONT_STEP_PX);
  let lastMeasuredHeight = baseChromeHeight;

  for (let step = 0; step <= totalSteps; step++) {
    const fontPx = snapHalf(12 - step * FONT_STEP_PX, MIN_ITEM_FONT_PX, 12);
    const lh = pickLineHeightForStep(step);

    const blocks: ProbeLineDescriptor[] = [];
    if (mainNote) {
      blocks.push({ text: mainNote, fontPx, fontWeight: 700, fontFamily: 'sans' });
    }
    for (const n of extraNotes) {
      blocks.push({
        text: n.text.trim(),
        fontPx,
        fontWeight: 700,
        fontFamily: 'sans',
        marginTopPx: 6,
      });
    }

    const measured = measureLinesActual(blocks, NOTES_INNER_WIDTH, lh);
    const totalH = baseChromeHeight + measured.height + 10;
    lastMeasuredHeight = totalH;

    if (totalH <= maxAllowedHeight) {
      return {
        textClass: fontPxToClass(fontPx),
        leadingClass: lineHeightToClass(lh),
        estimatedHeight: totalH,
        hasOverflow: false,
      };
    }
  }

  return {
    textClass: fontPxToClass(MIN_ITEM_FONT_PX),
    leadingClass: lineHeightToClass(1.12),
    estimatedHeight: Math.min(maxAllowedHeight, lastMeasuredHeight),
    hasOverflow: true,
  };
}
