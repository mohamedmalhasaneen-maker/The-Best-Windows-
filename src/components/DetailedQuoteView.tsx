import React from 'react';
import { CustomerInfo, CalculatedItem, CalculationResult, Profile, Addon } from '../types';
import {
  Download,
  Share2,
  ChevronRight,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import jspdf from 'jspdf';
import * as htmlToImage from 'html-to-image';
import logoUrl from '../assets/images/the_best_windows_logo.jpeg';
import { BRAND_NAME, COMPANY_LOCATIONS } from '../constants';

interface Props {
  customer: CustomerInfo;
  calculations: CalculationResult;
  formatCurrency: (value: number) => string;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  isMobileViewport?: boolean;
}

// Canonical A4 Portrait dimensions at 96 DPI (210mm × 297mm -> exact 1 : 1.4142857 ratio)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

interface IndexedQuoteItem {
  item: CalculatedItem;
  serialNumber: number;
}

interface QuotePageDescriptor {
  pageNumber: number;
  isFirstPage: boolean;
  items: IndexedQuoteItem[];
  hasMoreItemsAfter: boolean;
  showTotals: boolean;
  showNotes: boolean;
  showTermsAndSignatures: boolean;
}

function estimateItemRowHeight(item: CalculatedItem): number {
  const extraAddons = Math.max(0, item.addons.length - 2);
  const titleLines = item.title && item.title.length > 28 ? 14 : 0;
  return 62 + extraAddons * 14 + titleLines;
}

function estimateNotesHeight(customer: CustomerInfo): number {
  const mainNote = (customer.notes || '').trim();
  const extraNotes = (customer.additionalNotes || []).filter((n) => n.text && n.text.trim().length > 0);
  if (!mainNote && extraNotes.length === 0) return 0;

  let height = 52;
  if (mainNote) {
    const lines = Math.max(1, Math.ceil(mainNote.length / 75) + (mainNote.split('\n').length - 1));
    height += lines * 20 + (customer.notesAmount ? 28 : 10);
  }
  for (const n of extraNotes) {
    const text = n.text.trim();
    const lines = Math.max(1, Math.ceil(text.length / 75) + (text.split('\n').length - 1));
    height += lines * 20 + (n.amount ? 28 : 14);
  }
  return height;
}

function paginateQuoteIntoA4Pages(
  items: CalculatedItem[],
  customer: CustomerInfo
): QuotePageDescriptor[] {
  // Inner vertical height available above the fixed bottom citation bar (~965px safe budget out of 1037px)
  const SAFE_PAGE_BUDGET = 955;
  const FIRST_HEADER_HEIGHT = 186;
  const CONT_HEADER_HEIGHT = 62;
  const TABLE_HEADER_HEIGHT = 38;
  const TOTALS_HEIGHT =
    (customer.discountValue && customer.discountValue > 0) ||
    (customer.notesAmount && customer.notesAmount !== 0) ||
    (customer.additionalNotes && customer.additionalNotes.some((n) => (n.amount || 0) !== 0))
      ? 98
      : 84;
  const NOTES_HEIGHT = estimateNotesHeight(customer);
  const hasNotes = NOTES_HEIGHT > 0;
  const TERMS_AND_SIGNATURES_HEIGHT = 248;

  const rawPages: Omit<QuotePageDescriptor, 'pageNumber'>[] = [];

  let currentPage: Omit<QuotePageDescriptor, 'pageNumber'> = {
    isFirstPage: true,
    items: [],
    hasMoreItemsAfter: false,
    showTotals: false,
    showNotes: false,
    showTermsAndSignatures: false,
  };
  let usedHeight = FIRST_HEADER_HEIGHT;

  const startContinuationPage = () => {
    rawPages.push(currentPage);
    currentPage = {
      isFirstPage: false,
      items: [],
      hasMoreItemsAfter: false,
      showTotals: false,
      showNotes: false,
      showTermsAndSignatures: false,
    };
    usedHeight = CONT_HEADER_HEIGHT;
  };

  items.forEach((item, idx) => {
    const rowH = estimateItemRowHeight(item);
    const tableOverhead = currentPage.items.length === 0 ? TABLE_HEADER_HEIGHT + 14 : 0;

    if (currentPage.items.length > 0 && usedHeight + tableOverhead + rowH > SAFE_PAGE_BUDGET) {
      currentPage.hasMoreItemsAfter = true;
      startContinuationPage();
    }

    if (currentPage.items.length === 0) {
      usedHeight += TABLE_HEADER_HEIGHT + 14;
    }

    currentPage.items.push({
      item,
      serialNumber: idx + 1,
    });
    usedHeight += rowH;
  });

  // Place Grand Totals
  if (usedHeight + TOTALS_HEIGHT > SAFE_PAGE_BUDGET && currentPage.items.length > 0) {
    startContinuationPage();
  }
  currentPage.showTotals = true;
  usedHeight += TOTALS_HEIGHT;

  // Place Custom Notes (if any)
  if (hasNotes) {
    if (usedHeight + NOTES_HEIGHT > SAFE_PAGE_BUDGET) {
      startContinuationPage();
    }
    currentPage.showNotes = true;
    usedHeight += NOTES_HEIGHT;
  }

  // Place Official Terms & Signatures
  if (usedHeight + TERMS_AND_SIGNATURES_HEIGHT > SAFE_PAGE_BUDGET) {
    startContinuationPage();
  }
  currentPage.showTermsAndSignatures = true;

  rawPages.push(currentPage);

  return rawPages.map((p, index) => ({
    ...p,
    pageNumber: index + 1,
  }));
}

function MiniItemPreview({ item }: { item: CalculatedItem }) {
  const width = item.width || 100;
  const height = item.height || 100;
  const aspect = width / height;
  const clampedAspect = Math.max(0.5, Math.min(2.0, aspect));

  let svgWidth = 42;
  let svgHeight = 42;
  if (clampedAspect > 1) {
    svgHeight = Math.round(42 / clampedAspect);
    svgWidth = 42;
  } else {
    svgWidth = Math.round(42 * clampedAspect);
    svgHeight = 42;
  }

  const isDoor = item.itemType === 'door';
  const opening = item.opening;
  const innerType = item.innerType || 'glass';
  const hasSpecialColor = item.addons.includes('specialColor');

  const frameOuterColor = hasSpecialColor ? '#334155' : '#E2E8F0';
  const frameInnerColor = hasSpecialColor ? '#1E293B' : '#F1F5F9';
  const frameStrokeColor = hasSpecialColor ? '#0F172A' : '#94A3B8';

  let glassFill = 'rgba(224, 242, 254, 0.4)';
  switch (item.glassType) {
    case 'أبيض شفاف':
      glassFill = 'rgba(186, 230, 253, 0.35)';
      break;
    case 'مصنفر':
      glassFill = 'rgba(241, 245, 249, 0.75)';
      break;
    case 'بني عاكس':
      glassFill = 'rgba(180, 83, 9, 0.4)';
      break;
    case 'أبيض عاكس':
      glassFill = 'rgba(226, 232, 240, 0.6)';
      break;
    case 'بني سن دبوس':
      glassFill = 'rgba(120, 53, 4, 0.45)';
      break;
    case 'أزرق عاكس':
      glassFill = 'rgba(29, 78, 216, 0.4)';
      break;
    case 'أخضر عاكس':
      glassFill = 'rgba(4, 120, 87, 0.4)';
      break;
    case 'أسود عاكس':
      glassFill = 'rgba(15, 23, 42, 0.7)';
      break;
    case 'مع جورجيا':
      glassFill = 'rgba(186, 230, 253, 0.35)';
      break;
    default:
      glassFill = 'rgba(186, 230, 253, 0.3)';
  }

  const pSize = 3;
  const margin = 2;
  const drawW = svgWidth - margin * 2;
  const drawH = svgHeight - margin * 2;

  const renderContent = () => {
    const paneX = margin + pSize;
    const paneY = margin + pSize;
    const paneW = drawW - pSize * 2;
    const paneH = drawH - pSize * 2;

    const isDoubleSash =
      opening === 'جرار' ||
      (opening === 'مفصلي' &&
        (item.hingePanes === 'ضلفتين' ||
          item.addons.includes('skewWindow2') ||
          item.addons.includes('skewBalcony2')));

    if (isDoor) {
      if (innerType === 'panel') {
        if (isDoubleSash) {
          const midX = paneX + paneW / 2;
          return (
            <g>
              <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
              {Array.from({ length: 6 }).map((_, i) => {
                const ly = paneY + (paneH / 7) * (i + 1);
                return <line key={i} x1={paneX + 1} y1={ly} x2={midX - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
              })}
              <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
              {Array.from({ length: 6 }).map((_, i) => {
                const ly = paneY + (paneH / 7) * (i + 1);
                return <line key={i} x1={midX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
              })}
            </g>
          );
        }
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
            {Array.from({ length: 6 }).map((_, i) => {
              const ly = paneY + (paneH / 7) * (i + 1);
              return <line key={i} x1={paneX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
            })}
          </g>
        );
      } else if (innerType === 'panel_glass') {
        const splitY = paneY + paneH * 0.45;
        if (isDoubleSash) {
          const midX = paneX + paneW / 2;
          return (
            <g>
              <rect x={paneX} y={paneY} width={paneW / 2} height={splitY - paneY} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
              <path d={`M ${paneX + 1} ${paneY + 1} L ${midX - 1} ${paneY + 1} L ${paneX + 1} ${splitY - 1} Z`} fill="rgba(255,255,255,0.15)" />
              <rect x={paneX - 0.5} y={splitY} width={paneW / 2 + 0.5} height="2.5" fill={frameOuterColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <rect x={paneX} y={splitY + 2.5} width={paneW / 2} height={paneH - (splitY - paneY) - 2.5} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
              {Array.from({ length: 3 }).map((_, i) => {
                const ly = splitY + 2.5 + ((paneH - (splitY - paneY) - 2.5) / 4) * (i + 1);
                return <line key={i} x1={paneX + 1} y1={ly} x2={midX - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
              })}

              <rect x={midX} y={paneY} width={paneW / 2} height={splitY - paneY} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
              <path d={`M ${midX + 1} ${paneY + 1} L ${paneX + paneW - 1} ${paneY + 1} L ${midX + 1} ${splitY - 1} Z`} fill="rgba(255,255,255,0.15)" />
              <rect x={midX} y={splitY} width={paneW / 2 + 0.5} height="2.5" fill={frameOuterColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <rect x={midX} y={splitY + 2.5} width={paneW / 2} height={paneH - (splitY - paneY) - 2.5} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
              {Array.from({ length: 3 }).map((_, i) => {
                const ly = splitY + 2.5 + ((paneH - (splitY - paneY) - 2.5) / 4) * (i + 1);
                return <line key={i} x1={midX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
              })}
            </g>
          );
        }
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={splitY - paneY} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
            <path d={`M ${paneX + 1} ${paneY + 1} L ${paneX + paneW - 1} ${paneY + 1} L ${paneX + 1} ${splitY - 1} Z`} fill="rgba(255,255,255,0.15)" />
            <rect x={paneX - 0.5} y={splitY} width={paneW + 1} height="2.5" fill={frameOuterColor} stroke={frameStrokeColor} strokeWidth="0.5" />
            <rect x={paneX} y={splitY + 2.5} width={paneW} height={paneH - (splitY - paneY) - 2.5} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
            {Array.from({ length: 3 }).map((_, i) => {
              const ly = splitY + 2.5 + ((paneH - (splitY - paneY) - 2.5) / 4) * (i + 1);
              return <line key={i} x1={paneX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
            })}
          </g>
        );
      } else {
        if (isDoubleSash) {
          const midX = paneX + paneW / 2;
          return (
            <g>
              <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
              <path d={`M ${paneX + 1} ${paneY + 1} L ${midX - 1} ${paneY + 1} L ${paneX + 1} ${paneY + paneH - 1} Z`} fill="rgba(255,255,255,0.15)" />
              <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
              <path d={`M ${midX + 1} ${paneY + 1} L ${paneX + paneW - 1} ${paneY + 1} L ${midX + 1} ${paneY + paneH - 1} Z`} fill="rgba(255,255,255,0.15)" />
            </g>
          );
        }
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.75" />
            <path d={`M ${paneX + 1} ${paneY + 1} L ${paneX + paneW - 1} ${paneY + 1} L ${paneX + 1} ${paneY + paneH - 1} Z`} fill="rgba(255,255,255,0.15)" />
          </g>
        );
      }
    }

    if (innerType === 'panel') {
      if (isDoubleSash) {
        const midX = paneX + paneW / 2;
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
            {Array.from({ length: 4 }).map((_, i) => {
              const ly = paneY + (paneH / 5) * (i + 1);
              return <line key={i} x1={paneX + 1} y1={ly} x2={midX - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
            })}
            <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
            {Array.from({ length: 4 }).map((_, i) => {
              const ly = paneY + (paneH / 5) * (i + 1);
              return <line key={i} x1={midX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
            })}
            {opening === 'مفصلي' && (
              <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
                <polyline points={`${midX - 1},${paneY + 1} ${paneX + 1},${paneY + paneH / 2} ${midX - 1},${paneY + paneH - 1}`} />
                <polyline points={`${midX + 1},${paneY + 1} ${paneX + paneW - 1},${paneY + paneH / 2} ${midX + 1},${paneY + paneH - 1}`} />
              </g>
            )}
          </g>
        );
      }
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.75" />
          {Array.from({ length: 4 }).map((_, i) => {
            const ly = paneY + (paneH / 5) * (i + 1);
            return <line key={i} x1={paneX + 1} y1={ly} x2={paneX + paneW - 1} y2={ly} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />;
          })}
          {opening === 'مفصلي' && (
            <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
              <polyline points={`${paneX + paneW - 1},${paneY + 1} ${paneX + 1},${paneY + paneH / 2} ${paneX + paneW - 1},${paneY + paneH - 1}`} />
            </g>
          )}
          {opening === 'قلاب' && (
            <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
              <polyline points={`${paneX + 1},${paneY + paneH - 1} ${paneX + paneW / 2},${paneY + 1} ${paneX + paneW - 1},${paneY + paneH - 1}`} />
            </g>
          )}
        </g>
      );
    }

    if (opening === 'جرار') {
      const midX = paneX + paneW / 2;
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
          <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
          <rect x={paneX + 1} y={paneY + 1} width={paneW / 2 - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1" />
          <rect x={midX + 1} y={paneY + 1} width={paneW / 2 - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1" />
          <path d={`M ${paneX + 2} ${paneY + paneH / 2} L ${paneX + 5} ${paneY + paneH / 2}`} stroke="#475569" strokeWidth="0.5" />
          <path d={`M ${midX + paneW / 2 - 2} ${paneY + paneH / 2} L ${midX + paneW / 2 - 5} ${paneY + paneH / 2}`} stroke="#475569" strokeWidth="0.5" />

          {innerType === 'panel_glass' && (
            <g>
              <rect x={paneX + 0.5} y={paneY + paneH * 0.6} width={paneW / 2 - 1} height={paneH * 0.4} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <rect x={midX + 0.5} y={paneY + paneH * 0.6} width={paneW / 2 - 1} height={paneH * 0.4} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <line x1={paneX + 1.5} y1={paneY + paneH * 0.8} x2={midX - 1.5} y2={paneY + paneH * 0.8} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
              <line x1={midX + 1.5} y1={paneY + paneH * 0.8} x2={paneX + paneW - 1.5} y2={paneY + paneH * 0.8} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
            </g>
          )}
        </g>
      );
    } else if (opening === 'مفصلي') {
      if (isDoubleSash) {
        const midX = paneX + paneW / 2;
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
            <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
            <rect x={paneX + 1} y={paneY + 1} width={paneW / 2 - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1" />
            <rect x={midX + 1} y={paneY + 1} width={paneW / 2 - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1" />
            <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
              <polyline points={`${midX - 1},${paneY + 1} ${paneX + 1},${paneY + paneH / 2} ${midX - 1},${paneY + paneH - 1}`} />
              <polyline points={`${midX + 1},${paneY + 1} ${paneX + paneW - 1},${paneY + paneH / 2} ${midX + 1},${paneY + paneH - 1}`} />
            </g>
            {innerType === 'panel_glass' && (
              <g>
                <rect x={paneX + 0.5} y={paneY + paneH * 0.65} width={paneW / 2 - 1} height={paneH * 0.35} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
                <rect x={midX + 0.5} y={paneY + paneH * 0.65} width={paneW / 2 - 1} height={paneH * 0.35} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
                <line x1={paneX + 1.5} y1={paneY + paneH * 0.8} x2={midX - 1.5} y2={paneY + paneH * 0.8} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
                <line x1={midX + 1.5} y1={paneY + paneH * 0.8} x2={paneX + paneW - 1.5} y2={paneY + paneH * 0.8} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
              </g>
            )}
          </g>
        );
      }
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
          <rect x={paneX + 1} y={paneY + 1} width={paneW - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1.2" />
          <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
            <polyline points={`${paneX + paneW - 1},${paneY + 1} ${paneX + 1},${paneY + paneH / 2} ${paneX + paneW - 1},${paneY + paneH - 1}`} />
          </g>
          {innerType === 'panel_glass' && (
            <g>
              <rect x={paneX + 0.5} y={paneY + paneH * 0.65} width={paneW - 1} height={paneH * 0.35} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <line x1={paneX + 1.5} y1={paneY + paneH * 0.82} x2={paneX + paneW - 1.5} y2={paneY + paneH * 0.82} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
            </g>
          )}
        </g>
      );
    } else if (opening === 'قلاب') {
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
          <rect x={paneX + 1} y={paneY + 1} width={paneW - 2} height={paneH - 2} fill="none" stroke={frameInnerColor} strokeWidth="1.2" />
          <g stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1,1" fill="none">
            <polyline points={`${paneX + 1},${paneY + paneH - 1} ${paneX + paneW / 2},${paneY + 1} ${paneX + paneW - 1},${paneY + paneH - 1}`} />
          </g>
          {innerType === 'panel_glass' && (
            <g>
              <rect x={paneX + 0.5} y={paneY + paneH * 0.65} width={paneW - 1} height={paneH * 0.35} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
              <line x1={paneX + 1.5} y1={paneY + paneH * 0.82} x2={paneX + paneW - 1.5} y2={paneY + paneH * 0.82} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
            </g>
          )}
        </g>
      );
    }

    return (
      <g>
        <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="0.5" />
        <path d={`M ${paneX + 1} ${paneY + 1} L ${paneX + paneW - 1} ${paneY + 1} L ${paneX + 1} ${paneY + paneH - 1} Z`} fill="rgba(255,255,255,0.15)" />
        {innerType === 'panel_glass' && (
          <g>
            <rect x={paneX + 0.5} y={paneY + paneH * 0.65} width={paneW - 1} height={paneH * 0.35} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="0.5" />
            <line x1={paneX + 1.5} y1={paneY + paneH * 0.82} x2={paneX + paneW - 1.5} y2={paneY + paneH * 0.82} stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} strokeWidth="0.5" />
          </g>
        )}
      </g>
    );
  };

  return (
    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto block" xmlns="http://www.w3.org/2000/svg">
      <rect x={margin} y={margin} width={drawW} height={drawH} fill={frameOuterColor} stroke={frameStrokeColor} strokeWidth="1" rx="1.5" />
      {renderContent()}
    </svg>
  );
}

interface A4PageSheetProps {
  page: QuotePageDescriptor;
  totalPages: number;
  customer: CustomerInfo;
  calculations: CalculationResult;
  formatCurrency: (value: number) => string;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  quoteNumber: string;
  discountAmount: number;
  totalNotesAmount: number;
  finalPrice: number;
  exportMarker?: boolean;
}

function A4PageSheet({
  page,
  totalPages,
  customer,
  calculations,
  formatCurrency,
  profiles,
  addons,
  quoteNumber,
  discountAmount,
  totalNotesAmount,
  finalPrice,
  exportMarker,
}: A4PageSheetProps) {
  const { discountValue = 0, notesAmount = 0, notes = '', additionalNotes = [] } = customer;
  const quoteDate = customer.date || new Date().toISOString().split('T')[0];

  return (
    <div
      data-export-page={exportMarker ? String(page.pageNumber) : undefined}
      dir="rtl"
      className="a4-paper-lock bg-white text-slate-900 box-border flex flex-col justify-between select-none"
      style={{
        width: `${A4_WIDTH}px`,
        height: `${A4_HEIGHT}px`,
        padding: '26px 32px 22px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Upper & Main Content Flow */}
      <div className="flex-1 flex flex-col min-h-0">
        {page.isFirstPage ? (
          <>
            {/* Full Official Document Header (Fixed A4 Paper Geometry) */}
            <div className="flex flex-row justify-between items-stretch gap-5 pb-4 border-b-2 border-slate-900">
              <div className="flex flex-col justify-between text-right flex-1 min-w-0">
                <div className="flex items-center gap-3.5">
                  <img
                    src={logoUrl}
                    alt={`${BRAND_NAME} - شبابيك وأبواب UPVC`}
                    className="w-16 h-16 rounded-2xl border-2 border-[#0F172A] object-cover bg-white shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="text-[26px] leading-tight font-black font-display text-[#0F172A] tracking-tight">
                      {BRAND_NAME}
                    </div>
                    <p className="text-slate-500 font-bold text-[11px] mt-0.5">
                      ذا بيست ويندوز · توريد وتركيب شبابيك وأبواب الـ UPVC & WPC
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-5 text-xs text-slate-600 font-bold tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">تاريخ العرض:</span>
                    <span className="font-mono text-slate-900" dir="ltr">
                      {quoteDate}
                    </span>
                  </div>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">رقم العرض:</span>
                    <span className="font-mono text-slate-900" dir="ltr">
                      {quoteNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 w-[296px] space-y-2 text-right shrink-0">
                <h3 className="text-[10px] font-black text-slate-400 border-b border-slate-200 pb-1.5">
                  بيانات العميل المحترم
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0 font-bold">اسم العميل:</span>
                    <span className="font-black text-slate-900 text-[13px] truncate">
                      {customer.name || `عميل ${BRAND_NAME} الموقر`}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0 font-bold">رقم الهاتف:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums" dir="ltr">
                      {customer.phone || 'لم يحدد'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0 font-bold">موقع التركيب:</span>
                    <span className="font-bold text-slate-900 truncate">
                      {customer.address || 'بناءً على مقاسات العميل'}
                    </span>
                  </div>
                  {customer.deliveryDate && (
                    <div className="flex items-start justify-between gap-3 border-t border-dashed border-slate-200 pt-1">
                      <span className="text-slate-500 shrink-0 font-bold">أقصى تاريخ للتسليم:</span>
                      <span className="font-black text-[#0F172A] font-mono tabular-nums" dir="ltr">
                        {customer.deliveryDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Introduction */}
            <div className="my-3 text-right">
              <p className="text-slate-600 leading-relaxed text-[12px]">
                بناءً على طلبكم الكريم، يسعدنا في{' '}
                <strong className="text-slate-900 font-black">{BRAND_NAME}</strong> تقديم عرض الأسعار والمواصفات الفنية
                التالية للفتحات المطلوبة. جميع قطاعاتنا تركية وأوروبية معتمدة تتميز بأعلى معايير الجودة والعزل التام للأتربة
                والصوت.
              </p>
            </div>
          </>
        ) : (
          /* Compact Continuation Header on Page 2+ */
          <div className="flex flex-row items-center justify-between gap-4 pb-3 mb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt={`${BRAND_NAME} Logo`}
                className="w-9 h-9 rounded-lg border border-[#0F172A] object-cover bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-right">
                <div className="text-base font-black font-display text-[#0F172A] leading-tight">{BRAND_NAME}</div>
                <div className="text-[10px] font-bold text-slate-500">تابع عرض السعر التفصيلي</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 tabular-nums">
              <span>العميل: {customer.name || `عميل ${BRAND_NAME}`}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-slate-900" dir="ltr">
                {quoteNumber}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-900">
                صفحة {page.pageNumber} من {totalPages}
              </span>
            </div>
          </div>
        )}

        {/* Items Table (Rendered on pages that contain line items) */}
        {page.items.length > 0 && (
          <div className="mb-3.5 border-[1.5px] border-slate-900 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-[#0F172A] text-white font-display border-b border-slate-900 font-black text-[11px]">
                  <th className="py-2.5 px-2 text-center w-8 border-l border-slate-800">م</th>
                  <th className="py-2.5 px-2.5 border-l border-slate-800">بيان البند والرسم التوضيحي</th>
                  <th className="py-2.5 px-2 text-center border-l border-slate-800 w-[86px]">المقاسات (سم)</th>
                  <th className="py-2.5 px-2 text-center border-l border-slate-800 w-[74px]">المساحة م²</th>
                  <th className="py-2.5 px-1.5 text-center border-l border-slate-800 w-[42px]">العدد</th>
                  <th className="py-2.5 px-2.5 border-l border-slate-800 w-[132px]">تفاصيل القطاع والزجاج</th>
                  <th className="py-2.5 px-2.5 border-l border-slate-800 w-[112px]">الإضافات</th>
                  <th className="py-2.5 px-2.5 text-left w-[108px]">إجمالي البند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {page.items.map(({ item, serialNumber }) => {
                  const threshold = 1.0;
                  const isMinArea = (item.width * item.height) / 10000 < threshold;
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-400 border-l border-slate-100 tabular-nums">
                        {String(serialNumber).padStart(2, '0')}
                      </td>

                      <td className="py-2 px-2.5 border-l border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-right min-w-0">
                            <div className="font-bold text-slate-900 text-[12px] leading-snug">
                              <span>{item.title}</span>
                              <span className="text-slate-400 font-semibold text-[10px] mr-1.5">
                                ·{' '}
                                {item.itemType === 'armored_door'
                                  ? 'باب مصفح'
                                  : item.itemType === 'door'
                                  ? 'باب'
                                  : item.itemType === 'balcony'
                                  ? 'بلكونة'
                                  : 'شباك'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">نظام الفتح: {item.opening}</div>
                          </div>
                          <div className="shrink-0 w-[46px] h-[46px] bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-0.5">
                            <MiniItemPreview item={item} />
                          </div>
                        </div>
                      </td>

                      <td
                        className="py-2 px-1.5 text-center font-mono font-bold text-[#0F172A] border-l border-slate-100 text-[11px] tabular-nums"
                        dir="ltr"
                      >
                        {item.width} × {item.height}
                      </td>

                      <td className="py-2 px-1.5 text-center border-l border-slate-100 text-[11px] tabular-nums">
                        <div className="font-bold text-[#0F172A]">{item.area.toFixed(2)} م²</div>
                        {isMinArea && (
                          <div className="text-[9px] text-amber-700 font-bold mt-0.5 whitespace-nowrap">
                            (حد أدنى {threshold.toFixed(1)} م²)
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-1 text-center font-mono font-bold text-[#0F172A] border-l border-slate-100 text-[11px] tabular-nums">
                        {item.quantity || 1}
                      </td>

                      <td className="py-2 px-2 border-l border-slate-100 text-[10px] leading-snug">
                        <div className="font-bold text-slate-900 text-[11px]">
                          {profiles[item.profile]?.name || item.profile}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {item.innerType === 'panel'
                            ? 'بنل بالكامل'
                            : item.innerType === 'panel_glass'
                            ? 'بنل مع زجاج'
                            : 'زجاج بالكامل'}
                        </div>
                        {item.innerType !== 'panel' && <div className="text-slate-500">زجاج: {item.glassType}</div>}
                        {item.opening === 'مفصلي' && (
                          <div className="text-slate-600 font-bold">ضلف: {item.hingePanes || 'ضلفة'}</div>
                        )}
                      </td>

                      <td className="py-2 px-2 border-l border-slate-100 text-[10px] text-slate-600 leading-snug">
                        {item.addons.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {item.addons.map((addonId) => (
                              <span key={addonId} className="font-bold text-slate-700">
                                • {addons[addonId]?.name || addonId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">بدون إضافات</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-left whitespace-nowrap tabular-nums">
                        <div className="font-black text-[#0F172A] font-display text-[13px]">
                          {formatCurrency(item.itemTotal)}
                        </div>
                        <div className="text-[9.5px] text-slate-500 mt-0.5">
                          {formatCurrency(item.profilePrice + item.addonsPrice)} / م²
                        </div>
                        {item.quantity && item.quantity > 1 ? (
                          <div className="text-[9px] text-slate-500 font-bold">
                            ({formatCurrency(item.itemTotal / item.quantity)} × {item.quantity})
                          </div>
                        ) : null}
                        {item.flatAddonsPrice && item.flatAddonsPrice > 0 ? (
                          <div className="text-[9px] text-emerald-700 font-bold">
                            + {formatCurrency(item.flatAddonsPrice)} (مقطوع)
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {page.hasMoreItemsAfter && (
          <div className="text-left text-[11px] font-bold text-slate-500 mt-1">
            يتبع باقي البنود في الصفحة التالية ({page.pageNumber + 1} من {totalPages}) ←
          </div>
        )}

        {/* Grand Total Area and Calculations */}
        {page.showTotals && (
          <div className="bg-[#0F172A] text-white rounded-xl px-5 py-4 flex flex-row justify-between items-center gap-4">
            <div className="text-right">
              <h4 className="font-display font-black text-base text-white">مجموع مسطحات الأعمال</h4>
              <p className="text-slate-300 text-[11px] mt-0.5">إجمالي المساحة الفعلية وصافي القيمة المعتمدة للعرض:</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 shrink-0 tabular-nums">
              <div className="text-right">
                <span className="text-[10px] text-slate-300 font-bold block mb-0.5">إجمالي الأمتار</span>
                <span className="text-lg font-black font-mono leading-none text-white" dir="ltr">
                  {calculations.totalArea.toFixed(2)} m²
                </span>
              </div>

              {discountValue > 0 || totalNotesAmount !== 0 ? (
                <>
                  <div className="bg-slate-700 h-8 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-300 font-bold block mb-0.5">قبل الخصم</span>
                    <span className="text-sm font-bold font-mono leading-none text-slate-200" dir="ltr">
                      {formatCurrency(calculations.totalPrice)}
                    </span>
                  </div>

                  {discountValue > 0 && (
                    <>
                      <div className="bg-slate-700 h-8 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-300 font-bold block mb-0.5">خصم خاص</span>
                        <span className="text-sm font-bold font-mono leading-none text-emerald-300">
                          - {formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  {totalNotesAmount !== 0 && (
                    <>
                      <div className="bg-slate-700 h-8 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[10px] text-sky-300 font-bold block mb-0.5">تسويات الملاحظات</span>
                        <span className="text-sm font-bold font-mono leading-none text-sky-300" dir="ltr">
                          {totalNotesAmount > 0 ? '+' : ''}
                          {formatCurrency(totalNotesAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-700 h-8 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-[#F59E0B] font-black block mb-0.5">صافي القيمة النهائية</span>
                    <span className="text-2xl font-black font-display text-[#F59E0B] leading-none">
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-700 h-8 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-[#F59E0B] font-black block mb-0.5">صافي القيمة الكلية</span>
                    <span className="text-2xl font-black font-display text-[#F59E0B] leading-none">
                      {formatCurrency(calculations.totalPrice)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Custom Notes Section */}
        {page.showNotes && (notes || additionalNotes.some((n) => n.text)) && (
          <div className="mt-3.5 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-right space-y-2.5">
            <h3 className="text-[11px] font-black text-[#0F172A]">ملاحظات خاصة وتفاصيل إضافية:</h3>

            {notes && (
              <div className="border-b border-slate-200 pb-2 last:border-none last:pb-0">
                <p className="text-slate-700 text-xs font-bold whitespace-pre-wrap leading-relaxed">{notes}</p>
                {notesAmount !== 0 && (
                  <p className="text-[11px] font-black text-amber-900 mt-1 bg-amber-50 py-1 px-2.5 rounded-md inline-block border border-amber-200 tabular-nums">
                    القيمة المقترنة: {notesAmount > 0 ? 'إضافة قدرها ' : 'خصم قدره '}
                    {formatCurrency(Math.abs(notesAmount))}
                  </p>
                )}
              </div>
            )}

            {additionalNotes.map(
              (note, idx) =>
                note.text && (
                  <div
                    key={note.id || idx}
                    className="border-t border-dashed border-slate-200 pt-2 first:border-none first:pt-0"
                  >
                    <p className="text-slate-700 text-xs font-bold whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    {note.amount !== 0 && (
                      <p className="text-[11px] font-black text-amber-900 mt-1 bg-amber-50 py-1 px-2.5 rounded-md inline-block border border-amber-200 tabular-nums">
                        القيمة المقترنة: {note.amount > 0 ? 'إضافة قدرها ' : 'خصم قدره '}
                        {formatCurrency(Math.abs(note.amount))}
                      </p>
                    )}
                  </div>
                )
            )}
          </div>
        )}

        {/* Official Terms & Signatures */}
        {page.showTermsAndSignatures && (
          <div className="mt-4 pt-3.5 border-t border-slate-200 text-right">
            <h3 className="text-[11px] font-black text-slate-500 mb-2.5">
              الشروط والمواصفات وجودة {BRAND_NAME}
            </h3>

            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[11px] text-slate-600 leading-relaxed font-medium">
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">المنتجات والضمان:</strong> قطاعات UPVC و WPC تشمل ضمانًا
                  معتمدًا لمدة 10 سنوات ضد تغير الألوان وعيوب التصنيع وثبات المقطع.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">الإكسسوارات والمقابض:</strong> إكسسوارات تركية وأوروبية أصلية{' '}
                  <span className="font-mono text-[10px] font-bold text-slate-800">
                    [VORNE, FORNAX, GIVESS, ROTEX]
                  </span>{' '}
                  مقاومة للصدأ.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">إحكام العزل:</strong> جوانات كاوتشوك مزدوجة تمنع تسريب
                  الغبار ومياه الأمطار وتعزل الأصوات الخارجية بكفاءة.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">الزجاج ونوعيته:</strong> زجاج مفرد أو دبل (مع جورجيا أو
                  سادة حسب اختياركم) عازل أو عاكس.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">الرفع الفعلي للمقاسات:</strong> يعتبر العرض مبدئياً بناءً
                  على مقاساتكم الأولية لحين المعاينة الهندسية بالموقع.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0F172A] font-black shrink-0">✓</span>
                <p>
                  <strong className="text-slate-900 font-bold">تأكيد التعاقد:</strong> يسعدنا تواصلكم مع فروعنا المعتمدة
                  لحجز موعد المعاينة وتأكيد الطلب.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-5 grid grid-cols-2 gap-8 text-center text-xs font-bold border-t border-slate-200 pt-4">
              <div>
                <p className="text-slate-400 mb-6 font-black text-[11px]">توقيع واعتماد العميل</p>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
                <p className="text-slate-900 text-[11px] font-black mt-1.5">{customer.name || 'العميل المحترم'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-6 font-black text-[11px]">الاعتماد الرسمي - {BRAND_NAME}</p>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
                <p className="text-[#0F172A] font-black text-[11px] mt-1.5">إدارة المبيعات والجودة</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Official Quotation Footer Citation on Every Page */}
      <div className="pt-2.5 mt-2 border-t border-slate-200 text-right shrink-0">
        <div className="flex flex-row justify-between items-center gap-3 text-[9.5px] text-slate-500 font-bold tabular-nums">
          <p className="truncate">
            الفروع والمعارض: {COMPANY_LOCATIONS.map((l) => l.name).join(' · ')}
          </p>
          <div className="flex items-center gap-2 shrink-0 text-slate-400">
            {totalPages > 1 && (
              <>
                <span className="text-slate-600 font-extrabold">
                  صفحة {page.pageNumber} من {totalPages}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="font-extrabold">
              © {new Date().getFullYear()} {BRAND_NAME}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailedQuoteView({
  customer,
  calculations,
  formatCurrency,
  profiles,
  addons,
  isMobileViewport = false,
}: Props) {
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [exportState, setExportState] = React.useState<'idle' | 'downloading' | 'sharing'>('idle');
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const exportContainerRef = React.useRef<HTMLDivElement>(null);

  const computeInitialFitWidthScale = () => {
    if (typeof window === 'undefined') {
      return 0.45;
    }
    const estW = Math.max(120, Math.min(window.innerWidth, 980) - 24);
    return Math.floor(Math.min(estW / A4_WIDTH, 1.2) * 10000) / 10000;
  };

  const [activeScale, setActiveScale] = React.useState<number>(computeInitialFitWidthScale);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // Deterministic quote reference shared across Mobile preview, Desktop preview, Print & PDF
  const quoteNumber = React.useMemo(() => {
    const baseDate = (customer.date || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(0, 6);
    const seedSource = `${customer.name || ''}-${customer.phone || ''}-${calculations.itemsCalculated[0]?.id || 101}`;
    let hash = 0;
    for (let i = 0; i < seedSource.length; i++) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) % 900;
    }
    const seq = 100 + Math.abs(hash);
    return `BTW-${baseDate}-${seq}`;
  }, [customer.date, customer.name, customer.phone, calculations.itemsCalculated]);

  const { discountType = 'cash', discountValue = 0, notesAmount = 0, additionalNotes = [] } = customer;

  const discountAmount = React.useMemo(() => {
    const raw =
      discountType === 'percentage' ? (calculations.totalPrice * discountValue) / 100 : discountValue;
    return raw > calculations.totalPrice ? calculations.totalPrice : raw;
  }, [calculations.totalPrice, discountType, discountValue]);

  const totalNotesAmount = React.useMemo(() => {
    return notesAmount + additionalNotes.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [notesAmount, additionalNotes]);

  const finalPrice = React.useMemo(() => {
    return Math.max(0, calculations.totalPrice - discountAmount + totalNotesAmount);
  }, [calculations.totalPrice, discountAmount, totalNotesAmount]);

  const pages = React.useMemo(() => {
    return paginateQuoteIntoA4Pages(calculations.itemsCalculated, customer);
  }, [calculations.itemsCalculated, customer]);

  // Keep current page index valid whenever item count changes
  React.useEffect(() => {
    if (currentPageIndex >= pages.length) {
      setCurrentPageIndex(Math.max(0, pages.length - 1));
    }
  }, [pages.length, currentPageIndex]);

  // Always Fit-to-Width (ملاءمة العرض): dynamically compute scale from available stage width
  const recomputeScale = React.useCallback(() => {
    const stageEl = stageRef.current;
    if (!stageEl || stageEl.clientWidth <= 0) return;

    const styles = window.getComputedStyle(stageEl);
    const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);

    // Subtract 2px subpixel buffer so scaled sheet strictly fits without 1px rounding overflow
    const availW = Math.max(120, stageEl.clientWidth - padX - 2);
    const nextFitWidth = Math.floor(Math.min(availW / A4_WIDTH, 1.2) * 10000) / 10000;

    setActiveScale((prev) => (Math.abs(prev - nextFitWidth) < 0.001 ? prev : nextFitWidth));
  }, []);

  React.useLayoutEffect(() => {
    recomputeScale();
  }, [recomputeScale, pages.length]);

  React.useEffect(() => {
    let rafId = 0;
    let orientationTimer: number | undefined;

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recomputeScale);
    };

    const handleOrientation = () => {
      scheduleMeasure();
      window.clearTimeout(orientationTimer);
      orientationTimer = window.setTimeout(scheduleMeasure, 180);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              scheduleMeasure();
            }
          })
        : null;

    if (stageRef.current) {
      resizeObserver.observe(stageRef.current);
      intersectionObserver?.observe(stageRef.current);
    }

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', handleOrientation);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(orientationTimer);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', handleOrientation);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
    };
  }, [recomputeScale, pages.length]);

  const scaledWidth = Math.ceil(A4_WIDTH * activeScale);
  const scaledHeight = Math.ceil(A4_HEIGHT * activeScale);
  const activePage = pages[currentPageIndex] || pages[0];

  const buildPdfDocument = async (pixelRatio: number): Promise<{ pdf: jspdf; fileName: string }> => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    if (typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      } catch {
        // Proceed even if font readiness promise rejects
      }
    }

    const container = exportContainerRef.current;
    if (!container) {
      throw new Error('Export container unavailable');
    }

    const pageNodes = Array.from(container.querySelectorAll('[data-export-page]')) as HTMLElement[];
    if (pageNodes.length === 0) {
      throw new Error('No pages found to export');
    }

    const pdf = new jspdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageNodes.length; i++) {
      const node = pageNodes[i];
      const imgData = await htmlToImage.toPng(node, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio,
        width: A4_WIDTH,
        height: A4_HEIGHT,
        canvasWidth: Math.round(A4_WIDTH * pixelRatio),
        canvasHeight: Math.round(A4_HEIGHT * pixelRatio),
      });

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const clientNameClean = (customer.name || 'عميل').trim().replace(/\s+/g, '_');
    const fileName = `عرض_سعر_${BRAND_NAME.replace(/\s+/g, '_')}_${clientNameClean}.pdf`;
    return { pdf, fileName };
  };

  const handleDownloadPdf = async () => {
    if (exportState !== 'idle') return;
    setExportState('downloading');
    try {
      const { pdf, fileName } = await buildPdfDocument(2.4);
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setExportState('idle');
    }
  };

  const handleSharePdf = async () => {
    if (exportState !== 'idle' || typeof navigator === 'undefined' || !navigator.share) return;
    setExportState('sharing');
    try {
      const { pdf, fileName } = await buildPdfDocument(2);
      const blob = pdf.output('blob');
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `عرض سعر - ${BRAND_NAME}`,
          text: `عرض سعر تفصيلي من ${BRAND_NAME} للعميل ${customer.name || 'الكريم'}`,
          files: [pdfFile],
        });
      } else {
        await navigator.share({
          title: `عرض سعر - ${BRAND_NAME}`,
          text: `عرض سعر تفصيلي من ${BRAND_NAME}\nالعميل: ${
            customer.name || 'عميلنا الكريم'
          }\nرقم العرض: ${quoteNumber}\nصافي القيمة: ${formatCurrency(finalPrice)}`,
          url: window.location.href,
        });
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (!isAbort) {
        console.error('Error sharing quote:', err);
      }
    } finally {
      setExportState('idle');
    }
  };

  return (
    <>
      {/* Screen Interactive Fit-to-Width PDF Preview Workspace */}
      <section
        id={isMobileViewport ? 'mobile-detailed-quote-view' : 'detailed-quote-view'}
        dir="rtl"
        className="print:hidden w-full max-w-full box-border flex flex-col bg-[#F1F5F9] rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
      >
        {/* Top Preview Bar */}
        <header className="bg-[#0F172A] text-white px-3.5 sm:px-5 min-h-[52px] sm:min-h-[60px] py-2 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0 box-border">
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center gap-1.5">
              <FileText size={16} className="text-[#FACC15] shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-white truncate">معاينة عرض السعر</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 truncate tabular-nums mt-0.5">
              <span className="truncate">{customer.name?.trim() || `عميل ${BRAND_NAME}`}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono shrink-0" dir="ltr">
                {quoteNumber}
              </span>
            </div>
          </div>
        </header>

        {/* Central A4 Stage — Always Fit-to-Width with Zero Horizontal Scroll */}
        <div
          ref={stageRef}
          className="w-full min-w-0 box-border p-2 sm:p-4 flex justify-center items-start"
        >
          {/* Exact Scaled Geometry Box (dir="ltr" + origin 0 0 prevents RTL transform offset overflow) */}
          <div
            dir="ltr"
            className="relative shrink-0 rounded-sm bg-white shadow-[0_14px_34px_-10px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/10"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            <div
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
              <A4PageSheet
                page={activePage}
                totalPages={pages.length}
                customer={customer}
                calculations={calculations}
                formatCurrency={formatCurrency}
                profiles={profiles}
                addons={addons}
                quoteNumber={quoteNumber}
                discountAmount={discountAmount}
                totalNotesAmount={totalNotesAmount}
                finalPrice={finalPrice}
              />
            </div>
          </div>
        </div>

        {/* Non-Overlapping Bottom Action & Pagination Bar */}
        <footer className="bg-white border-t border-slate-200 px-3 sm:px-5 py-2.5 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 box-border">
          {/* Multi-Page Navigation (Rendered automatically when quote spans > 1 A4 page) */}
          {pages.length > 1 && (
            <div className="flex items-center justify-between sm:justify-start gap-2 pb-1.5 sm:pb-0 border-b sm:border-b-0 border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPageIndex === 0}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap"
              >
                <ChevronRight size={16} />
                <span>السابقة</span>
              </button>

              <span className="text-xs font-black text-slate-700 px-2 tabular-nums whitespace-nowrap">
                صفحة {currentPageIndex + 1} من {pages.length}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                disabled={currentPageIndex >= pages.length - 1}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>التالية</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          )}

          {/* Primary Document Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:mr-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exportState !== 'idle'}
              className="min-h-[44px] flex-1 sm:flex-initial px-4 sm:px-6 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {exportState === 'downloading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>جاري التنزيل...</span>
                </>
              ) : (
                <>
                  <Download size={16} className="shrink-0" />
                  <span>تنزيل PDF</span>
                </>
              )}
            </button>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleSharePdf}
                disabled={exportState !== 'idle'}
                className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {exportState === 'sharing' ? (
                  <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <Share2 size={16} className="shrink-0" />
                )}
                <span className="hidden sm:inline">مشاركة العرض</span>
                <span className="sm:hidden">مشاركة</span>
              </button>
            )}
          </div>
        </footer>
      </section>

      {/* Offscreen Unscaled 1:1 A4 Render Target for Crisp Multi-Page PDF Generation */}
      {exportState !== 'idle' && (
        <div
          ref={exportContainerRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '-24000px',
            left: 0,
            width: `${A4_WIDTH}px`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {pages.map((p) => (
            <div key={p.pageNumber}>
              <A4PageSheet
                page={p}
                totalPages={pages.length}
                customer={customer}
                calculations={calculations}
                formatCurrency={formatCurrency}
                profiles={profiles}
                addons={addons}
                quoteNumber={quoteNumber}
                discountAmount={discountAmount}
                totalNotesAmount={totalNotesAmount}
                finalPrice={finalPrice}
                exportMarker
              />
            </div>
          ))}
        </div>
      )}

      {/* Full-Scale 1:1 Multi-Page Native Print Output (Single Canonical Instance) */}
      {!isMobileViewport && (
        <div className="hidden print:block w-full bg-white m-0 p-0" dir="rtl">
          {pages.map((p) => (
            <div key={p.pageNumber} className="a4-print-page">
              <A4PageSheet
                page={p}
                totalPages={pages.length}
                customer={customer}
                calculations={calculations}
                formatCurrency={formatCurrency}
                profiles={profiles}
                addons={addons}
                quoteNumber={quoteNumber}
                discountAmount={discountAmount}
                totalNotesAmount={totalNotesAmount}
                finalPrice={finalPrice}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
