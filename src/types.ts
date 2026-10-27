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

export interface SavedQuote {
  id: string;
  name: string;
  customer: CustomerInfo;
  items: QuoteItem[];
  pricingSnapshot?: {
    profiles: Record<string, Profile>;
    addons: Record<string, Addon>;
  };
  date: string;
  totalPrice: number;
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

