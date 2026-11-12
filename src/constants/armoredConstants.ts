import {
  ArmoredDoorItem,
  ArmoredDoorManufactureType,
  ArmoredDoorTypeConfig,
} from '../types';

export const ARMORED_DOOR_PRODUCT_NAME = 'باب مصفح تصفيح كامل – 3 كالون – 11 سم';
export const ARMORED_DOOR_EGYPTIAN_SINGLE_NAME = 'باب مصفح مصري – كالون واحد';
export const ARMORED_INCLUSION_NOTE = 'السعر شامل النقل والتركيب';
export const ARMORED_EXCLUSION_NOTE = 'السعر غير شامل النقل والتركيب';
export const ARMORED_PDF_INCLUSION_BANNER = 'جميع الأسعار شاملة النقل والتركيب';

export type ArmoredDoorTypeMeta = ArmoredDoorTypeConfig;

export const DEFAULT_ARMORED_DOOR_TYPES: ArmoredDoorTypeConfig[] = [
  {
    id: 'turkish_turkish',
    label: 'تركي تقفيل تركي',
    productName: ARMORED_DOOR_PRODUCT_NAME,
    specs: 'تصفيح كامل – 3 كالون – 11 سم',
    price: 15500,
    badge: 'تقفيل تركي كامل',
    description: 'تصفيح كامل – 3 كالون – 11 سم · السعر شامل النقل والتركيب',
    includesTransportAndInstall: true,
    isActive: true,
  },
  {
    id: 'turkish_egyptian',
    label: 'تركي تقفيل مصري',
    productName: ARMORED_DOOR_PRODUCT_NAME,
    specs: 'تصفيح كامل – 3 كالون – 11 سم',
    price: 13500,
    badge: 'تقفيل مصري معتمد',
    description: 'تصفيح كامل – 3 كالون – 11 سم · السعر شامل النقل والتركيب',
    includesTransportAndInstall: true,
    isActive: true,
  },
  {
    id: 'egyptian_single',
    label: 'مصري كالون واحد',
    productName: ARMORED_DOOR_EGYPTIAN_SINGLE_NAME,
    specs: 'باب مصفح مصري – كالون واحد',
    price: 10500,
    badge: 'كالون واحد',
    description: 'باب مصفح مصري – كالون واحد · السعر شامل النقل والتركيب',
    includesTransportAndInstall: true,
    isActive: true,
  },
];

export const ARMORED_DOOR_TYPES: Record<string, ArmoredDoorTypeConfig> = {
  turkish_turkish: DEFAULT_ARMORED_DOOR_TYPES[0],
  turkish_egyptian: DEFAULT_ARMORED_DOOR_TYPES[1],
  egyptian_single: DEFAULT_ARMORED_DOOR_TYPES[2],
};

export const ARMORED_DOOR_TYPE_LIST: ArmoredDoorTypeConfig[] = DEFAULT_ARMORED_DOOR_TYPES;

export function cloneDefaultArmoredDoorTypes(): ArmoredDoorTypeConfig[] {
  return JSON.parse(JSON.stringify(DEFAULT_ARMORED_DOOR_TYPES)) as ArmoredDoorTypeConfig[];
}

export function getArmoredDoorTypeMeta(
  manufactureType?: ArmoredDoorManufactureType,
  armoredTypes?: ArmoredDoorTypeConfig[]
): ArmoredDoorTypeConfig {
  const list =
    Array.isArray(armoredTypes) && armoredTypes.length > 0
      ? armoredTypes
      : DEFAULT_ARMORED_DOOR_TYPES;

  if (manufactureType) {
    const exactMatch = list.find((t) => t.id === manufactureType);
    if (exactMatch) return exactMatch;

    const defaultMatch = DEFAULT_ARMORED_DOOR_TYPES.find((t) => t.id === manufactureType);
    if (defaultMatch) return defaultMatch;
  }

  return list.find((t) => t.isActive !== false) || list[0];
}

export function getArmoredDoorProductName(
  manufactureType?: ArmoredDoorManufactureType,
  armoredTypes?: ArmoredDoorTypeConfig[]
): string {
  return getArmoredDoorTypeMeta(manufactureType, armoredTypes).productName;
}

/**
 * Calculates unit price and line total for an Armored Door item using the provided
 * live Armored Door catalog (or defaults if omitted).
 * Prices are strictly fixed per door (NOT per square meter).
 */
export function calculateArmoredDoorPrice(
  manufactureType: ArmoredDoorManufactureType,
  quantity?: number,
  armoredTypes?: ArmoredDoorTypeConfig[]
): {
  manufactureType: ArmoredDoorManufactureType;
  manufactureLabel: string;
  productName: string;
  specs: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  includesTransportAndInstall: boolean;
} {
  const meta = getArmoredDoorTypeMeta(manufactureType, armoredTypes);
  const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const unitPrice = Number.isFinite(Number(meta.price)) ? Number(meta.price) : 0;

  return {
    manufactureType: meta.id,
    manufactureLabel: meta.label,
    productName: meta.productName || meta.specs,
    specs: meta.specs,
    unitPrice,
    quantity: safeQty,
    totalPrice: unitPrice * safeQty,
    includesTransportAndInstall: meta.includesTransportAndInstall !== false,
  };
}

/**
 * Calculates total price across all armored doors in a quotation.
 * Strictly honors stored item snapshots (totalPrice / unitPrice * quantity)
 * so previously saved quotes never change when admin edits future catalog prices.
 */
export function calculateArmoredQuoteTotal(doors: ArmoredDoorItem[]): number {
  if (!Array.isArray(doors) || doors.length === 0) return 0;
  return doors.reduce((sum, door) => {
    const qty = Math.max(1, Math.floor(Number(door.quantity) || 1));
    const storedUnit = Number(door.unitPrice);
    const storedTotal = Number(door.totalPrice);
    if (Number.isFinite(storedTotal) && storedTotal >= 0) {
      return sum + storedTotal;
    }
    const unit = Number.isFinite(storedUnit)
      ? storedUnit
      : getArmoredDoorTypeMeta(door.manufactureType).price;
    return sum + unit * qty;
  }, 0);
}
