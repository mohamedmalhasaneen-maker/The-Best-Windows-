import { ArmoredDoorItem, ArmoredDoorManufactureType } from '../types';

export const ARMORED_DOOR_PRODUCT_NAME = 'باب مصفح تصفيح كامل – 3 كالون – 11 سم';
export const ARMORED_INCLUSION_NOTE = 'السعر شامل النقل والتركيب';
export const ARMORED_PDF_INCLUSION_BANNER = 'جميع الأسعار شاملة النقل والتركيب';

export interface ArmoredDoorTypeMeta {
  id: ArmoredDoorManufactureType;
  label: string;
  price: number;
  badge: string;
  description: string;
}

export const ARMORED_DOOR_TYPES: Record<ArmoredDoorManufactureType, ArmoredDoorTypeMeta> = {
  turkish_turkish: {
    id: 'turkish_turkish',
    label: 'تركي تقفيل تركي',
    price: 15500,
    badge: 'تقفيل تركي كامل',
    description: 'استيراد وتقفيل تركي بالكامل – السعر شامل النقل والتركيب',
  },
  turkish_egyptian: {
    id: 'turkish_egyptian',
    label: 'تركي تقفيل مصري',
    price: 13500,
    badge: 'تقفيل مصري معتمد',
    description: 'خامات وتصفيح تركي مع تقفيل مصري – السعر شامل النقل والتركيب',
  },
};

export const ARMORED_DOOR_TYPE_LIST: ArmoredDoorTypeMeta[] = [
  ARMORED_DOOR_TYPES.turkish_turkish,
  ARMORED_DOOR_TYPES.turkish_egyptian,
];

/**
 * Calculates unit price and line total for an Armored Door item.
 * Prices are strictly fixed per door (NOT per square meter) and include transport & installation.
 */
export function calculateArmoredDoorPrice(
  manufactureType: ArmoredDoorManufactureType,
  quantity?: number
): {
  manufactureType: ArmoredDoorManufactureType;
  manufactureLabel: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
} {
  const meta =
    manufactureType === 'turkish_egyptian'
      ? ARMORED_DOOR_TYPES.turkish_egyptian
      : ARMORED_DOOR_TYPES.turkish_turkish;

  const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));

  return {
    manufactureType: meta.id,
    manufactureLabel: meta.label,
    unitPrice: meta.price,
    quantity: safeQty,
    totalPrice: meta.price * safeQty,
  };
}

/**
 * Calculates total price across all armored doors in a quotation.
 * Zero additional transport/installation fees are added or deducted.
 */
export function calculateArmoredQuoteTotal(doors: ArmoredDoorItem[]): number {
  if (!Array.isArray(doors) || doors.length === 0) return 0;
  return doors.reduce((sum, door) => {
    const qty = Math.max(1, Math.floor(Number(door.quantity) || 1));
    const unit = Number(door.unitPrice) || calculateArmoredDoorPrice(door.manufactureType, 1).unitPrice;
    return sum + unit * qty;
  }, 0);
}
