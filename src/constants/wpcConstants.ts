import type {
  WpcSizeType,
  WpcPackageType,
  WpcAddons,
  WpcAddonSnapshotItem,
  WpcDoorItem,
  WpcDoorPackageConfig,
  WpcAddonConfig,
  WpcPricingConfig,
} from '../types';

export type {
  WpcSizeType,
  WpcPackageType,
  WpcAddons,
  WpcAddonSnapshotItem,
  WpcDoorItem,
  WpcDoorPackageConfig,
  WpcAddonConfig,
  WpcPricingConfig,
};

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
    description: 'شامل النقل والتركيب والإكسسوارات الكاملة (مقبض + كالون + مفصلات)',
    badge: 'شامل كامل',
    hasAccessoriesIncluded: true,
  },
  7000: {
    id: 7000 as WpcPackageType,
    name: 'باقة 7,000 ج.م',
    description: 'بدون نقل أو تركيب أو إكسسوارات (توريد المصنع فقط)',
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
    description: 'كالون ومقبض ومفصلات عالية الجودة (مشمولة مجاناً في باقة شامل كامل)',
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

export const DEFAULT_WPC_PRICING_CONFIG: WpcPricingConfig = {
  packages: [
    {
      id: '9000',
      name: 'باقة 9,000 ج.م',
      description: 'شامل النقل والتركيب والإكسسوارات الكاملة (مقبض + كالون + مفصلات)',
      badge: 'شامل كامل',
      price: WPC_PRICES.PACKAGE_FULL,
      hasAccessoriesIncluded: true,
      isActive: true,
    },
    {
      id: '7000',
      name: 'باقة 7,000 ج.م',
      description: 'بدون نقل أو تركيب أو إكسسوارات (توريد المصنع فقط)',
      badge: 'توريد فقط',
      price: WPC_PRICES.PACKAGE_BASIC,
      hasAccessoriesIncluded: false,
      isActive: true,
    },
  ],
  addons: {
    accessories: {
      key: 'accessories',
      name: 'إكسسوارات',
      description: 'كالون ومقبض ومفصلات عالية الجودة (مشمولة مجاناً في باقة شامل كامل)',
      price: WPC_PRICES.ACCESSORIES,
    },
    engraving: {
      key: 'engraving',
      name: 'حفر',
      description: 'حفر ليزر وديكورات ميكانيكية مودرن',
      price: WPC_PRICES.ENGRAVING,
    },
    printing: {
      key: 'printing',
      name: 'طباعة',
      description: 'طباعة وتشكيل فني عالي الدقة',
      price: WPC_PRICES.PRINTING,
    },
    customSize: {
      key: 'customSize',
      name: 'مقاس خاص',
      description: 'تجهيز وتفصيل باب بمقاس خاص غير قياسي',
      price: WPC_PRICES.CUSTOM_SIZE,
    },
    claddingSingle: {
      key: 'claddingSingle',
      name: 'تجليدة سنجل',
      description: 'تجليدة سنجل لحلق الباب',
      price: WPC_PRICES.CLADDING_SINGLE,
    },
    claddingDouble: {
      key: 'claddingDouble',
      name: 'تجليدة دبل داخلي وخارجي',
      description: 'تجليدة كاملة دبل داخلي وخارجي للحلق',
      price: WPC_PRICES.CLADDING_DOUBLE,
    },
  },
  addonOrder: [
    'accessories',
    'engraving',
    'printing',
    'customSize',
    'claddingSingle',
    'claddingDouble',
  ],
};

export function cloneDefaultWpcPricingConfig(): WpcPricingConfig {
  return JSON.parse(JSON.stringify(DEFAULT_WPC_PRICING_CONFIG)) as WpcPricingConfig;
}

export function resolveWpcPackageMeta(
  doorOrId: {
    packageId?: string;
    basePackage?: number;
  },
  wpcPricing: WpcPricingConfig = DEFAULT_WPC_PRICING_CONFIG
): WpcDoorPackageConfig {
  const packages = Array.isArray(wpcPricing.packages) && wpcPricing.packages.length > 0
    ? wpcPricing.packages
    : DEFAULT_WPC_PRICING_CONFIG.packages;

  if (doorOrId.packageId) {
    const byId = packages.find((p) => p.id === doorOrId.packageId);
    if (byId) return byId;
  }
  if (doorOrId.basePackage !== undefined) {
    const byLegacyId = packages.find((p) => p.id === String(doorOrId.basePackage));
    if (byLegacyId) return byLegacyId;
    const byPrice = packages.find((p) => p.price === Number(doorOrId.basePackage));
    if (byPrice) return byPrice;
  }
  return packages.find((p) => p.isActive !== false) || packages[0];
}

export function calculateWpcDoorPrice(
  door: {
    sizeType: WpcSizeType;
    customWidth?: number;
    customHeight?: number;
    basePackage?: WpcPackageType;
    packageId?: string;
    addons: WpcAddons;
    quantity?: number;
  },
  wpcPricing: WpcPricingConfig = DEFAULT_WPC_PRICING_CONFIG
): {
  unitPrice: number;
  totalPrice: number;
  activeAddonsList: { key: keyof WpcAddons | string; name: string; price: number }[];
  packageMeta: WpcDoorPackageConfig;
} {
  const isCustomSize = door.sizeType === 'custom';
  const pkg = resolveWpcPackageMeta(
    { packageId: door.packageId, basePackage: door.basePackage },
    wpcPricing
  );
  const addonCfgMap = wpcPricing.addons || DEFAULT_WPC_PRICING_CONFIG.addons;

  const getAddon = (key: keyof WpcAddons) => {
    const configured = addonCfgMap[key];
    const fallback = DEFAULT_WPC_PRICING_CONFIG.addons[key];
    return {
      name: configured?.name || fallback.name,
      price: Number.isFinite(Number(configured?.price)) ? Number(configured.price) : fallback.price,
    };
  };

  let unit = Number(pkg.price) || 0;
  const activeAddonsList: { key: keyof WpcAddons | string; name: string; price: number }[] = [];

  // Accessories: charged only when selected AND NOT included free in selected package
  if (!pkg.hasAccessoriesIncluded && door.addons?.accessories) {
    const acc = getAddon('accessories');
    unit += acc.price;
    activeAddonsList.push({
      key: 'accessories',
      name: acc.name,
      price: acc.price,
    });
  }

  // Engraving
  if (door.addons?.engraving) {
    const eng = getAddon('engraving');
    unit += eng.price;
    activeAddonsList.push({
      key: 'engraving',
      name: eng.name,
      price: eng.price,
    });
  }

  // Printing
  if (door.addons?.printing) {
    const prn = getAddon('printing');
    unit += prn.price;
    activeAddonsList.push({
      key: 'printing',
      name: prn.name,
      price: prn.price,
    });
  }

  // Custom size: either custom size type or customSize addon checked
  if (isCustomSize || door.addons?.customSize) {
    const cs = getAddon('customSize');
    unit += cs.price;
    activeAddonsList.push({
      key: 'customSize',
      name: cs.name,
      price: cs.price,
    });
  }

  // Cladding: mutually exclusive
  if (door.addons?.claddingDouble) {
    const cd = getAddon('claddingDouble');
    unit += cd.price;
    activeAddonsList.push({
      key: 'claddingDouble',
      name: cd.name,
      price: cd.price,
    });
  } else if (door.addons?.claddingSingle) {
    const csingle = getAddon('claddingSingle');
    unit += csingle.price;
    activeAddonsList.push({
      key: 'claddingSingle',
      name: csingle.name,
      price: csingle.price,
    });
  }

  const qty = Math.max(1, door.quantity || 1);
  return {
    unitPrice: unit,
    totalPrice: unit * qty,
    activeAddonsList,
    packageMeta: pkg,
  };
}

/**
 * Returns immutable historical display data for an already-created or saved WPC door item.
 * NEVER recalculates prices using mutated live settings so old quotes remain frozen.
 */
export function getWpcDoorDisplayData(door: WpcDoorItem): {
  unitPrice: number;
  totalPrice: number;
  packageName: string;
  packageBadge: string;
  isFullPackage: boolean;
  activeAddonsList: { key: string; name: string; price: number }[];
} {
  const qty = Math.max(1, Number(door.quantity) || 1);
  const fallbackCalc = calculateWpcDoorPrice(door, DEFAULT_WPC_PRICING_CONFIG);

  const unitPrice = Number.isFinite(Number(door.unitPrice))
    ? Number(door.unitPrice)
    : fallbackCalc.unitPrice;
  const totalPrice = Number.isFinite(Number(door.totalPrice))
    ? Number(door.totalPrice)
    : unitPrice * qty;

  const activeAddonsList =
    Array.isArray(door.activeAddonsSnapshot)
      ? door.activeAddonsSnapshot
      : fallbackCalc.activeAddonsList.map((a) => ({
          key: String(a.key),
          name: a.name,
          price: a.price,
        }));

  const isLegacyFull = door.basePackage === 9000 || door.packageId === '9000';
  const packageName =
    door.packageName ||
    (isLegacyFull
      ? 'باقة 9000 (شامل التركيب)'
      : door.basePackage === 7000 || door.packageId === '7000'
      ? 'باقة 7000 (توريد فقط)'
      : `باقة ${door.basePackage} ج.م`);

  const packageBadge =
    door.packageBadge || (isLegacyFull ? 'شامل كامل' : 'توريد فقط');

  return {
    unitPrice,
    totalPrice,
    packageName,
    packageBadge,
    isFullPackage: isLegacyFull || packageBadge.includes('شامل'),
    activeAddonsList,
  };
}

export function formatWpcDoorSize(
  door: WpcDoorItem | { sizeType: WpcSizeType; customWidth?: number; customHeight?: number }
): string {
  if (door.sizeType === 'custom') {
    const w = door.customWidth || 0;
    const h = door.customHeight || 0;
    return w > 0 && h > 0 ? `مقاس خاص: ${w} × ${h} سم` : 'مقاس خاص (مخصص)';
  }
  const match = WPC_STANDARD_SIZES.find((s) => s.id === door.sizeType);
  return match ? match.label : door.sizeType;
}
