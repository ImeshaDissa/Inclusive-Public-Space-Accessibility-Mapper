import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place, Report, AppNotification, UserProfile, StatusType } from '@/types/accessibility';
import { MOCK_PLACES, MOCK_REPORTS, INITIAL_USER_PROFILE, INITIAL_NOTIFICATIONS } from '@/constants/mockData';
import {
  createReportInBackend,
  fetchReportsFromBackend,
  confirmReportInBackend,
  disputeReportInBackend,
} from '@/features/reports/api';
import { CreateReportResult } from '@/features/reports/types';

type LocalAccount = {
  name: string;
  email: string;
  password: string;
  profile: UserProfile;
};

type AuthActionResult = {
  success: boolean;
  message?: string;
};

const STORAGE_KEYS = {
  accounts: '@inclusive-mapper/accounts',
  activeEmail: '@inclusive-mapper/active-email',
  places: '@inclusive-mapper/places',
  reports: '@inclusive-mapper/reports',
  notifications: '@inclusive-mapper/notifications',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

const createProfile = (name: string, email: string, avatar: string = DEFAULT_AVATAR): UserProfile => ({
  ...INITIAL_USER_PROFILE,
  name,
  email,
  avatar,
});

const DEMO_ACCOUNT: LocalAccount = {
  name: INITIAL_USER_PROFILE.name,
  email: INITIAL_USER_PROFILE.email,
  password: 'demo1234',
  profile: INITIAL_USER_PROFILE,
};

const parseArray = <T,>(value: string | null, fallback: T[]): T[] => {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseString = (value: string | null) => {
  if (!value) return null;

  try {
    return JSON.parse(value) as string | null;
  } catch {
    return value;
  }
};

interface AppContextType {
  isAuthenticated: boolean;
  authReady: boolean;
  authEmail: string | null;
  signIn: (credentials: { email: string; password: string }) => Promise<AuthActionResult>;
  signUp: (details: {
    name: string;
    email: string;
    password: string;
    avatar?: string;
  }) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  places: Place[];
  reports: Report[];
  notifications: AppNotification[];
  userProfile: UserProfile;
  selectedPlaceId: string | null;
  setSelectedPlaceId: (id: string | null) => void;
  toggleSavePlace: (placeId: string) => void;
  addReport: (reportData: {
    placeId?: string;
    placeName: string;
    note: string;
    featuresReported: Record<string, boolean>;
    photos: string[];
    priority?: 'High' | 'Medium' | 'Low';
    location?: { latitude: number; longitude: number; address: string };
  }) => Promise<CreateReportResult>;
  confirmReport: (reportId: string) => void;
  disputeReport: (reportId: string, reason: string, note?: string) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  clearNotifications: () => void;
  markNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function computeStatus(confirmCount: number, disputeCount: number): StatusType {
  if (disputeCount >= 2) return 'disputed';
  if (confirmCount >= 3) return 'verified';
  return 'pending';
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [accounts, setAccounts] = useState<LocalAccount[]>([DEMO_ACCOUNT]);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadState = async () => {
      try {
        const [storedAccounts, storedActiveEmail, storedPlaces, storedReports, storedNotifications] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.accounts),
            AsyncStorage.getItem(STORAGE_KEYS.activeEmail),
            AsyncStorage.getItem(STORAGE_KEYS.places),
            AsyncStorage.getItem(STORAGE_KEYS.reports),
            AsyncStorage.getItem(STORAGE_KEYS.notifications),
          ]);

        const nextAccounts = parseArray<LocalAccount>(storedAccounts, [DEMO_ACCOUNT]);
        const nextActiveEmail = parseString(storedActiveEmail);
        const activeAccount = nextActiveEmail
          ? nextAccounts.find((account) => account.email.toLowerCase() === nextActiveEmail.toLowerCase())
          : null;

        if (!isActive) return;

        setAccounts(nextAccounts.length > 0 ? nextAccounts : [DEMO_ACCOUNT]);
        setAuthEmail(activeAccount ? activeAccount.email : null);
        setUserProfile(activeAccount ? activeAccount.profile : INITIAL_USER_PROFILE);
        setPlaces(parseArray<Place>(storedPlaces, MOCK_PLACES));
        setReports(parseArray<Report>(storedReports, MOCK_REPORTS));
        setNotifications(parseArray<AppNotification>(storedNotifications, INITIAL_NOTIFICATIONS));

        // Background sync: pull reports from Supabase backend
        fetchReportsFromBackend()
          .then((backendReports) => {
            if (backendReports && backendReports.length > 0 && isActive) {
              setReports((prev) => {
                const map = new Map<string, Report>();
                prev.forEach((r) => map.set(r.id, r));
                backendReports.forEach((r) => map.set(r.id, r));
                return Array.from(map.values());
              });
            }
          })
          .catch(() => {});
      } catch {
        if (!isActive) return;
        setAccounts([DEMO_ACCOUNT]);
        setAuthEmail(null);
        setUserProfile(INITIAL_USER_PROFILE);
        setPlaces(MOCK_PLACES);
        setReports(MOCK_REPORTS);
        setNotifications(INITIAL_NOTIFICATIONS);
      } finally {
        if (isActive) {
          setAuthReady(true);
        }
      }
    };

    loadState();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts)).catch(() => undefined);
  }, [accounts, authReady]);

  useEffect(() => {
    if (!authReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.activeEmail, JSON.stringify(authEmail)).catch(() => undefined);
  }, [authEmail, authReady]);

  useEffect(() => {
    if (!authReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.places, JSON.stringify(places)).catch(() => undefined);
  }, [places, authReady]);

  useEffect(() => {
    if (!authReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports)).catch(() => undefined);
  }, [reports, authReady]);

  useEffect(() => {
    if (!authReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications)).catch(() => undefined);
  }, [notifications, authReady]);

  useEffect(() => {
    if (!authReady || !authEmail) return;

    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.email.toLowerCase() === authEmail.toLowerCase()
          ? {
              ...account,
              name: userProfile.name,
              email: userProfile.email,
              profile: userProfile,
            }
          : account
      )
    );
  }, [authEmail, authReady, userProfile]);

  const toggleSavePlace = (placeId: string) => {
    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => (p.id === placeId ? { ...p, saved: !p.saved } : p))
    );
  };

  const addNotificationIfSaved = (
    placeId: string,
    placeName: string,
    oldStatus: StatusType,
    newStatus: StatusType
  ) => {
    const targetPlace = places.find((p) => p.id === placeId);
    if (targetPlace && targetPlace.saved) {
      const statusLabel = newStatus.toUpperCase();
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        placeId,
        placeName,
        oldStatus,
        newStatus,
        message: `Status updated: ${placeName} is now marked ${statusLabel}`,
        timestamp: 'Just now',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const addReport = async ({
    placeId,
    placeName,
    note,
    featuresReported,
    photos,
    priority = 'Medium',
    location,
  }: {
    placeId?: string;
    placeName: string;
    note: string;
    featuresReported: Record<string, boolean>;
    photos: string[];
    priority?: 'High' | 'Medium' | 'Low';
    location?: { latitude: number; longitude: number; address: string };
  }): Promise<CreateReportResult> => {
    let targetPlaceId = placeId;
    let existingPlace = places.find((p) => p.id === placeId || p.name.toLowerCase() === placeName.toLowerCase());

    if (!existingPlace) {
      targetPlaceId = `place-${Date.now()}`;
      const newPlace: Place = {
        id: targetPlaceId,
        name: placeName,
        category: 'Community Reported Venue',
        address: location?.address || 'User Submitted Location',
        lat: location?.latitude || (37.775 + (Math.random() - 0.5) * 0.03),
        lng: location?.longitude || (-122.418 + (Math.random() - 0.5) * 0.03),
        features: {
          ramp: !!featuresReported.ramp,
          elevator: !!featuresReported.elevator,
          toilet: !!featuresReported.toilet,
          parking: !!featuresReported.parking,
          stepFree: !!featuresReported.stepFree,
          tactilePaving: !!featuresReported.tactilePaving,
          automaticDoor: !!featuresReported.automaticDoor,
        },
        photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
        confirmCount: 1,
        disputeCount: 0,
        status: 'pending',
        saved: true,
        description: note || 'Newly submitted place by community accessibility auditor.',
      };
      setPlaces((prev) => [newPlace, ...prev]);
    } else {
      targetPlaceId = existingPlace.id;
    }

    // Call Supabase backend service (with automatic offline/local fallback)
    const result = await createReportInBackend({
      placeId: targetPlaceId,
      placeName: existingPlace ? existingPlace.name : placeName,
      note: note || 'Community accessibility audit submitted.',
      featuresReported,
      photos,
      priority,
      submitterName: userProfile.name + ' (You)',
      submitterAvatar: userProfile.avatar,
      location,
    });

    // Update local state and AsyncStorage cache
    setReports((prev) => [result.report, ...prev]);

    return result;
  };

  const confirmReport = (reportId: string) => {
    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport || targetReport.status === 'verified' || targetReport.status === 'disputed') return;

    const newConfirm = targetReport.confirmCount + 1;
    const newStatus = computeStatus(newConfirm, targetReport.disputeCount);

    setReports((prevReports) =>
      prevReports.map((r) => {
        if (r.id !== reportId) return r;
        return { ...r, confirmCount: newConfirm, status: newStatus };
      })
    );

    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => {
        if (p.id !== targetReport.placeId) return p;
        const placeConfirms = p.confirmCount + 1;
        const updatedPlaceStatus = computeStatus(placeConfirms, p.disputeCount);
        if (updatedPlaceStatus !== p.status) {
          addNotificationIfSaved(p.id, p.name, p.status, updatedPlaceStatus);
        }
        return { ...p, confirmCount: placeConfirms, status: updatedPlaceStatus };
      })
    );

    // Sync to Supabase backend in the background
    confirmReportInBackend(reportId, newConfirm, newStatus);
  };

  const disputeReport = (reportId: string, reason: string, note?: string) => {
    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport || targetReport.status === 'verified' || targetReport.status === 'disputed') return;

    const newDisputes = targetReport.disputeCount + 1;
    const newStatus = computeStatus(targetReport.confirmCount, newDisputes);
    const updatedReasons = [...(targetReport.disputeReasons || []), reason];

    setReports((prevReports) =>
      prevReports.map((r) => {
        if (r.id !== reportId) return r;
        return {
          ...r,
          disputeCount: newDisputes,
          disputeReasons: updatedReasons,
          status: newStatus,
        };
      })
    );

    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => {
        if (p.id !== targetReport.placeId) return p;
        const placeDisputes = p.disputeCount + 1;
        const placeStatus = computeStatus(p.confirmCount, placeDisputes);
        addNotificationIfSaved(p.id, p.name, p.status, placeStatus);
        return { ...p, disputeCount: placeDisputes, status: placeStatus };
      })
    );

    // Sync to Supabase backend in the background
    disputeReportInBackend(reportId, reason, newDisputes, newStatus);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const signIn = async ({ email, password }: { email: string; password: string }): Promise<AuthActionResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((entry) => entry.email.toLowerCase() === normalizedEmail);

    if (!account) {
      return { success: false, message: 'No local account found for that email.' };
    }

    if (account.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }

    setAuthEmail(account.email);
    setUserProfile(account.profile);
    return { success: true };
  };

  const signUp = async ({
    name,
    email,
    password,
    avatar,
  }: {
    name: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<AuthActionResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password.trim()) {
      return { success: false, message: 'Name, email, and password are required.' };
    }

    if (accounts.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: 'An account with that email already exists.' };
    }

    const nextProfile = createProfile(name.trim(), normalizedEmail, avatar?.trim() || DEFAULT_AVATAR);
    const nextAccount: LocalAccount = {
      name: name.trim(),
      email: normalizedEmail,
      password,
      profile: nextProfile,
    };

    setAccounts((currentAccounts) => [nextAccount, ...currentAccounts]);
    setAuthEmail(nextAccount.email);
    setUserProfile(nextProfile);

    return { success: true };
  };

  const signOut = async () => {
    setAuthEmail(null);
    setUserProfile(INITIAL_USER_PROFILE);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: !!authEmail,
        authReady,
        authEmail,
        signIn,
        signUp,
        signOut,
        places,
        reports,
        notifications,
        userProfile,
        selectedPlaceId,
        setSelectedPlaceId,
        toggleSavePlace,
        addReport,
        confirmReport,
        disputeReport,
        updateUserProfile,
        clearNotifications,
        markNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
