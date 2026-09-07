import { Ionicons } from '@expo/vector-icons';
import { AccessibilityFeatures, StatusType } from './accessibility';

export interface PlaceCategory {
  id: string;
  name: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  description: string;
}

export interface SavedCategoryPlace {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  features: AccessibilityFeatures;
  photos: string[];
  confirmCount: number;
  disputeCount: number;
  status: StatusType;
  saved: boolean;
  description?: string;
}

export interface SelectedVenuePayload {
  placeId?: string;
  name: string;
  category: string;
  categoryId: string;
  address: string;
  isNewCustomPlace: boolean;
}
