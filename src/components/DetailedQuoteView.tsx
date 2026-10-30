import React from 'react';
import { CustomerInfo, CalculatedItem, CalculationResult, Profile, Addon } from '../types';
import {
  Download,
  Share2,
  ChevronRight,
  ChevronLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import logoUrl from '../assets/images/the_best_windows_logo.jpeg';
import { BRAND_NAME, COMPANY_LOCATIONS } from '../constants';
import {
  A4_WIDTH,
  A4_HEIGHT,
  QuotePageDescriptor,
  PdfGenerationProgress,
  paginateQuoteIntoA4Pages,
  buildQuotePdfCacheKey,
  getCachedPdf,
  generateQuotePdfBlob,
  triggerPdfBlobDownload,
  preloadLogoDataUrl,
  getCachedLogoSrc,
  warmUpPdfAssets,
  nextPaintFrame,
} from '../utils/pdfExportEngine';

interface Props {
  customer: CustomerInfo;
  calculations: CalculationResult;
  formatCurrency: (value: number) => string;
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  isMobileViewport?: boolean;
  onBack?: () => void;
}

// Kick off logo Base64 preload immediately on module import so it is ready before first export
void preloadLogoDataUrl(logoUrl);

const MiniItemPreview = React.memo(function MiniItemPreview({ item }: { item: CalculatedItem }) {
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
});

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
  logoSrc: string;
  exportMarker?: boolean;
}

const BRANCHES_FOOTER_LINE = COMPANY_LOCATIONS.map((l) => l.name).join(' · ');
const CURRENT_YEAR = new Date().getFullYear();

const A4PageSheet = React.memo(function A4PageSheet({
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
  logoSrc,
  exportMarker,
}: A4PageSheetProps) {
  const { discountValue = 0, notesAmount = 0, notes = '', additionalNotes = [] } = customer;
  const quoteDate = customer.date || new Date().toISOString().split('T')[0];

  return (
    <div
      data-export-page={exportMarker ? String(page.pageNumber) : undefined}
      dir="rtl"
      className="a4-paper-lock bg-white text-slate-900 box-border flex flex-col justify-start select-none overflow-hidden"
      style={{
        width: `${A4_WIDTH}px`,
        height: `${A4_HEIGHT}px`,
        padding: '24px 32px 20px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Upper & Main Content Flow */}
      <div className="flex-1 flex flex-col min-h-0">
        {page.isFirstPage ? (
          <>
            {/* Full Official Document Header (Fixed A4 Paper Geometry) */}
            <div className="flex flex-row justify-between items-stretch gap-5 pb-4 mb-2 border-b-2 border-slate-900">
              <div className="flex flex-col justify-between text-right flex-1 min-w-0">
                <div className="flex items-center gap-3.5">
                  <img
                    src={logoSrc}
                    alt={`${BRAND_NAME} - شبابيك وأبواب UPVC`}
                    decoding="sync"
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
          </>
        ) : (
          /* Compact Continuation Header on Page 2+ */
          <div className="flex flex-row items-center justify-between gap-4 pb-2.5 mb-2.5 border-b-2 border-slate-900">
            <div className="flex items-center gap-2.5">
              <img
                src={logoSrc}
                alt={`${BRAND_NAME} Logo`}
                decoding="sync"
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

        {/* Items Table (Fixed Row Height & Locked Column Widths with Independent Per-Item Auto-Fit Font Sizing) */}
        {page.items.length > 0 && (
          <div className="mb-2 border-[1.5px] border-slate-900 rounded-xl overflow-hidden">
            <table className="w-full table-fixed border-collapse text-right text-xs">
              <thead>
                <tr className="bg-[#0F172A] text-white font-display border-b border-slate-900 font-black text-[11px]">
                  <th className="py-2.5 px-1.5 text-center w-[32px] border-l border-slate-800">م</th>
                  <th className="py-2.5 px-2 w-[141px] border-l border-slate-800">بيان البند والرسم التوضيحي</th>
                  <th className="py-2.5 px-1.5 text-center border-l border-slate-800 w-[86px]">المقاسات (سم)</th>
                  <th className="py-2.5 px-1.5 text-center border-l border-slate-800 w-[74px]">المساحة م²</th>
                  <th className="py-2.5 px-1 text-center border-l border-slate-800 w-[42px]">العدد</th>
                  <th className="py-2.5 px-2 border-l border-slate-800 w-[132px]">تفاصيل القطاع والزجاج</th>
                  <th className="py-2.5 px-2 border-l border-slate-800 w-[112px]">الإضافات</th>
                  <th className="py-2.5 px-2 text-left w-[108px]">إجمالي البند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {page.items.map(({ item, serialNumber, isMinArea, autoFit }) => {
                  const threshold = 1.0;

                  return (
                    <tr key={item.id} className="bg-white h-[72px] max-h-[72px]">
                      <td className="py-[5px] px-1.5 text-center font-mono font-bold text-slate-400 border-l border-slate-100 tabular-nums align-middle">
                        <div className="h-[60px] max-h-[60px] overflow-hidden flex items-center justify-center text-[11px]">
                          {String(serialNumber).padStart(2, '0')}
                        </div>
                      </td>

                      <td className="py-[5px] px-2 border-l border-slate-100 align-middle">
                        <div className="h-[60px] max-h-[60px] overflow-hidden flex items-center justify-between gap-1.5">
                          <div
                            className={`text-right min-w-0 flex-1 h-[60px] max-h-[60px] overflow-hidden flex flex-col ${
                              autoFit.description.fitsAtMin ? 'justify-center' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`font-bold text-slate-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${autoFit.description.titleClass} ${autoFit.description.leadingClass}`}
                            >
                              <span>{item.title}</span>
                              <span
                                className={`text-slate-400 font-semibold mr-1 ${autoFit.description.badgeClass}`}
                              >
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
                            <div
                              className={`text-slate-500 font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${autoFit.description.subClass} ${autoFit.description.leadingClass} ${autoFit.description.subMarginClass}`}
                            >
                              نظام الفتح: {item.opening}
                            </div>
                          </div>
                          <div className="w-[44px] h-[44px] shrink-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                            <MiniItemPreview item={item} />
                          </div>
                        </div>
                      </td>

                      <td
                        className="py-[5px] px-1.5 text-center font-mono font-bold text-[#0F172A] border-l border-slate-100 tabular-nums align-middle"
                        dir="ltr"
                      >
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex items-center justify-center whitespace-nowrap ${autoFit.dimensions.mainClass} ${autoFit.dimensions.leadingClass}`}
                        >
                          {item.width} × {item.height}
                        </div>
                      </td>

                      <td className="py-[5px] px-1.5 text-center border-l border-slate-100 tabular-nums align-middle">
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex flex-col items-center justify-center ${autoFit.area.leadingClass}`}
                        >
                          <div className={`font-bold text-[#0F172A] whitespace-nowrap ${autoFit.area.mainClass}`}>
                            {item.area.toFixed(2)} م²
                          </div>
                          {isMinArea && (
                            <div
                              className={`text-amber-700 font-bold mt-0.5 whitespace-nowrap ${autoFit.area.badgeClass}`}
                            >
                              (حد أدنى {threshold.toFixed(1)} م²)
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-[5px] px-1 text-center font-mono font-bold text-[#0F172A] border-l border-slate-100 tabular-nums align-middle">
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex items-center justify-center whitespace-nowrap ${autoFit.quantity.mainClass} ${autoFit.quantity.leadingClass}`}
                        >
                          {item.quantity || 1}
                        </div>
                      </td>

                      <td className="py-[5px] px-2 border-l border-slate-100 align-middle">
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex flex-col ${
                            autoFit.details.fitsAtMin ? 'justify-center' : 'justify-start'
                          } ${autoFit.details.gapClass} ${autoFit.details.leadingClass}`}
                        >
                          <div
                            className={`font-bold text-slate-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${autoFit.details.titleClass}`}
                          >
                            {profiles[item.profile]?.name || item.profile}
                          </div>
                          <div className={`text-slate-500 font-medium ${autoFit.details.subClass}`}>
                            {item.innerType === 'panel'
                              ? 'بنل بالكامل'
                              : item.innerType === 'panel_glass'
                              ? 'بنل مع زجاج'
                              : 'زجاج بالكامل'}
                          </div>
                          {item.innerType !== 'panel' && (
                            <div
                              className={`text-slate-500 font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${autoFit.details.subClass}`}
                            >
                              زجاج: {item.glassType}
                            </div>
                          )}
                          {item.opening === 'مفصلي' && (
                            <div className={`text-slate-600 font-bold ${autoFit.details.subClass}`}>
                              ضلف: {item.hingePanes || 'ضلفة'}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-[5px] px-2 border-l border-slate-100 text-slate-600 align-middle">
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex flex-col ${
                            autoFit.addons.fitsAtMin ? 'justify-center' : 'justify-start'
                          } ${autoFit.addons.leadingClass}`}
                        >
                          {item.addons.length > 0 ? (
                            <div className={`flex flex-col ${autoFit.addons.gapClass}`}>
                              {item.addons.map((addonId) => (
                                <span
                                  key={addonId}
                                  className={`font-bold text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${autoFit.addons.textClass}`}
                                >
                                  • {addons[addonId]?.name || addonId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">بدون إضافات</span>
                          )}
                        </div>
                      </td>

                      <td className="py-[5px] px-2 text-left whitespace-nowrap tabular-nums align-middle">
                        <div
                          className={`h-[60px] max-h-[60px] overflow-hidden flex flex-col ${
                            autoFit.price.fitsAtMin ? 'justify-center' : 'justify-start'
                          } ${autoFit.price.leadingClass}`}
                        >
                          <div className={`font-black text-[#0F172A] font-display ${autoFit.price.totalClass}`}>
                            {formatCurrency(item.itemTotal)}
                          </div>
                          <div className={`text-slate-500 mt-0.5 ${autoFit.price.subClass}`}>
                            {item.flatProfilePrice && item.flatProfilePrice > 0
                              ? `${formatCurrency(item.flatProfilePrice)} / ${profiles[item.profile]?.unit || 'للقطعة'}`
                              : `${formatCurrency(item.profilePrice + item.addonsPrice)} / م²`}
                          </div>
                          {item.quantity && item.quantity > 1 ? (
                            <div className={`text-slate-500 font-bold ${autoFit.price.badgeClass}`}>
                              ({formatCurrency(item.itemTotal / item.quantity)} × {item.quantity})
                            </div>
                          ) : null}
                          {item.flatAddonsPrice && item.flatAddonsPrice > 0 ? (
                            <div className={`text-emerald-700 font-bold ${autoFit.price.badgeClass}`}>
                              + {formatCurrency(item.flatAddonsPrice)} (مقطوع)
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-900 text-[10.5px] font-bold text-slate-700">
                  <td colSpan={8} className="py-2 px-6 text-left">
                    <span className="text-slate-400 ml-2">إجمالي الصفحة:</span>
                    <span className="text-[#0F172A] font-black font-display text-[12px]">
                      {formatCurrency(page.pageTotalPrice)}
                    </span>
                  </td>
                </tr>
              </tfoot>
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
          <div className="bg-[#0F172A] text-white rounded-2xl border-2 border-[#F59E0B] px-6 py-4 flex flex-row justify-between items-center gap-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#F59E0B]" />

            <div className="text-right">
              <h4 className="font-display font-black text-lg text-[#FACC15] tracking-tight">الملخص المالي وإجمالي المسطحات</h4>
              <p className="text-slate-300 text-[10.5px] mt-1 font-bold">صافي القيمة المعتمدة لكافة الأعمال الواردة بالعرض:</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 shrink-0 tabular-nums">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-black block mb-0.5 uppercase tracking-wider">إجمالي الأمتار</span>
                <span className="text-xl font-black font-mono leading-none text-white" dir="ltr">
                  {calculations.totalArea.toFixed(2)} m²
                </span>
              </div>

              {discountValue > 0 || totalNotesAmount !== 0 ? (
                <>
                  <div className="bg-slate-700 h-10 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-black block mb-0.5">قبل الخصم</span>
                    <span className="text-[13px] font-bold font-mono leading-none text-slate-300 line-through decoration-red-500/50" dir="ltr">
                      {formatCurrency(calculations.totalPrice)}
                    </span>
                  </div>

                  {discountValue > 0 && (
                    <>
                      <div className="bg-slate-700 h-10 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-black block mb-0.5">خصم خاص</span>
                        <span className="text-[13px] font-bold font-mono leading-none text-emerald-400">
                          - {formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  {totalNotesAmount !== 0 && (
                    <>
                      <div className="bg-slate-700 h-10 w-[1px]" />
                      <div className="text-right">
                        <span className="text-[10px] text-sky-400 font-black block mb-0.5">تسويات</span>
                        <span className="text-[13px] font-bold font-mono leading-none text-sky-400" dir="ltr">
                          {totalNotesAmount > 0 ? '+' : ''}
                          {formatCurrency(totalNotesAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-700 h-10 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-[#F59E0B] font-black block mb-0.5 tracking-wide">صافي القيمة النهائية</span>
                    <span className="text-3xl font-black font-display text-[#F59E0B] leading-none drop-shadow-sm">
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-700 h-10 w-[1px]" />
                  <div className="text-right">
                    <span className="text-[10px] text-[#F59E0B] font-black block mb-0.5 tracking-wide">صافي القيمة الكلية</span>
                    <span className="text-3xl font-black font-display text-[#F59E0B] leading-none drop-shadow-sm">
                      {formatCurrency(calculations.totalPrice)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Custom Notes Section (Auto-shrinks font when exceptionally long while preventing spillover) */}
        {page.showNotes && (notes || additionalNotes.some((n) => n.text)) && (
          <div className="mt-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-right space-y-2 max-h-[960px] overflow-hidden">
            <h3 className="text-[10.5px] font-black text-[#0F172A]">ملاحظات خاصة وتفاصيل إضافية:</h3>

            {notes && (
              <div className="border-b border-slate-200 pb-2 last:border-none last:pb-0">
                <p
                  className={`text-slate-700 font-bold whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                    page.notesAutoFit?.textClass || 'text-[12px]'
                  } ${page.notesAutoFit?.leadingClass || 'leading-[1.3]'}`}
                >
                  {notes}
                </p>
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
                    <p
                      className={`text-slate-700 font-bold whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                        page.notesAutoFit?.textClass || 'text-[12px]'
                      } ${page.notesAutoFit?.leadingClass || 'leading-[1.3]'}`}
                    >
                      {note.text}
                    </p>
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
          <div className="mt-3 pt-3 border-t border-slate-200 text-right">
            <h3 className="text-[10.5px] font-black text-slate-500 mb-2">
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
      <div className="pt-2.5 mt-auto border-t border-slate-200 text-right shrink-0">
        <div className="flex flex-row justify-between items-center gap-3 text-[9.5px] text-slate-500 font-bold tabular-nums">
          <p className="truncate">
            الفروع والمعارض: {BRANCHES_FOOTER_LINE}
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
              © {CURRENT_YEAR} {BRAND_NAME}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function DetailedQuoteView({
  customer,
  calculations,
  formatCurrency,
  profiles,
  addons,
  isMobileViewport = false,
  onBack,
}: Props) {
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [exportState, setExportState] = React.useState<
    'idle' | 'downloading' | 'preparing-share' | 'ready-to-share'
  >('idle');
  const [exportProgress, setExportProgress] = React.useState<PdfGenerationProgress | null>(null);
  const [exportFeedback, setExportFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [preparedShareFile, setPreparedShareFile] = React.useState<File | null>(null);
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const [resolvedLogoSrc, setResolvedLogoSrc] = React.useState<string>(() =>
    getCachedLogoSrc(logoUrl)
  );

  // Synchronous re-entrancy lock to block rapid repeated clicks before React state commits
  const isExportingLockRef = React.useRef(false);
  const feedbackTimerRef = React.useRef<number | undefined>(undefined);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const previewSheetWrapperRef = React.useRef<HTMLDivElement>(null);
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
    let mounted = true;
    preloadLogoDataUrl(logoUrl).then((dataUrl) => {
      if (mounted) {
        setResolvedLogoSrc(dataUrl);
      }
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
      feedbackTimerRef.current = window.setTimeout(() => {
        setExportFeedback(null);
      }, 5000);
    }
  }, []);

  // Deterministic quote reference shared across Mobile preview, Desktop preview, Print & PDF
  const quoteNumber = React.useMemo(() => {
    const baseDate = (customer.date || new Date().toISOString().split('T')[0])
      .replace(/-/g, '')
      .slice(0, 6);
    const seedSource = `${customer.name || ''}-${customer.phone || ''}-${
      calculations.itemsCalculated[0]?.id || 101
    }`;
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
      discountType === 'percentage'
        ? (calculations.totalPrice * discountValue) / 100
        : discountValue;
    return raw > calculations.totalPrice ? calculations.totalPrice : raw;
  }, [calculations.totalPrice, discountType, discountValue]);

  const totalNotesAmount = React.useMemo(() => {
    return notesAmount + additionalNotes.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [notesAmount, additionalNotes]);

  const finalPrice = React.useMemo(() => {
    return Math.max(0, calculations.totalPrice - discountAmount + totalNotesAmount);
  }, [calculations.totalPrice, discountAmount, totalNotesAmount]);

  const pages = React.useMemo(() => {
    return paginateQuoteIntoA4Pages(calculations.itemsCalculated, customer, profiles, addons);
  }, [calculations.itemsCalculated, customer, profiles, addons]);

  // Detect any items or notes that still exceed allocated cell space even at minimum readable font (7px)
  const overflowSummary = React.useMemo(() => {
    const itemWarnings: { serialNumber: number; columns: string[]; pageNumber: number }[] = [];
    let hasNotesOverflow = false;

    for (const p of pages) {
      if (p.notesAutoFit?.hasOverflow) {
        hasNotesOverflow = true;
      }
      for (const entry of p.items) {
        if (entry.autoFit.hasOverflow) {
          itemWarnings.push({
            serialNumber: entry.serialNumber,
            columns: entry.autoFit.overflowColumns,
            pageNumber: p.pageNumber,
          });
        }
      }
    }
    return { itemWarnings, hasNotesOverflow };
  }, [pages]);

  const exportFileName = React.useMemo(() => {
    const clientNameClean = (customer.name || 'عميل').trim().replace(/\s+/g, '_');
    return `عرض_سعر_${BRAND_NAME.replace(/\s+/g, '_')}_${clientNameClean}.pdf`;
  }, [customer.name]);

  const quoteCacheKey = React.useMemo(() => {
    return buildQuotePdfCacheKey(quoteNumber, customer, calculations, profiles, addons);
  }, [quoteNumber, customer, calculations, profiles, addons]);

  // Sync prepared share file with in-memory PDF cache whenever quote changes
  React.useEffect(() => {
    setExportFeedback(null);
    const cached = getCachedPdf(quoteCacheKey);
    if (cached && cached.blob.size > 0) {
      setPreparedShareFile(new File([cached.blob], exportFileName, { type: 'application/pdf' }));
    } else {
      setPreparedShareFile(null);
      setExportState((prev) => (prev === 'ready-to-share' ? 'idle' : prev));
    }
  }, [quoteCacheKey, exportFileName]);

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

  const handleDownloadPdf = async () => {
    if (isExportingLockRef.current || exportState === 'downloading' || exportState === 'preparing-share') {
      return;
    }

    isExportingLockRef.current = true;
    setExportFeedback(null);

    try {
      // Instant 0ms fast-path if an identical quote PDF was already generated
      const cached = getCachedPdf(quoteCacheKey);
      if (cached && cached.blob.size > 0) {
        triggerPdfBlobDownload(cached.blob, exportFileName);
        if (!preparedShareFile) {
          setPreparedShareFile(new File([cached.blob], exportFileName, { type: 'application/pdf' }));
        }
        showFeedback('success', 'تم تجهيز وتنزيل ملف عرض السعر PDF بنجاح');
        return;
      }

      setExportState('downloading');
      setExportProgress({ completedPages: 0, totalPages: pages.length });

      // Allow loading spinner & offscreen unscaled A4 sheets to paint immediately without UI freeze
      await nextPaintFrame();

      const container = exportContainerRef.current;
      if (!container) {
        throw new Error('تعذر الوصول إلى حاوية صفحات التصدير');
      }

      const generated = await generateQuotePdfBlob({
        container,
        cacheKey: quoteCacheKey,
        fileName: exportFileName,
        logoSrc: resolvedLogoSrc,
        onProgress: setExportProgress,
      });

      // Pre-populate share file from the freshly generated Blob so sharing requires zero extra wait
      setPreparedShareFile(new File([generated.blob], exportFileName, { type: 'application/pdf' }));

      triggerPdfBlobDownload(generated.blob, exportFileName);
      showFeedback('success', 'تم تجهيز وتنزيل ملف عرض السعر PDF بنجاح');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showFeedback('error', 'تعذّر تجهيز ملف عرض السعر PDF حالياً. يرجى المحاولة مرة أخرى.');
    } finally {
      isExportingLockRef.current = false;
      setExportProgress(null);
      setExportState('idle');
    }
  };

  const handleSharePdf = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;

    // Immediate share when file is already prepared or cached (preserves synchronous user gesture)
    if (preparedShareFile) {
      try {
        const shareData: ShareData = {
          title: `عرض سعر - ${BRAND_NAME}`,
          text: `عرض سعر تفصيلي من ${BRAND_NAME} للعميل ${customer.name || 'الكريم'}`,
          files: [preparedShareFile],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await navigator.share({
            title: shareData.title,
            text: `عرض سعر تفصيلي من ${BRAND_NAME}\nالعميل: ${
              customer.name || 'عميلنا الكريم'
            }\nرقم العرض: ${quoteNumber}\nصافي القيمة: ${formatCurrency(finalPrice)}`,
            url: window.location.href,
          });
        }
        if (exportState === 'ready-to-share') {
          setExportState('idle');
        }
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (!isAbort) {
          console.error('Error sharing quote:', err);
          showFeedback('error', 'تعذّرت مشاركة ملف عرض السعر. يمكنك تنزيل ملف PDF مباشرة.');
        }
      }
      return;
    }

    // Phase 1: Async preparation when file isn't cached yet
    if (isExportingLockRef.current || exportState !== 'idle') return;
    isExportingLockRef.current = true;
    setExportFeedback(null);
    setExportState('preparing-share');
    setExportProgress({ completedPages: 0, totalPages: pages.length });

    try {
      await nextPaintFrame();

      const container = exportContainerRef.current;
      if (!container) {
        throw new Error('تعذر الوصول إلى حاوية صفحات التصدير');
      }

      const generated = await generateQuotePdfBlob({
        container,
        cacheKey: quoteCacheKey,
        fileName: exportFileName,
        logoSrc: resolvedLogoSrc,
        onProgress: setExportProgress,
      });

      const file = new File([generated.blob], exportFileName, { type: 'application/pdf' });
      setPreparedShareFile(file);
      setExportState('ready-to-share');
    } catch (err) {
      console.error('Error preparing PDF for sharing:', err);
      setExportState('idle');
      showFeedback('error', 'تعذّر تجهيز ملف PDF للمشاركة. يرجى المحاولة مرة أخرى.');
    } finally {
      isExportingLockRef.current = false;
      setExportProgress(null);
    }
  };

  const isRenderingOffscreenPages =
    exportState === 'downloading' || exportState === 'preparing-share';

  return (
    <>
      {/* Screen Interactive Fit-to-Width PDF Preview Workspace */}
      <section
        id={isMobileViewport ? 'mobile-detailed-quote-view' : 'detailed-quote-view'}
        dir="rtl"
        className="print:hidden w-full max-w-full box-border flex flex-col bg-[#F1F5F9] rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
      >
        {/* Top Preview Bar */}
        <header className="bg-[#0F172A] text-white px-3.5 sm:px-5 min-h-[52px] sm:min-h-[60px] py-2 flex items-center justify-between gap-4 border-b border-slate-800 shrink-0 box-border">
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

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
              <span>العودة للتعديل</span>
            </button>
          )}
        </header>

        {/* Non-Silent Overflow Warning Banner when an item or note exceeds space even at minimum 7px font */}
        {(overflowSummary.itemWarnings.length > 0 || overflowSummary.hasNotesOverflow) && (
          <div
            role="alert"
            className="px-3.5 sm:px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs font-bold flex items-start gap-2.5 text-right"
          >
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 leading-relaxed">
              <span className="font-black">تنبيه تجاوز المساحة المخصصة للبند: </span>
              <span>
                تم تصغير الخط تلقائياً حتى الحد الأدنى المقروء (7px)، ولكن النص لا يزال أكبر من المساحة الثابتة المخصصة في:{' '}
              </span>
              <span className="font-black text-amber-900">
                {[
                  ...overflowSummary.itemWarnings.map(
                    (w) =>
                      `بند ${String(w.serialNumber).padStart(2, '0')} (${w.columns.join('، ')})`
                  ),
                  ...(overflowSummary.hasNotesOverflow ? ['قسم الملاحظات الإضافية'] : []),
                ].join(' · ')}
              </span>
              <span>. يُرجى اختصار النص أو مراجعته لضمان ظهوره بالكامل داخل حدود الجدول في ملف PDF.</span>
            </div>
          </div>
        )}

        {/* Clear User Status Banner during / after PDF Generation */}
        {(exportState === 'downloading' || exportFeedback) && (
          <div
            role={exportFeedback?.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 border-b transition-colors ${
              exportState === 'downloading'
                ? 'bg-amber-50 text-slate-900 border-amber-200'
                : exportFeedback?.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {exportState === 'downloading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>
                    جاري تجهيز عرض السعر PDF
                    {exportProgress && exportProgress.totalPages > 1
                      ? ` (${exportProgress.completedPages} / ${exportProgress.totalPages})`
                      : '...'}
                  </span>
                </>
              ) : exportFeedback?.type === 'success' ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{exportFeedback.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{exportFeedback?.message}</span>
                </>
              )}
            </div>

            {exportState !== 'downloading' && exportFeedback && (
              <button
                type="button"
                onClick={() => setExportFeedback(null)}
                aria-label="إغلاق الإشعار"
                className="p-1 rounded-lg hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

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
                logoSrc={resolvedLogoSrc}
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
              disabled={exportState === 'downloading' || exportState === 'preparing-share'}
              className="min-h-[44px] flex-1 sm:flex-initial px-4 sm:px-6 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap"
            >
              {exportState === 'downloading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>
                    جاري تجهيز عرض السعر PDF
                    {exportProgress && exportProgress.totalPages > 1
                      ? ` (${exportProgress.completedPages}/${exportProgress.totalPages})`
                      : ''}
                  </span>
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
                disabled={exportState === 'downloading' || exportState === 'preparing-share'}
                className={`min-h-[44px] px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap border ${
                  exportState === 'ready-to-share'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'
                }`}
              >
                {exportState === 'preparing-share' ? (
                  <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <Share2 size={16} className="shrink-0" />
                )}
                {exportState === 'preparing-share' ? (
                  <span>جاري تجهيز عرض السعر PDF</span>
                ) : exportState === 'ready-to-share' ? (
                  <span>اضغط للمشاركة الآن</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">مشاركة العرض</span>
                    <span className="sm:hidden">مشاركة</span>
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </section>

      {/* Offscreen Layout-Isolated 1:1 A4 Render Target for Fast Multi-Page PDF Capture */}
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
            contain: 'layout style paint',
          }}
        >
          {pages.map((p) => (
            <div key={p.pageNumber} style={{ contain: 'layout style paint' }}>
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
                logoSrc={resolvedLogoSrc}
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
                logoSrc={resolvedLogoSrc}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
