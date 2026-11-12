export type WpcSizeType = '70x215' | '80x215' | '90x215' | 'custom';
export type WpcPackageType = 9000 | 7000;

export interface WpcAddons {
  accessories?: boolean; // 950 EGP (enabled if package 7000, included in 9000)
  engraving?: boolean; // 650 EGP (حفر)
  printing?: boolean; // 500 EGP (طباعة)
  customSize?: boolean; // 600 EGP (مقاس خاص - auto locks on custom size)
  claddingSingle?: boolean; // 900 EGP (تجليدة سنجل)
  claddingDouble?: boolean; // 1800 EGP (تجليدة دبل داخلي وخارجي - mutually exclusive with single)
}

export interface WpcDoorItem {
  id: number;
  title: string;
  sizeType: WpcSizeType;
  customWidth?: number;
  customHeight?: number;
  basePackage: WpcPackageType;
  addons: WpcAddons;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const WPC_PRICES = {
  PACKAGE_FULL: 9000,
  PACKAGE_BASIC: 7000,
  ACCESSORIES: 950,
  ENGRAVING: 650,
  PRINTING: 500,
  CUSTOM_SIZE: 600,
  CLADDING_SINGLE: 900,
  CLADDING_DOUBLE: 1800,
} as const;

export const WPC_PACKAGES_INFO = {
  9000: {
    id: 9000 as WpcPackageType,
    name: 'باقة 9,000 ج.م',
    description: 'شامل النقل والتركيب والإكسسوارات',
    badge: 'شامل كامل',
    hasAccessoriesIncluded: true,
  },
  7000: {
    id: 7000 as WpcPackageType,
    name: 'باقة 7,000 ج.م',
    description: 'بدون نقل أو تركيب أو إكسسوارات',
    badge: 'توريد فقط',
    hasAccessoriesIncluded: false,
  },
};

export const WPC_STANDARD_SIZES: {
  id: WpcSizeType;
  label: string;
  width: number;
  height: number;
}[] = [
  { id: '70x215', label: '70 × 215 سم', width: 70, height: 215 },
  { id: '80x215', label: '80 × 215 سم', width: 80, height: 215 },
  { id: '90x215', label: '90 × 215 سم', width: 90, height: 215 },
];

export interface WpcAddonMeta {
  key: keyof WpcAddons;
  name: string;
  price: number;
  description?: string;
}

export const WPC_ADDONS_META: WpcAddonMeta[] = [
  {
    key: 'accessories',
    name: 'إكسسوارات',
    price: WPC_PRICES.ACCESSORIES,
    description: 'كالون ومقبض ومفصلات عالية الجودة (مشمولة مجاناً في باقة 9000)',
  },
  {
    key: 'engraving',
    name: 'حفر',
    price: WPC_PRICES.ENGRAVING,
    description: 'حفر ليزر وديكورات ميكانيكية مودرن',
  },
  {
    key: 'printing',
    name: 'طباعة',
    price: WPC_PRICES.PRINTING,
    description: 'طباعة وتشكيل فني عالي الدقة',
  },
  {
    key: 'customSize',
    name: 'مقاس خاص',
    price: WPC_PRICES.CUSTOM_SIZE,
    description: 'تجهيز وتفصيل باب بمقاس خاص غير قياسي',
  },
  {
    key: 'claddingSingle',
    name: 'تجليدة سنجل',
    price: WPC_PRICES.CLADDING_SINGLE,
    description: 'تجليدة سنجل لحلق الباب',
  },
  {
    key: 'claddingDouble',
    name: 'تجليدة دبل داخلي وخارجي',
    price: WPC_PRICES.CLADDING_DOUBLE,
    description: 'تجليدة كاملة دبل داخلي وخارجي للحلق',
  },
];

export function calculateWpcDoorPrice(door: {
  sizeType: WpcSizeType;
  customWidth?: number;
  customHeight?: number;
  basePackage: WpcPackageType;
  addons: WpcAddons;
  quantity?: number;
}): {
  unitPrice: number;
  totalPrice: number;
  activeAddonsList: { key: keyof WpcAddons; name: string; price: number }[];
} {
  const isCustomSize = door.sizeType === 'custom';
  let unit = door.basePackage;
  const activeAddonsList: { key: keyof WpcAddons; name: string; price: number }[] = [];

  // Accessories: if 7000 package and accessories checked
  if (door.basePackage === 7000 && door.addons.accessories) {
    unit += WPC_PRICES.ACCESSORIES;
    activeAddonsList.push({
      key: 'accessories',
      name: 'إكسسوارات',
      price: WPC_PRICES.ACCESSORIES,
    });
  }

  // Engraving
  if (door.addons.engraving) {
    unit += WPC_PRICES.ENGRAVING;
    activeAddonsList.push({
      key: 'engraving',
      name: 'حفر',
      price: WPC_PRICES.ENGRAVING,
    });
  }

  // Printing
  if (door.addons.printing) {
    unit += WPC_PRICES.PRINTING;
    activeAddonsList.push({
      key: 'printing',
      name: 'طباعة',
      price: WPC_PRICES.PRINTING,
    });
  }

  // Custom size: either custom size type or customSize addon checked
  if (isCustomSize || door.addons.customSize) {
    unit += WPC_PRICES.CUSTOM_SIZE;
    activeAddonsList.push({
      key: 'customSize',
      name: 'مقاس خاص',
      price: WPC_PRICES.CUSTOM_SIZE,
    });
  }

  // Cladding: mutually exclusive
  if (door.addons.claddingDouble) {
    unit += WPC_PRICES.CLADDING_DOUBLE;
    activeAddonsList.push({
      key: 'claddingDouble',
      name: 'تجليدة دبل داخلي وخارجي',
      price: WPC_PRICES.CLADDING_DOUBLE,
    });
  } else if (door.addons.claddingSingle) {
    unit += WPC_PRICES.CLADDING_SINGLE;
    activeAddonsList.push({
      key: 'claddingSingle',
      name: 'تجليدة سنجل',
      price: WPC_PRICES.CLADDING_SINGLE,
    });
  }

  const qty = Math.max(1, door.quantity || 1);
  return {
    unitPrice: unit,
    totalPrice: unit * qty,
    activeAddonsList,
  };
}

export function formatWpcDoorSize(door: WpcDoorItem | { sizeType: WpcSizeType; customWidth?: number; customHeight?: number }): string {
  if (door.sizeType === 'custom') {
    const w = door.customWidth || 0;
    const h = door.customHeight || 0;
    return w > 0 && h > 0 ? `مقاس خاص: ${w} × ${h} سم` : 'مقاس خاص (مخصص)';
  }
  const match = WPC_STANDARD_SIZES.find((s) => s.id === door.sizeType);
  return match ? match.label : door.sizeType;
}
