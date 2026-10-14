/**
 * Shared profile constants.
 */

/** Options shown in the profile's disability-type dropdown. */
export const DISABILITY_TYPES: string[] = [
  'Wheelchair User',
  'Manual Wheelchair User',
  'Power Wheelchair User',
  'Scooter User',
  'Walker User',
  'Cane User',
  'Crutch User',
  'White Cane User (Visually Impaired)',
  'Guide Dog User',
  'Deaf / Hard of Hearing',
  'Chronic Fatigue / Limited Stamina',
  'Other',
];

/** Fallback used when the saved type isn't in the list. */
export const FALLBACK_DISABILITY_TYPE = DISABILITY_TYPES[0];

/** UI label for the default role (renamed from 'auditor'). */
export const ROLE_LABELS: Record<string, string> = {
  user: 'Community Member',
  verifier: 'Verifier',
  admin: 'Administrator',
};

export const DEFAULT_ROLE_LABEL = 'Community Member';
