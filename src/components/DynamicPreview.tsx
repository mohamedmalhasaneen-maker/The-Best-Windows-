/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalculatedItem } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface DynamicPreviewProps {
  item: CalculatedItem;
}

export const DynamicPreview: React.FC<DynamicPreviewProps> = ({ item }) => {
  const [isHidden, setIsHidden] = useState(false);
  const width = item.width || 100;
  const height = item.height || 100;
  
  // Calculate display aspect ratio
  const aspect = width / height;
  
  // Clamp aspect ratio to make sure it fits nicely in the card
  const clampedAspect = Math.max(0.45, Math.min(2.5, aspect));
  
  // Base dimensions inside viewBox
  let svgWidth = 120;
  let svgHeight = 120;
  
  if (clampedAspect > 1) {
    svgWidth = 140;
    svgHeight = Math.round(140 / clampedAspect);
  } else {
    svgHeight = 140;
    svgWidth = Math.round(140 * clampedAspect);
  }

  // Determine colors based on selections
  const hasSpecialColor = item.addons.includes('specialColor');
  
  // Profile frame colors (UPVC)
  // Standard is bright white. Special is a sleek anthracite grey or luxurious dark wood.
  const frameOuterColor = hasSpecialColor ? '#334155' : '#E2E8F0'; // Slate-700 / Slate-200
  const frameInnerColor = hasSpecialColor ? '#1E293B' : '#F1F5F9'; // Slate-800 / Slate-100
  const frameStrokeColor = hasSpecialColor ? '#0F172A' : '#94A3B8'; // Slate-900 / Slate-400

  // Glass Type Visualizations (Fill color + opacity)
  let glassFill = 'rgba(224, 242, 254, 0.4)'; // Default cyan-50/100
  let isFrosted = false;
  let isPatterned = false;
  
  switch (item.glassType) {
    case 'أبيض شفاف':
      glassFill = 'rgba(186, 230, 253, 0.35)'; // Sky blue tint
      break;
    case 'مصنفر':
      glassFill = 'rgba(241, 245, 249, 0.75)'; // Soft sandblasted white/grey
      isFrosted = true;
      break;
    case 'بني عاكس':
      glassFill = 'rgba(180, 83, 9, 0.4)'; // Amber tint with mirror glare
      break;
    case 'أبيض عاكس':
      glassFill = 'rgba(226, 232, 240, 0.6)'; // Silver specular tint
      break;
    case 'بني سن دبوس':
      glassFill = 'rgba(120, 53, 4, 0.45)'; // Textured amber
      isPatterned = true;
      break;
    case 'أزرق عاكس':
      glassFill = 'rgba(29, 78, 216, 0.4)'; // Deep blue
      break;
    case 'أخضر عاكس':
      glassFill = 'rgba(4, 120, 87, 0.4)'; // Green tint
      break;
    case 'أسود عاكس':
      glassFill = 'rgba(15, 23, 42, 0.7)'; // Smoke grey
      break;
    case 'مع جورجيا':
      glassFill = 'rgba(186, 230, 253, 0.35)';
      break;
    default:
      glassFill = 'rgba(186, 230, 253, 0.3)';
  }

  const hasGeorgiaBars = item.glassType === 'مع جورجيا' || item.addons.includes('colorGlass') && item.glassType.includes('جورجيا');

  // Determine drawing coordinates with margin to accommodate dimensions text / arrow markers safely
  const marginX = 12;
  const marginY = 12;
  const frameWidth = svgWidth - (marginX * 2);
  const frameHeight = svgHeight - (marginY * 2);
  
  // Frame thickness
  const pSize = 6; 

  const isDoor = item.itemType === 'door';
  const isBalcony = item.itemType === 'balcony';
  const opening = item.opening;
  const innerType = item.innerType || 'glass';

  // Render sashes or panes
  const renderSashes = () => {
    // If it's a door
    if (isDoor) {
      const paneX = marginX + pSize;
      const paneY = marginY + pSize;
      const paneW = frameWidth - (pSize * 2);
      const paneH = frameHeight - (pSize * 2);

      if (innerType === 'panel') {
        // Full Panel Door (no glass)
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="1" />
            {/* Draw gorgeous door grooved details (horizontal panel lines) */}
            {Array.from({ length: 9 }).map((_, i) => {
              const lineY = paneY + (paneH / 10) * (i + 1);
              return (
                <line 
                  key={i} 
                  x1={paneX + 3} 
                  y1={lineY} 
                  x2={paneX + paneW - 3} 
                  y2={lineY} 
                  stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} 
                  strokeWidth="1.5" 
                />
              );
            })}
            {/* Classic panel moldings */}
            <rect x={paneX + 5} y={paneY + 5} width={paneW - 10} height={paneH - 10} fill="none" stroke={hasSpecialColor ? '#1E293B' : '#E2E8F0'} strokeWidth="1" opacity="0.6" />
          </g>
        );
      } else if (innerType === 'panel_glass') {
        // Traditional top glass / bottom panel look (extremely common UPVC door style!)
        const splitY = paneY + (paneH * 0.45); // top 45% is glass, bottom 55% is panel
        return (
          <g>
            {/* Top glass pane */}
            <rect x={paneX} y={paneY} width={paneW} height={splitY - paneY} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
            {isFrosted && (
              <rect x={paneX} y={paneY} width={paneW} height={splitY - paneY} fill="url(#frostedPattern)" opacity="0.15" />
            )}
            {isPatterned && (
              <rect x={paneX} y={paneY} width={paneW} height={splitY - paneY} fill="url(#texturedPattern)" opacity="0.12" />
            )}
            {/* Glass shine highlights */}
            <path d={`M ${paneX + 2} ${paneY + 2} L ${paneX + paneW - 2} ${paneY + 2} L ${paneX + 2} ${paneY + (splitY - paneY) - 2} Z`} fill="rgba(255,255,255,0.08)" />
            <path d={`M ${paneX + paneW - 10} ${paneY + 4} L ${paneX + paneW - 4} ${paneY + 4} L ${paneX + 4} ${paneY + (splitY - paneY) - 10} L ${paneX + 4} ${paneY + (splitY - paneY) - 4} Z`} fill="rgba(255,255,255,0.12)" />
            
            {hasGeorgiaBars && (
              <g stroke='#FBBF24' strokeWidth="1" opacity="0.7">
                <line x1={paneX + (paneW / 2)} y1={paneY} x2={paneX + (paneW / 2)} y2={splitY} />
                <line x1={paneX} y1={paneY + (splitY - paneY) / 2} x2={paneX + paneW} y2={paneY + (splitY - paneY) / 2} />
              </g>
            )}

            {/* Middle horizontal division profile segment */}
            <rect x={paneX - 1} y={splitY} width={paneW + 2} height="5" fill={frameOuterColor} stroke={frameStrokeColor} strokeWidth="1" />

            {/* Bottom Panel */}
            <rect x={paneX} y={splitY + 5} width={paneW} height={paneH - (splitY - paneY) - 5} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="1" />
            {Array.from({ length: 5 }).map((_, i) => {
              const lineY = (splitY + 5) + ((paneH - (splitY - paneY) - 5) / 6) * (i + 1);
              return (
                <line 
                  key={i} 
                  x1={paneX + 3} 
                  y1={lineY} 
                  x2={paneX + paneW - 3} 
                  y2={lineY} 
                  stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} 
                  strokeWidth="1.5" 
                />
              );
            })}
          </g>
        );
      } else {
        // Full glass door
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
            {isFrosted && (
              <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />
            )}
            {isPatterned && (
              <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />
            )}
            <line x1={paneX} y1={paneY} x2={paneX + paneW} y2={paneY + paneH} stroke="rgba(255,255,255,0.06)" />
            {/* Shinings */}
            <path d={`M ${paneX + 4} ${paneY + 4} L ${paneX + paneW - 4} ${paneY + 4} L ${paneX + 4} ${paneY + paneH - 4} Z`} fill="rgba(255,255,255,0.07)" />
            <path d={`M ${paneX + paneW - 12} ${paneY + 6} L ${paneX + paneW - 6} ${paneY + 6} L ${paneX + 6} ${paneY + paneH - 12} L ${paneX + 6} ${paneY + paneH - 6} Z`} fill="rgba(255,255,255,0.1)" />

            {hasGeorgiaBars && (
              <g stroke='#FBBF24' strokeWidth="1" opacity="0.7">
                <line x1={paneX + paneW / 2} y1={paneY} x2={paneX + paneW / 2} y2={paneY + paneH} />
                <line x1={paneX} y1={paneY + paneH * 0.25} x2={paneX + paneW} y2={paneY + paneH * 0.25} />
                <line x1={paneX} y1={paneY + paneH * 0.5} x2={paneX + paneW} y2={paneY + paneH * 0.5} />
                <line x1={paneX} y1={paneY + paneH * 0.75} x2={paneX + paneW} y2={paneY + paneH * 0.75} />
              </g>
            )}
          </g>
        );
      }
    }

    // Windows / Balconies
    const paneX = marginX + pSize;
    const paneY = marginY + pSize;
    const paneW = frameWidth - (pSize * 2);
    const paneH = frameHeight - (pSize * 2);

    // If it's single-piece panel window
    if (innerType === 'panel') {
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={frameInnerColor} stroke={frameStrokeColor} strokeWidth="1" />
          {Array.from({ length: 6 }).map((_, i) => {
            const lineY = paneY + (paneH / 7) * (i + 1);
            return (
              <line 
                key={i} 
                x1={paneX + 2} 
                y1={lineY} 
                x2={paneX + paneW - 2} 
                y2={lineY} 
                stroke={hasSpecialColor ? '#1E293B' : '#CBD5E1'} 
                strokeWidth="1.5" 
              />
            );
          })}
        </g>
      );
    }

    // Traditional Window split behavior based on Opening Mechanism
    if (opening === 'جرار') {
      // Sliding sliding split down the middle (2 panes overlapping)
      const midX = paneX + (paneW / 2);
      return (
        <g>
          {/* Left Pane (slightly back) */}
          <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
          {isFrosted && <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />}
          {isPatterned && <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />}
          
          {/* Right Pane (slightly front / overlap line in middle) */}
          <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
          {isFrosted && <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />}
          {isPatterned && <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />}

          {/* Inner Sash profiles */}
          <rect x={paneX + 2} y={paneY + 2} width={(paneW / 2) - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="2.5" opacity="0.8" />
          <rect x={midX + 2} y={paneY + 2} width={(paneW / 2) - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="2.5" opacity="0.8" />

          {/* Georgia Bars */}
          {hasGeorgiaBars && (
            <g stroke='#FBBF24' strokeWidth="0.8" opacity="0.7">
              {/* Left pane cross */}
              <line x1={paneX + (paneW / 4)} y1={paneY} x2={paneX + (paneW / 4)} y2={paneY + paneH} />
              <line x1={paneX} y1={paneY + (paneH / 2)} x2={midX} y2={paneY + (paneH / 2)} />
              {/* Right pane cross */}
              <line x1={midX + (paneW / 4)} y1={paneY} x2={midX + (paneW / 4)} y2={paneY + paneH} />
              <line x1={midX} y1={paneY + (paneH / 2)} x2={paneX + paneW} y2={paneY + (paneH / 2)} />
            </g>
          )}

          {/* Glare effect */}
          <path d={`M ${paneX + 3} ${paneY + 3} L ${midX - 3} ${paneY + 3} L ${paneX + 3} ${paneY + paneH - 3} Z`} fill="rgba(255,255,255,0.06)" />
          <path d={`M ${midX + 3} ${paneY + 3} L ${paneX + paneW - 3} ${paneY + 3} L ${midX + 3} ${paneY + paneH - 3} Z`} fill="rgba(255,255,255,0.06)" />

          {/* Panel style with glass */}
          {innerType === 'panel_glass' && (
            <g>
              <rect x={paneX + 2} y={paneY + (paneH * 0.6)} width={(paneW / 2) - 4} height={paneH * 0.4 - 2} fill={frameOuterColor} opacity="0.9" />
              <rect x={midX + 2} y={paneY + (paneH * 0.6)} width={(paneW / 2) - 4} height={paneH * 0.4 - 2} fill={frameOuterColor} opacity="0.9" />
              {/* Grooves */}
              <line x1={paneX + 4} y1={paneY + (paneH * 0.8)} x2={midX - 4} y2={paneY + (paneH * 0.8)} stroke={hasSpecialColor ? '#232f3f' : '#cbd5e1'} strokeWidth="1" />
              <line x1={midX + 4} y1={paneY + (paneH * 0.8)} x2={paneX + paneW - 4} y2={paneY + (paneH * 0.8)} stroke={hasSpecialColor ? '#232f3f' : '#cbd5e1'} strokeWidth="1" />
            </g>
          )}

          {/* Sliding horizontal arrows in background */}
          <g stroke="#0F172A" strokeWidth="1.5" fill="none" opacity="0.6">
            <path d={`M ${paneX + (paneW / 4) - 6} ${paneY + (paneH / 2)} L ${paneX + (paneW / 4) + 6} ${paneY + (paneH / 2)}`} />
            <path d={`M ${paneX + (paneW / 4) + 2} ${paneY + (paneH / 2) - 3} L ${paneX + (paneW / 4) + 6} ${paneY + (paneH / 2)} L ${paneX + (paneW / 4) + 2} ${paneY + (paneH / 2) + 3}`} fill="none" />
            
            <path d={`M ${midX + (paneW / 4) + 6} ${paneY + (paneH / 2)} L ${midX + (paneW / 4) - 6} ${paneY + (paneH / 2)}`} />
            <path d={`M ${midX + (paneW / 4) - 2} ${paneY + (paneH / 2) - 3} L ${midX + (paneW / 4) - 6} ${paneY + (paneH / 2)} L ${midX + (paneW / 4) - 2} ${paneY + (paneH / 2) + 3}`} fill="none" />
          </g>
        </g>
      );
    } else if (opening === 'مفصلي') {
      // Hinged/Casement door or window structure (with standard double panel split line or single)
      // Usually windows are drawn with structural split panels if they are wide, but we draw a split line & hinge indicator triangles.
      const isSkew2 = item.addons.includes('skewWindow2') || item.addons.includes('skewBalcony2') || item.hingePanes === 'ضلفتين';
      
      if (isSkew2) {
        // Double sash hinged
        const midX = paneX + (paneW / 2);
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
            <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />

            {isFrosted && (
              <>
                <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />
                <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />
              </>
            )}
            {isPatterned && (
              <>
                <rect x={paneX} y={paneY} width={paneW / 2} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />
                <rect x={midX} y={paneY} width={paneW / 2} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />
              </>
            )}

            {/* Georgia Bars */}
            {hasGeorgiaBars && (
              <g stroke='#FBBF24' strokeWidth="0.8" opacity="0.7">
                <line x1={paneX + (paneW / 4)} y1={paneY} x2={paneX + (paneW / 4)} y2={paneY + paneH} />
                <line x1={paneX} y1={paneY + (paneH / 2)} x2={midX} y2={paneY + (paneH / 2)} />
                <line x1={midX + (paneW / 4)} y1={paneY} x2={midX + (paneW / 4)} y2={paneY + paneH} />
                <line x1={midX} y1={paneY + (paneH / 2)} x2={paneX + paneW} y2={paneY + (paneH / 2)} />
              </g>
            )}

            {/* Inner sashes */}
            <rect x={paneX + 2} y={paneY + 2} width={(paneW / 2) - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="2" opacity="0.7" />
            <rect x={midX + 2} y={paneY + 2} width={(paneW / 2) - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="2" opacity="0.7" />

            {/* Panel section bottom split if panel_glass is chosen */}
            {innerType === 'panel_glass' && (
              <g>
                <rect x={paneX + 2} y={paneY + (paneH * 0.65)} width={(paneW / 2) - 4} height={paneH * 0.35 - 2} fill={frameOuterColor} stroke={frameStrokeColor} />
                <rect x={midX + 2} y={paneY + (paneH * 0.65)} width={(paneW / 2) - 4} height={paneH * 0.35 - 2} fill={frameOuterColor} stroke={frameStrokeColor} />
                <line x1={paneX + 4} y1={paneY + (paneH * 0.8)} x2={midX - 4} y2={paneY + (paneH * 0.8)} stroke={hasSpecialColor ? '#232f3f' : '#cbd5e1'} />
                <line x1={midX + 4} y1={paneY + (paneH * 0.8)} x2={paneX + paneW - 4} y2={paneY + (paneH * 0.8)} stroke={hasSpecialColor ? '#232f3f' : '#cbd5e1'} />
              </g>
            )}

            {/* Hinges triangles (drafting convention pointing to hinges pivot side) */}
            <g stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2" fill="none">
              {/* Left sash hinge: pivot on the left edge */}
              <polyline points={`${midX - 2},${paneY + 2} ${paneX + 2},${paneY + (paneH / 2)} ${midX - 2},${paneY + paneH - 2}`} />
              {/* Right sash hinge: pivot on right edge */}
              <polyline points={`${midX + 2},${paneY + 2} ${paneX + paneW - 2},${paneY + (paneH / 2)} ${midX + 2},${paneY + paneH - 2}`} />
            </g>

            {/* Two tiny metal levers/handles */}
            <rect x={midX - 4} y={paneY + (paneH / 2) - 3} width="2" height="6" fill="#64748B" rx="0.5" />
            <rect x={midX + 2} y={paneY + (paneH / 2) - 3} width="2" height="6" fill="#64748B" rx="0.5" />
          </g>
        );
      } else {
        // Single sash hinged
        return (
          <g>
            <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
            {isFrosted && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />}
            {isPatterned && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />}

            {/* Georgia Bars */}
            {hasGeorgiaBars && (
              <g stroke='#FBBF24' strokeWidth="0.8" opacity="0.7">
                <line x1={paneX + (paneW / 2)} y1={paneY} x2={paneX + (paneW / 2)} y2={paneY + paneH} />
                <line x1={paneX} y1={paneY + (paneH / 2)} x2={paneX + paneW} y2={paneY + (paneH / 2)} />
              </g>
            )}

            {/* Inner sash */}
            <rect x={paneX + 2} y={paneY + 2} width={paneW - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="2.5" opacity="0.7" />

            {/* Panel section bottom split if panel_glass */}
            {innerType === 'panel_glass' && (
              <g>
                <rect x={paneX + 2} y={paneY + (paneH * 0.65)} width={paneW - 4} height={paneH * 0.35 - 2} fill={frameOuterColor} stroke={frameStrokeColor} />
                <line x1={paneX + 6} y1={paneY + (paneH * 0.8)} x2={paneX + paneW - 6} y2={paneY + (paneH * 0.8)} stroke={hasSpecialColor ? '#232f3f' : '#cbd5e1'} />
              </g>
            )}

            {/* Hinges pointing to the left side */}
            <g stroke="#94A3B8" strokeWidth="1" strokeDasharray="3,3" fill="none">
              <polyline points={`${paneX + paneW - 2},${paneY + 2} ${paneX + 2},${paneY + (paneH / 2)} ${paneX + paneW - 2},${paneY + paneH - 2}`} />
            </g>

            {/* Single handle on right side */}
            <rect x={paneX + paneW - 6} y={paneY + (paneH / 2) - 4} width="2.5" height="8" rx="0.5" fill="#64748B" />
          </g>
        );
      }
    } else if (opening === 'قلاب') {
      // Tilt / Tilt-only (common for toilet/kitchen ventilation, hinges on bottom, opens from top)
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
          {isFrosted && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />}
          {isPatterned && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />}

          {/* Georgia Bars */}
          {hasGeorgiaBars && (
            <g stroke='#FBBF24' strokeWidth="0.8" opacity="0.7">
              <line x1={paneX + (paneW / 2)} y1={paneY} x2={paneX + (paneW / 2)} y2={paneY + paneH} />
              <line x1={paneX} y1={paneY + (paneH / 2)} x2={paneX + paneW} y2={paneY + (paneH / 2)} />
            </g>
          )}

          {/* Inner sash */}
          <rect x={paneX + 2} y={paneY + 2} width={paneW - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="3" opacity="0.7" />

          {/* Hinges on the bottom edge (so triangle apex is at top center) */}
          <g stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2" fill="none">
            <polyline points={`${paneX + 2},${paneY + paneH - 2} ${paneX + (paneW / 2)},${paneY + 2} ${paneX + paneW - 2},${paneY + paneH - 2}`} />
          </g>

          {/* Top latched ventilation toggle */}
          <rect x={paneX + (paneW / 2) - 4} y={paneY + 4} width="8" height="2" fill="#64748B" rx="0.5" />
        </g>
      );
    } else {
      // ثابت (Fixed pane window, single solid architectural piece)
      return (
        <g>
          <rect x={paneX} y={paneY} width={paneW} height={paneH} fill={glassFill} stroke={frameStrokeColor} strokeWidth="1" />
          {isFrosted && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#frostedPattern)" opacity="0.15" />}
          {isPatterned && <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#texturedPattern)" opacity="0.12" />}

          {/* Georgia Bars */}
          {hasGeorgiaBars && (
            <g stroke='#FBBF24' strokeWidth="1" opacity="0.75">
              <line x1={paneX + (paneW / 2)} y1={paneY} x2={paneX + (paneW / 2)} y2={paneY + paneH} />
              <line x1={paneX} y1={paneY + (paneH * 0.33)} x2={paneX + paneW} y2={paneY + (paneH * 0.33)} />
              <line x1={paneX} y1={paneY + (paneH * 0.66)} x2={paneX + paneW} y2={paneY + (paneH * 0.66)} />
            </g>
          )}

          {/* Inner clean frame molding */}
          <rect x={paneX + 2} y={paneY + 2} width={paneW - 4} height={paneH - 4} fill="none" stroke={frameInnerColor} strokeWidth="1.5" opacity="0.5" />

          {/* Clean architectural shine */}
          <path d={`M ${paneX + 4} ${paneY + 4} L ${paneX + paneW - 4} ${paneY + 4} L ${paneX + 4} ${paneY + paneH - 4} Z`} fill="rgba(255,255,255,0.06)" />
          <path d={`M ${paneX + paneW - 14} ${paneY + 6} L ${paneX + paneW - 6} ${paneY + 6} L ${paneX + 6} ${paneY + paneH - 14} L ${paneX + 6} ${paneY + paneH - 6} Z`} fill="rgba(255,255,255,0.11)" />
        </g>
      );
    }
  };

  // Render a door handle for swing doors
  const renderHandle = () => {
    if (!isDoor) return null;
    if (opening === 'جرار') return null; // Sliding doors have flush latches
    
    // Normal hinged door handles
    const midY = marginY + (frameHeight / 2);
    // Draw on the side opposite of hinge pivot. Let's place it on the right side.
    const handleX = marginX + frameWidth - pSize - 8;
    return (
      <g>
        {/* Metallic backing plate */}
        <rect x={handleX} y={midY - 14} width="4" height="28" fill="#94A3B8" rx="1" stroke="#475569" strokeWidth="0.5" />
        {/* Golden key hole */}
        <circle cx={handleX + 2} cy={midY + 8} r="1" fill="#475569" />
        <rect x={handleX + 1.5} y={midY + 8} width="1" height="3.5" fill="#475569" />
        {/* Horizontal handle lever lever */}
        <rect x={handleX - 5} y={midY - 4} width="7" height="3" fill="#D1D5DB" rx="0.5" stroke="#475569" strokeWidth="0.5" />
      </g>
    );
  };

  // Check if Pleated Mosquito net or blackout rolls are installed to show indicator overlay
  const hasInsectPleatedNet = item.addons.includes('pleated');
  const hasBlackoutNet = item.addons.includes('blackout');

  return (
    <div className={`flex flex-col items-center justify-center w-full bg-slate-50 rounded-2xl border-2 transition-all duration-300 shadow-inner select-none relative group print:hidden ${
      isHidden 
        ? 'p-2.5 border-dashed border-slate-300 bg-slate-100/30' 
        : 'p-3 sm:p-4 border-slate-200/80 hover:border-slate-350'
    }`}>
      {/* Header bar with Title and Toggle Button */}
      <div className="w-full flex items-center justify-between gap-2">
        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <span>رسم المعاينة</span>
          {!isHidden && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
        </div>

        <button 
          type="button"
          onClick={() => setIsHidden(!isHidden)}
          className="p-1 px-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm text-slate-650 hover:text-[#0F172A] transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black z-20"
          title={isHidden ? "عرض الرسم" : "تصغير وإخفاء الرسم"}
        >
          {isHidden ? (
            <>
              <Eye size={12} className="text-emerald-600 animate-pulse" />
              <span>عرض الرسم</span>
            </>
          ) : (
            <>
              <EyeOff size={12} className="text-red-500" />
              <span>تصغير وإخفاء</span>
            </>
          )}
        </button>
      </div>

      <div className={`w-full flex items-center justify-center transition-all duration-300 origin-top overflow-hidden ${
        isHidden 
          ? 'h-0 opacity-0 mt-0 py-0 pointer-events-none' 
          : 'h-44 py-2 mt-4 opacity-100'
      }`}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="drop-shadow-lg max-h-full transition-transform duration-300 group-hover:scale-101"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Frosted/Sandblasted effect textures */}
            <pattern id="frostedPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#F8FAFC" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#E2E8F0" strokeWidth="1" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#E2E8F0" strokeWidth="1" />
            </pattern>
            {/* Pin-point frosted effect textures (بني سن دبوس) */}
            <pattern id="texturedPattern" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#78350F" opacity="0.5" />
            </pattern>
            {/* Pleated Screen horizontal lines overlay */}
            <pattern id="pleatedNetPattern" width="4" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="2" x2="4" y2="2" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>

          {/* Subtly draw external background representing construction mesh if desired or empty */}

          {/* 1. Main Outer Frame Profile container */}
          <rect 
            x={marginX} 
            y={marginY} 
            width={frameWidth} 
            height={frameHeight} 
            fill={frameOuterColor} 
            stroke={frameStrokeColor} 
            strokeWidth="1.5" 
            rx="2"
          />

          {/* 2. Sashes & Panels & Glass content */}
          {renderSashes()}

          {/* 3. Handle Accessory rendering */}
          {renderHandle()}

          {/* 4. Glass reflection highlights */}
          {innerType !== 'panel' && (
            <path 
              d={`M ${marginX + pSize + 4} ${marginY + pSize + 4} L ${marginX + frameWidth - pSize - 4} ${marginY + pSize + 4} L ${marginX + pSize + 4} ${marginY + frameHeight - pSize - 4} Z`} 
              fill="rgba(255,255,255,0.06)" 
              pointerEvents="none" 
            />
          )}

          {/* 5. Pleated Mosquito screen net or blackouts Overlay (if selected) */}
          {(hasInsectPleatedNet || hasBlackoutNet) && (
            <g opacity="0.85">
              {/* Cover half or entire frame to visualize screen action */}
              <rect 
                x={marginX + pSize + (opening === 'جرار' ? frameWidth / 2 : 0)} 
                y={marginY + pSize} 
                width={opening === 'جرار' ? (frameWidth / 2) - pSize : frameWidth - (pSize * 2)} 
                height={frameHeight - (pSize * 2)} 
                fill={hasBlackoutNet ? 'rgba(15, 23, 42, 0.85)' : 'url(#pleatedNetPattern)'} 
                stroke="#334155" 
                strokeWidth="1"
                className="transition-all duration-300 animate-fade-in"
              />
              {/* Pull handle bar on the edge of the pleated net */}
              <line 
                x1={marginX + pSize + (opening === 'جرار' ? frameWidth / 2 : 0)} 
                y1={marginY + pSize} 
                x2={marginX + pSize + (opening === 'جرار' ? frameWidth / 2 : 0)} 
                y2={marginY + frameHeight - pSize} 
                stroke="#0F172A" 
                strokeWidth="2" 
              />
              <circle 
                cx={marginX + pSize + (opening === 'جرار' ? frameWidth / 2 : 0)} 
                cy={marginY + (frameHeight / 2)} 
                r="1.5" 
                fill="#FACC15" 
              />
            </g>
          )}

          {/* 6. Dimensions Labels Overlay */}
          {/* Height Dimension (Left Side) */}
          <g className="text-[7.5px] font-black fill-slate-500 font-mono" textAnchor="end">
            <text x={marginX - 3} y={marginY + (frameHeight / 2) + 3}>
              {height} cm
            </text>
            <line x1={marginX - 1} y1={marginY} x2={marginX - 1} y2={marginY + frameHeight} stroke="#94A3B8" strokeWidth="0.5" />
            <line x1={marginX - 2.5} y1={marginY} x2={marginX + 0.5} y2={marginY} stroke="#94A3B8" strokeWidth="0.5" />
            <line x1={marginX - 2.5} y1={marginY + frameHeight} x2={marginX + 0.5} y2={marginY + frameHeight} stroke="#94A3B8" strokeWidth="0.5" />
          </g>

          {/* Width Dimension (Bottom Side) */}
          <g className="text-[7.5px] font-black fill-slate-500 font-mono" textAnchor="middle">
            <text x={marginX + (frameWidth / 2)} y={marginY + frameHeight + 10}>
              {width} cm
            </text>
            <line x1={marginX} y1={marginY + frameHeight + 1.5} x2={marginX + frameWidth} y2={marginY + frameHeight + 1.5} stroke="#94A3B8" strokeWidth="0.5" />
            <line x1={marginX} y1={marginY + frameHeight} x2={marginX} y2={marginY + frameHeight + 3} stroke="#94A3B8" strokeWidth="0.5" />
            <line x1={marginX + frameWidth} y1={marginY + frameHeight} x2={marginX + frameWidth} y2={marginY + frameHeight + 3} stroke="#94A3B8" strokeWidth="0.5" />
          </g>
        </svg>
      </div>

      {/* Underpreview visual info labels */}
      <div className={`w-full flex justify-between items-center text-right border-t border-slate-200/60 text-[10.5px] transition-all duration-300 origin-top overflow-hidden ${
        isHidden 
          ? 'h-0 opacity-0 mt-0 pt-0 border-t-0' 
          : 'h-auto mt-3 pt-2 opacity-100'
      }`}>
        <div className="flex flex-col">
          <span className="text-slate-400 font-bold">الفتح والنوع:</span>
          <span className="font-extrabold text-[#0F172A]">{opening} - {isDoor ? 'باب' : isBalcony ? 'بلكونة' : 'شباك'}</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-slate-400 font-bold">الجزء الداخلي:</span>
          <span className="font-extrabold text-[#0F172A]">
            {innerType === 'panel' ? 'بنل UPVC' : innerType === 'panel_glass' ? 'بنل + زجاج' : 'زجاج كامل'}
          </span>
        </div>
      </div>
    </div>
  );
};
