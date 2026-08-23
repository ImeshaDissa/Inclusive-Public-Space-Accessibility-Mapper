import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Place, Report, AppNotification, UserProfile, StatusType } from '@/types/accessibility';
import { MOCK_PLACES, MOCK_REPORTS, INITIAL_USER_PROFILE, INITIAL_NOTIFICATIONS } from '@/constants/mockData';

interface AppContextType {
  isAuthenticated: boolean;
  signIn: (email?: string, password?: string) => void;
  signUp: (name: string, email: string, password?: string, hasDisability?: boolean) => void;
  signOut: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const signIn = (email?: string) => {
    setIsAuthenticated(true);
    if (email) {
      setUserProfile((prev) => ({
        ...prev,
        email: email,
        name: email.split('@')[0].replace('.', ' ') || 'Community Mapper',
      }));
    }
  };

  const signUp = (name: string, email: string, _password?: string, hasDisability: boolean = false) => {
    setIsAuthenticated(true);
    setUserProfile((prev) => ({
      ...prev,
      name: name || 'Alex Morgan',
      email: email || 'alex@accessibility.org',
      hasDisability,
    }));
  };

  const signOut = () => {
    setIsAuthenticated(false);
  };

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
  };

  const confirmReport = (reportId: string) => {
    setReports((prevReports) =>
      prevReports.map((r) => {
        if (r.id !== reportId) return r;
        const newConfirm = r.confirmCount + 1;
        const newStatus = computeStatus(newConfirm, r.disputeCount);

        setPlaces((prevPlaces) =>
          prevPlaces.map((p) => {
            if (p.id !== r.placeId) return p;
            const placeConfirms = p.confirmCount + 1;
            const updatedPlaceStatus = computeStatus(placeConfirms, p.disputeCount);
            if (updatedPlaceStatus !== p.status) {
              addNotificationIfSaved(p.id, p.name, p.status, updatedPlaceStatus);
            }
            return {
              ...p,
              confirmCount: placeConfirms,
              status: updatedPlaceStatus,
            };
          })
        );

        return {
          ...r,
          confirmCount: newConfirm,
          status: newStatus,
        };
      })
    );
  };

  const disputeReport = (reportId: string, reason: string, note?: string) => {
    setReports((prevReports) =>
      prevReports.map((r) => {
        if (r.id !== reportId) return r;
        const newDisputes = r.disputeCount + 1;
        const newStatus = computeStatus(r.confirmCount, newDisputes);
        const updatedReasons = [...(r.disputeReasons || []), reason];

        setPlaces((prevPlaces) =>
          prevPlaces.map((p) => {
            if (p.id !== r.placeId) return p;
            const placeDisputes = p.disputeCount + 1;
            const updatedPlaceStatus = computeStatus(p.confirmCount, placeDisputes);
            if (updatedPlaceStatus !== p.status) {
              addNotificationIfSaved(p.id, p.name, p.status, updatedPlaceStatus);
            }
            return {
              ...p,
              disputeCount: placeDisputes,
              status: updatedPlaceStatus,
            };
          })
        );

        return {
          ...r,
          disputeCount: newDisputes,
          disputeReasons: updatedReasons,
          status: newStatus,
        };
      })
    );
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

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
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
