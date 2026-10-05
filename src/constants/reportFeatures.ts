export type FeatureKey =
  | 'ramp'
  | 'elevator'
  | 'toilet'
  | 'parking'
  | 'stepFree'
  | 'tactilePaving'
  | 'automaticDoor';

export interface FeatureMetaItem {
  label: string;
  category: 'Mobility' | 'Facilities' | 'Sensory';
  icon: string;
  hint: string;
  description: string;
}

export const FEATURE_METADATA: Record<FeatureKey, FeatureMetaItem> = {
  ramp: {
    label: 'Wheelchair Ramp',
    category: 'Mobility',
    icon: 'wheelchair',
    hint: 'availability of wheelchair ramps',
    description: 'Low-slope ramp with handrails',
  },
  elevator: {
    label: 'Elevator Access',
    category: 'Mobility',
    icon: 'elevator-passenger',
    hint: 'elevator availability for multi-floor transit',
    description: 'Wide elevator with braille & audio',
  },
  toilet: {
    label: 'Accessible Restroom',
    category: 'Facilities',
    icon: 'human-wheelchair',
    hint: 'dedicated wheelchair accessible restroom',
    description: 'Restroom with grab bars & wide door',
  },
  parking: {
    label: 'Disabled Parking',
    category: 'Facilities',
    icon: 'car',
    hint: 'designated parking bays near entrance',
    description: 'Designated accessible parking spaces',
  },
  stepFree: {
    label: 'Step-Free Entrance',
    category: 'Mobility',
    icon: 'walk',
    hint: 'threshold without stairs or steps',
    description: 'Zero-step entrance threshold',
  },
  tactilePaving: {
    label: 'Tactile Paving',
    category: 'Sensory',
    icon: 'road-variant',
    hint: 'tactile paving floor guidance for visually impaired',
    description: 'Raised ground indicators for cane users',
  },
  automaticDoor: {
    label: 'Automatic Door',
    category: 'Mobility',
    icon: 'door',
    hint: 'power-assisted or automatic sensor door',
    description: 'Sensor sliding doors or push buttons',
  },
};

export const QUICK_AUDIT_PRESETS = [
  'Wheelchair ramp is clear and low-slope',
  'Elevator is fully operational with braille',
  'Accessible restroom unlocked and well-maintained',
  'Step-free entrance with wide sliding doors',
  'Entrance ramp currently blocked by temporary obstacles',
  'Platform elevator undergoing maintenance',
];
