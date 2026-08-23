export type StatusType = 'verified' | 'pending' | 'disputed';

export interface AccessibilityFeatures {
  ramp: boolean;
  elevator: boolean;
  toilet: boolean;
  parking: boolean;
  stepFree: boolean;
  tactilePaving: boolean;
  automaticDoor: boolean;
}

export interface Place {
  id: string;
  name: string;
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

export type PriorityType = 'High' | 'Medium' | 'Low';

export interface Report {
  id: string;
  placeId: string;
  placeName: string;
  submitterName: string;
  submitterAvatar?: string;
  timestamp: string;
  note: string;
  featuresReported: Partial<AccessibilityFeatures>;
  photos: string[];
  priority: PriorityType;
  confirmCount: number;
  disputeCount: number;
  status: StatusType;
  disputeReasons?: string[];
}

export interface AppNotification {
  id: string;
  placeId: string;
  placeName: string;
  oldStatus: StatusType;
  newStatus: StatusType;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  hasDisability: boolean;
  disabilityType: string;
  preferences: {
    requireRamp: boolean;
    requireElevator: boolean;
    requireAccessibleToilet: boolean;
    requireStepFree: boolean;
  };
}
