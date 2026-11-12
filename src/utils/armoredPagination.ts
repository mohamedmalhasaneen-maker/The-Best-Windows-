import { ArmoredDoorItem, CustomerInfo } from '../types';

export interface ArmoredQuotePageDescriptor {
  pageNumber: number;
  isFirstPage: boolean;
  armoredDoors: {
    door: ArmoredDoorItem;
    serialNumber: number;
  }[];
  showTotals: boolean;
  showTermsAndSignatures: boolean;
  equalRowHeightPx: number;
}

const PRINTABLE_HEIGHT_PX = 1036; // 1123px A4 height - 48px vertical padding - 32px footer - 7px safety margin
const TABLE_CHROME_HEIGHT_PX = 66; // Table dark header bar + column thead + borders
const MAX_ROW_HEIGHT_PX = 115; // Prevents a 1-2 item table from stretching awkwardly into half-page cells

function getHeaderHeightPx(isFirstPage: boolean, customer?: CustomerInfo): number {
  if (!isFirstPage) return 44;
  return customer?.deliveryDate ? 156 : 140;
}

function getSummaryStackHeightPx(customer?: CustomerInfo): number {
  // Independent closing stack:
  // 1. Grand Total Card (~80px)
  // 2. Prominent Inclusion Banner ("جميع الأسعار شاملة النقل والتركيب", ~46px)
  // 3. Warranty, Terms & Signatures Card (~162px, plus customer notes if present)
  // + gaps (space-y-3 = 3 * 12px = 36px)
  const baseHeight = 324;
  const notesText = customer?.notes?.trim() || '';
  if (!notesText) return baseHeight;
  const extraLines = Math.max(1, Math.ceil(notesText.length / 85));
  return baseHeight + 22 + extraLines * 14;
}

function getMinComfortableRowHeightPx(doorsSubset: ArmoredDoorItem[]): number {
  const hasNotes = doorsSubset.some((d) => Boolean(d.notes && d.notes.trim().length > 0));
  return hasNotes ? 56 : 50;
}

function evaluateDoorsFitOnPage(
  doorsSubset: ArmoredDoorItem[],
  isFirstPage: boolean,
  includeSummary: boolean,
  customer?: CustomerInfo
): { fits: boolean; rowHeight: number } {
  const count = doorsSubset.length;
  if (count === 0) {
    return { fits: true, rowHeight: 50 };
  }

  const headerH = getHeaderHeightPx(isFirstPage, customer);
  const summaryH = includeSummary ? getSummaryStackHeightPx(customer) : 0;
  const gapsH = includeSummary ? 24 : 12; // gap below header (+ gap before summary stack)
  const availForRows =
    PRINTABLE_HEIGHT_PX - headerH - TABLE_CHROME_HEIGHT_PX - summaryH - gapsH;

  if (availForRows <= 0) {
    return { fits: false, rowHeight: 0 };
  }

  const minComfortH = getMinComfortableRowHeightPx(doorsSubset);
  const rawRowH = Math.floor(availForRows / count);

  if (rawRowH < minComfortH) {
    // Do NOT compress rows or shrink fonts just to squeeze the summary in
    return { fits: false, rowHeight: minComfortH };
  }

  return {
    fits: true,
    rowHeight: Math.min(MAX_ROW_HEIGHT_PX, rawRowH),
  };
}

/**
 * Dynamically paginates Armored Doors items across A4 pages.
 * - Never injects dummy or empty rows.
 * - Never compresses row height below comfortable readability to force the Grand Total onto a full page.
 * - Automatically places the independent Grand Total + Inclusion Banner + Terms stack after the last item,
 *   moving cleanly to the top of a dedicated next page whenever space on the current page is insufficient.
 */
export function paginateArmoredQuoteIntoPages(
  armoredDoors: ArmoredDoorItem[],
  customer?: CustomerInfo
): ArmoredQuotePageDescriptor[] {
  if (!armoredDoors || armoredDoors.length === 0) {
    return [
      {
        pageNumber: 1,
        isFirstPage: true,
        armoredDoors: [],
        showTotals: true,
        showTermsAndSignatures: true,
        equalRowHeightPx: 50,
      },
    ];
  }

  const pages: ArmoredQuotePageDescriptor[] = [];
  let doorIndex = 0;
  let currentSerial = 1;
  let totalsPlaced = false;

  while (doorIndex < armoredDoors.length) {
    const isFirstPage = pages.length === 0;
    const remainingDoors = armoredDoors.slice(doorIndex);

    // 1. Check if ALL remaining doors AND the independent closing stack fit comfortably without compressing rows
    const withSummary = evaluateDoorsFitOnPage(remainingDoors, isFirstPage, true, customer);
    if (withSummary.fits) {
      pages.push({
        pageNumber: pages.length + 1,
        isFirstPage,
        armoredDoors: remainingDoors.map((door, idx) => ({
          door,
          serialNumber: currentSerial + idx,
        })),
        showTotals: true,
        showTermsAndSignatures: true,
        equalRowHeightPx: withSummary.rowHeight,
      });
      totalsPlaced = true;
      break;
    }

    // 2. Otherwise, pack the maximum number of items that fill the current page comfortably (without forcing summary)
    let maxFitCount = 0;
    let chosenRowH = 50;

    for (let testCount = remainingDoors.length; testCount >= 1; testCount--) {
      const testSubset = remainingDoors.slice(0, testCount);
      const withoutSummary = evaluateDoorsFitOnPage(testSubset, isFirstPage, false, customer);
      if (withoutSummary.fits) {
        maxFitCount = testCount;
        chosenRowH = withoutSummary.rowHeight;
        break;
      }
    }

    if (maxFitCount === 0) {
      maxFitCount = 1;
      chosenRowH = getMinComfortableRowHeightPx(remainingDoors.slice(0, 1));
    }

    const pageSubset = remainingDoors.slice(0, maxFitCount);

    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage,
      armoredDoors: pageSubset.map((door, idx) => ({
        door,
        serialNumber: currentSerial + idx,
      })),
      showTotals: false,
      showTermsAndSignatures: false,
      equalRowHeightPx: chosenRowH,
    });

    doorIndex += maxFitCount;
    currentSerial += maxFitCount;
  }

  // 3. If all actual items filled the last items page cleanly and left no comfortable space for Grand Total,
  //    automatically create the closing page with: 1) Grand Total, 2) Inclusion Banner, 3) Warranty/Terms/Signatures.
  if (!totalsPlaced) {
    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage: false,
      armoredDoors: [],
      showTotals: true,
      showTermsAndSignatures: true,
      equalRowHeightPx: 50,
    });
  }

  return pages;
}
