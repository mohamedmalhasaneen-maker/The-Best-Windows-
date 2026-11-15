/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteItem {
  id: string;
  text: string;
  amount: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  date: string;
  deliveryDate?: string;
  discountType?: 'percentage' | 'cash';
  discountValue?: number;
  notes?: string;
  notesAmount?: number;
  additionalNotes?: NoteItem[];
}

export interface Profile {
  id: string;
  name: string;
  price: number;
  isFlat?: boolean;
  unit?: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  isFlat?: boolean;
  unit?: string;
}

export interface QuoteItem {
  id: number;
  title: string;
  itemType: 'window' | 'door' | 'balcony' | 'armored_door';
  width: number;
  height: number;
  profile: string;
  opening: string;
  innerType?: 'glass' | 'panel' | 'panel_glass';
  glassType: string;
  hingePanes?: string;
  exhaustFan?: 'with' | 'without';
  exhaustFanLocation?: 'glass' | 'profile';
  addons: string[];
  quantity?: number;
  fixedPrice?: number;
}

export interface CalculatedItem extends QuoteItem {
  area: number;
  itemTotal: number;
  profilePrice: number;
  flatProfilePrice?: number;
  addonsPrice: number;
  flatAddonsPrice?: number;
}

export interface PricingConfig {
  profiles: Record<string, Profile>;
  addons: Record<string, Addon>;
  profileOrder: string[];
  addonOrder: string[];
  version: number;
  updatedAt: string;
}

export type WpcSizeType = '70x215' | '80x215' | '90x215' | 'custom';
export type WpcPackageType = number;

export interface WpcAddons {
  accessories?: boolean;
  engraving?: boolean;
  printing?: boolean;
  customSize?: boolean;
  claddingSingle?: boolean;
  claddingDouble?: boolean;
}

export interface WpcAddonSnapshotItem {
  key: string;
  name: string;
  price: number;
}

export interface WpcDoorItem {
  id: number;
  title: string;
  sizeType: WpcSizeType;
  customWidth?: number;
  customHeight?: number;
  basePackage: WpcPackageType;
  packageId?: string;
  packageName?: string;
  packageBadge?: string;
  basePackagePrice?: number;
  addons: WpcAddons;
  activeAddonsSnapshot?: WpcAddonSnapshotItem[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WpcDoorPackageConfig {
  id: string;
  name: string;
  description: string;
  badge: string;
  price: number;
  hasAccessoriesIncluded: boolean;
  isActive: boolean;
}

export interface WpcAddonConfig {
  key: keyof WpcAddons | string;
  name: string;
  description: string;
  price: number;
}

export interface WpcPricingConfig {
  packages: WpcDoorPackageConfig[];
  addons: Record<string, WpcAddonConfig>;
  addonOrder: string[];
}

export interface SavedQuote {
  id: string;
  name: string;
  customer: CustomerInfo;
  items: QuoteItem[];
  wpcDoors?: WpcDoorItem[];
  wpcTotal?: number;
  pricingSnapshot?: {
    profiles: Record<string, Profile>;
    addons: Record<string, Addon>;
  };
  date: string;
  totalPrice: number;
}

export interface SavedWpcQuote {
  id: string;
  name: string;
  customer: CustomerInfo;
  wpcDoors: WpcDoorItem[];
  wpcTotal: number;
  date: string;
}

export type ArmoredDoorManufactureType = string;

export interface ArmoredDoorTypeConfig {
  id: string;
  label: string;
  productName: string;
  specs: string;
  price: number;
  badge: string;
  description: string;
  includesTransportAndInstall: boolean;
  isActive: boolean;
}

export interface DoorsPricingConfig {
  wpc: WpcPricingConfig;
  armored: ArmoredDoorTypeConfig[];
  version: number;
  updatedAt: string;
}

export interface ArmoredDoorItem {
  id: number;
  title: string;
  productName: string;
  manufactureType: ArmoredDoorManufactureType;
  manufactureLabel: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  includesTransportAndInstall?: boolean;
  notes?: string;
}

export interface SavedArmoredQuote {
  id: string;
  name: string;
  customer: CustomerInfo;
  armoredDoors: ArmoredDoorItem[];
  armoredTotal: number;
  date: string;
}

export interface SavedCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationResult {
  itemsCalculated: CalculatedItem[];
  totalArea: number;
  totalPrice: number;
}

export interface CompanyContact {
  id: string;
  name: string;
  role?: string;
  phone: string;
  telUrl: string;
  whatsappUrl: string;
}

export interface CompanyLocation {
  id: string;
  name: string;
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  mapsUrl: string;
  directionsUrl: string;
  type: 'showroom' | 'factory';
  contactId?: string;
}

export interface SocialChannel {
  id: 'facebook' | 'tiktok' | 'instagram';
  name: string;
  nameAr: string;
  url: string;
}

