import * as Haptics from 'expo-haptics';

/**
 * Central haptic helpers so every surface feels the same and the whole
 * feature can be silenced from Profile → Accessibility Preferences.
 * The flag is synced from `userProfile.preferences.hapticsEnabled` in AppContext.
 */
let enabled = true;

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

/** Icon / button taps — crisp selection tick. */
export const hapticIcon = () => {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => undefined);
};

/** Text input field touch / focus — softer light impact. */
export const hapticInput = () => {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

/** Stronger press — send, voice recording start. */
export const hapticMedium = () => {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
};

/** Success events — place saved, form submitted, alert sent. */
export const hapticSuccess = () => {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};

/** Warning / destructive actions. */
export const hapticWarning = () => {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
};
