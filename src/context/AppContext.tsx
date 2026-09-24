import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place, Report, AppNotification, UserProfile, StatusType } from '@/types/accessibility';
import { MOCK_PLACES, MOCK_REPORTS, INITIAL_USER_PROFILE, INITIAL_NOTIFICATIONS } from '@/constants/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  signInWithSupabase,
  signUpWithSupabase,
  signOutWithSupabase,
  fetchSupabaseProfile,
  updateSupabaseProfile,
} from '@/features/auth/api';
import {
  fetchPlacesFromSupabase,
  insertPlaceToSupabase,
  updatePlaceStatusInSupabase,
  toggleSavePlaceInSupabase,
} from '@/features/places/api';
import {
  fetchReportsFromSupabase,
  insertReportToSupabase,
  updateReportConfirmInSupabase,
  updateReportDisputeInSupabase,
} from '@/features/reviews/api';
import {
  fetchNotificationsFromSupabase,
  insertNotificationToSupabase,
  markNotificationsReadInSupabase,
  clearNotificationsInSupabase,
} from '@/features/notifications/api';

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
    const parsed = JSON.parse(value) as T[];
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
  userId: string | null;
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
  }) => void;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Initialize Data & Load Supabase or Storage state
  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      try {
        if (isSupabaseConfigured) {
          // Check active Supabase session
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isActive) {
            const user = data.session.user;
            setUserId(user.id);
            setAuthEmail(user.email || null);

            const [profile, userNotifs] = await Promise.all([
              fetchSupabaseProfile(user.id, user.email || ''),
              fetchNotificationsFromSupabase(user.id),
            ]);

            if (isActive) {
              setUserProfile(profile);
              if (userNotifs.length > 0) setNotifications(userNotifs);
            }
          }

          // Fetch Places & Reports from Supabase
          const [fetchedPlaces, fetchedReports] = await Promise.all([
            fetchPlacesFromSupabase(data.session?.user?.id),
            fetchReportsFromSupabase(),
          ]);

          if (isActive) {
            if (fetchedPlaces.length > 0) setPlaces(fetchedPlaces);
            if (fetchedReports.length > 0) setReports(fetchedReports);
          }
        } else {
          // Local Storage fallback when Supabase is not yet configured
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
            ? nextAccounts.find((a) => a.email.toLowerCase() === nextActiveEmail.toLowerCase())
            : null;

          if (!isActive) return;

          setAccounts(nextAccounts.length > 0 ? nextAccounts : [DEMO_ACCOUNT]);
          setAuthEmail(activeAccount ? activeAccount.email : null);
          setUserProfile(activeAccount ? activeAccount.profile : INITIAL_USER_PROFILE);
          setPlaces(parseArray<Place>(storedPlaces, MOCK_PLACES));
          setReports(parseArray<Report>(storedReports, MOCK_REPORTS));
          setNotifications(parseArray<AppNotification>(storedNotifications, INITIAL_NOTIFICATIONS));
        }
      } catch (err) {
        console.error('Error loading initial app data:', err);
      } finally {
        if (isActive) setAuthReady(true);
      }
    };

    loadInitialData();

    // Subscribe to Supabase Auth state changes
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isActive) return;
        if (session?.user) {
          setUserId(session.user.id);
          setAuthEmail(session.user.email || null);
          const [profile, userNotifs] = await Promise.all([
            fetchSupabaseProfile(session.user.id, session.user.email || ''),
            fetchNotificationsFromSupabase(session.user.id),
          ]);
          if (isActive) {
            setUserProfile(profile);
            if (userNotifs.length > 0) setNotifications(userNotifs);
          }
        } else {
          setUserId(null);
          setAuthEmail(null);
          setUserProfile(INITIAL_USER_PROFILE);
          setNotifications(INITIAL_NOTIFICATIONS);
        }
      });
      authSubscription = listener.subscription;
    }

    return () => {
      isActive = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Sync to local storage for offline fallback
  useEffect(() => {
    if (!authReady || isSupabaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts)).catch(() => undefined);
  }, [accounts, authReady]);

  useEffect(() => {
    if (!authReady || isSupabaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEYS.activeEmail, JSON.stringify(authEmail)).catch(() => undefined);
  }, [authEmail, authReady]);

  useEffect(() => {
    if (!authReady || isSupabaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEYS.places, JSON.stringify(places)).catch(() => undefined);
  }, [places, authReady]);

  useEffect(() => {
    if (!authReady || isSupabaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports)).catch(() => undefined);
  }, [reports, authReady]);

  useEffect(() => {
    if (!authReady || isSupabaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications)).catch(() => undefined);
  }, [notifications, authReady]);

  const toggleSavePlace = (placeId: string) => {
    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => {
        if (p.id === placeId) {
          const newSaved = !p.saved;
          if (isSupabaseConfigured && userId) {
            toggleSavePlaceInSupabase(userId, placeId, newSaved);
          }
          return { ...p, saved: newSaved };
        }
        return p;
      })
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

      if (isSupabaseConfigured && userId) {
        insertNotificationToSupabase(newNotif, userId);
      }
    }
  };

  const addReport = ({
    placeId,
    placeName,
    note,
    featuresReported,
    photos,
    priority = 'Medium',
  }: {
    placeId?: string;
    placeName: string;
    note: string;
    featuresReported: Record<string, boolean>;
    photos: string[];
    priority?: 'High' | 'Medium' | 'Low';
  }) => {
    let targetPlaceId = placeId;
    let existingPlace = places.find((p) => p.id === placeId || p.name.toLowerCase() === placeName.toLowerCase());

    if (!existingPlace) {
      targetPlaceId = `place-${Date.now()}`;
      const newPlace: Place = {
        id: targetPlaceId,
        name: placeName,
        category: 'Community Reported Venue',
        address: 'User Submitted Location',
        lat: 37.775 + (Math.random() - 0.5) * 0.03,
        lng: -122.418 + (Math.random() - 0.5) * 0.03,
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
      if (isSupabaseConfigured) {
        insertPlaceToSupabase(newPlace);
      }
    } else {
      targetPlaceId = existingPlace.id;
    }

    const newReport: Report = {
      id: `report-${Date.now()}`,
      placeId: targetPlaceId!,
      placeName: existingPlace ? existingPlace.name : placeName,
      submitterName: userProfile.name + ' (You)',
      submitterAvatar: userProfile.avatar,
      timestamp: 'Just now',
      note: note || 'Community accessibility audit submitted.',
      featuresReported,
      photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
      priority,
      confirmCount: 1,
      disputeCount: 0,
      status: 'pending',
    };

    setReports((prev) => [newReport, ...prev]);

    if (isSupabaseConfigured) {
      insertReportToSupabase(newReport, userId || undefined);
    }
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

    if (isSupabaseConfigured) {
      updateReportConfirmInSupabase(reportId, newConfirm, newStatus);
    }

    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => {
        if (p.id !== targetReport.placeId) return p;
        const placeConfirms = p.confirmCount + 1;
        const updatedPlaceStatus = computeStatus(placeConfirms, p.disputeCount);
        if (updatedPlaceStatus !== p.status) {
          addNotificationIfSaved(p.id, p.name, p.status, updatedPlaceStatus);
        }
        if (isSupabaseConfigured) {
          updatePlaceStatusInSupabase(p.id, placeConfirms, p.disputeCount, updatedPlaceStatus);
        }
        return { ...p, confirmCount: placeConfirms, status: updatedPlaceStatus };
      })
    );
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

    if (isSupabaseConfigured) {
      updateReportDisputeInSupabase(reportId, newDisputes, updatedReasons, newStatus);
    }

    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => {
        if (p.id !== targetReport.placeId) return p;
        const placeDisputes = p.disputeCount + 1;
        const updatedPlaceStatus = computeStatus(p.confirmCount, placeDisputes);
        if (updatedPlaceStatus !== p.status) {
          addNotificationIfSaved(p.id, p.name, p.status, updatedPlaceStatus);
        }
        if (isSupabaseConfigured) {
          updatePlaceStatusInSupabase(p.id, p.confirmCount, placeDisputes, updatedPlaceStatus);
        }
        return { ...p, disputeCount: placeDisputes, status: updatedPlaceStatus };
      })
    );
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const nextProfile = { ...prev, ...updates };
      if (isSupabaseConfigured && userId) {
        updateSupabaseProfile(userId, updates);
      }
      return nextProfile;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (isSupabaseConfigured && userId) {
      clearNotificationsInSupabase(userId);
    }
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isSupabaseConfigured && userId) {
      markNotificationsReadInSupabase(userId);
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string }): Promise<AuthActionResult> => {
    if (isSupabaseConfigured) {
      const res = await signInWithSupabase({ email, password });
      if (res.success && res.user) {
        setUserId(res.user.id);
        setAuthEmail(res.user.email);
        if (res.profile) setUserProfile(res.profile);

        const [fetchedPlaces, userNotifs] = await Promise.all([
          fetchPlacesFromSupabase(res.user.id),
          fetchNotificationsFromSupabase(res.user.id),
        ]);
        if (fetchedPlaces.length > 0) setPlaces(fetchedPlaces);
        if (userNotifs.length > 0) setNotifications(userNotifs);

        return { success: true };
      }
      return { success: false, message: res.message || 'Supabase authentication failed.' };
    }

    // Local Storage demo fallback when Supabase credentials are not set
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
    if (isSupabaseConfigured) {
      const res = await signUpWithSupabase({ name, email, password, avatar });
      if (res.success && res.user) {
        setUserId(res.user.id);
        setAuthEmail(res.user.email);
        if (res.profile) setUserProfile(res.profile);
        return { success: true };
      }
      return { success: false, message: res.message || 'Supabase account creation failed.' };
    }

    // Local Storage demo fallback
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
    if (isSupabaseConfigured) {
      await signOutWithSupabase();
    }
    setUserId(null);
    setAuthEmail(null);
    setUserProfile(INITIAL_USER_PROFILE);
    setNotifications(INITIAL_NOTIFICATIONS);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: !!authEmail,
        authReady,
        authEmail,
        userId,
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
