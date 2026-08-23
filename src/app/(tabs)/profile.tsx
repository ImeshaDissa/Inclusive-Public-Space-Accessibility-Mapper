import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { Place, StatusType } from '@/types/accessibility';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    userProfile,
    updateUserProfile,
    places,
    toggleSavePlace,
    notifications,
    clearNotifications,
    signOut,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'saved' | 'notifications'>('profile');
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<Place | null>(null);

  const savedPlaces = places.filter((p) => p.saved);

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return '#10B981';
      case 'disputed':
        return '#EF4444';
      case 'pending':
      default:
        return '#F59E0B';
    }
  };

  const togglePreference = (key: keyof typeof userProfile.preferences) => {
    updateUserProfile({
      preferences: {
        ...userProfile.preferences,
        [key]: !userProfile.preferences[key],
      },
    });
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="ribbon" size={12} color="#818CF8" />
              <Text style={styles.roleBadgeText}>Community Auditor · Level 3</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutHeaderBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutHeaderText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Navigation Segment Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'profile' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person"
            size={14}
            color={activeTab === 'profile' ? '#FFF' : '#94A3B8'}
          />
          <Text style={[styles.segmentText, activeTab === 'profile' && styles.segmentTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'saved' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Ionicons
            name="bookmark"
            size={14}
            color={activeTab === 'saved' ? '#FFF' : '#94A3B8'}
          />
          <Text style={[styles.segmentText, activeTab === 'saved' && styles.segmentTextActive]}>
            Saved ({savedPlaces.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'notifications' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons
            name="notifications"
            size={14}
            color={activeTab === 'notifications' ? '#FFF' : '#94A3B8'}
          />
          <Text
            style={[styles.segmentText, activeTab === 'notifications' && styles.segmentTextActive]}
          >
            Alerts ({notifications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Tab 1: Profile & Preferences */}
        {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            {/* Disability Toggle Section */}
            <View style={styles.cardSection}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <View style={styles.iconTitleRow}>
                    <Ionicons name="accessibility" size={18} color="#6366F1" />
                    <Text style={styles.cardSectionTitle}>Disability Status</Text>
                  </View>
                  <Text style={styles.cardSubtext}>
                    Enables tailored step-free & accessible navigation alerts
                  </Text>
                </View>
                <Switch
                  value={userProfile.hasDisability}
                  onValueChange={(val) => updateUserProfile({ hasDisability: val })}
                  trackColor={{ false: '#334155', true: '#4F46E5' }}
                  thumbColor={userProfile.hasDisability ? '#818CF8' : '#94A3B8'}
                />
              </View>

              {userProfile.hasDisability && (
                <View style={styles.disabilityTypeBox}>
                  <Text style={styles.disabilityTypeLabel}>Disability Type / Mobility Note:</Text>
                  <Text style={styles.disabilityTypeValue}>{userProfile.disabilityType}</Text>
                </View>
              )}
            </View>

            {/* Accessibility Preferences Checklist */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeader}>ACCESSIBILITY PREFERENCES</Text>
              <View style={styles.prefList}>
                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="wheelchair" size={18} color="#10B981" />
                    <Text style={styles.prefText}>Require Wheelchair Ramp</Text>
                  </View>
                  <Switch
                    value={userProfile.preferences.requireRamp}
                    onValueChange={() => togglePreference('requireRamp')}
                    trackColor={{ false: '#334155', true: '#059669' }}
                  />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="elevator-passenger" size={18} color="#10B981" />
                    <Text style={styles.prefText}>Require Elevator Access</Text>
                  </View>
                  <Switch
                    value={userProfile.preferences.requireElevator}
                    onValueChange={() => togglePreference('requireElevator')}
                    trackColor={{ false: '#334155', true: '#059669' }}
                  />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="human-handsdown" size={18} color="#10B981" />
                    <Text style={styles.prefText}>Require Accessible Restroom</Text>
                  </View>
                  <Switch
                    value={userProfile.preferences.requireAccessibleToilet}
                    onValueChange={() => togglePreference('requireAccessibleToilet')}
                    trackColor={{ false: '#334155', true: '#059669' }}
                  />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="walk" size={18} color="#10B981" />
                    <Text style={styles.prefText}>Require Step-Free Entrance</Text>
                  </View>
                  <Switch
                    value={userProfile.preferences.requireStepFree}
                    onValueChange={() => togglePreference('requireStepFree')}
                    trackColor={{ false: '#334155', true: '#059669' }}
                  />
                </View>
              </View>
            </View>

            {/* Bottom Sign Out Card */}
            <TouchableOpacity style={styles.bottomSignOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.bottomSignOutText}>Sign Out of Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2: Saved Places */}
        {activeTab === 'saved' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>SAVED PLACES ({savedPlaces.length})</Text>

            {savedPlaces.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bookmark-outline" size={36} color="#475569" />
                <Text style={styles.emptyTitle}>No Saved Places Yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the Save button on any place card on the Map screen to save locations here.
                </Text>
              </View>
            ) : (
              savedPlaces.map((place) => {
                const statusColor = getStatusColor(place.status);
                return (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.savedCard}
                    onPress={() => setSelectedPlaceModal(place)}
                  >
                    <Image source={{ uri: place.photos[0] }} style={styles.savedImage} />
                    <View style={styles.savedCardInfo}>
                      <Text style={styles.savedName}>{place.name}</Text>
                      <Text style={styles.savedAddress}>{place.address}</Text>

                      <View style={styles.savedStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusTagText, { color: statusColor }]}>
                          {place.status.toUpperCase()}
                        </Text>
                        <Text style={styles.savedConfirms}>
                          ({place.confirmCount} confirms · {place.disputeCount} disputes)
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeSavedBtn}
                      onPress={() => toggleSavePlace(place.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Tab 3: Notifications / Alerts */}
        {activeTab === 'notifications' && (
          <View style={styles.tabContent}>
            <View style={styles.notifHeaderRow}>
              <Text style={styles.sectionHeader}>IN-APP STATUS NOTIFICATIONS</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={clearNotifications}>
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={36} color="#475569" />
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtext}>
                  You'll see alerts here when verification status updates for places in your saved list.
                </Text>
              </View>
            ) : (
              notifications.map((notif) => {
                const isVerified = notif.newStatus === 'verified';
                const isDisputed = notif.newStatus === 'disputed';
                const iconColor = isVerified ? '#10B981' : isDisputed ? '#EF4444' : '#F59E0B';

                return (
                  <View key={notif.id} style={styles.notifCard}>
                    <View style={[styles.notifIconBox, { backgroundColor: iconColor + '22' }]}>
                      <Ionicons
                        name={isVerified ? 'checkmark-circle' : isDisputed ? 'alert-circle' : 'time'}
                        size={20}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.notifTextContainer}>
                      <Text style={styles.notifMessage}>{notif.message}</Text>
                      <Text style={styles.notifTimestamp}>{notif.timestamp}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Place Details Modal for Saved Place Inspection */}
      <PlaceDetailsModal
        place={selectedPlaceModal}
        visible={!!selectedPlaceModal}
        onClose={() => setSelectedPlaceModal(null)}
        onToggleSave={toggleSavePlace}
        onReportUpdate={() => {
          setSelectedPlaceModal(null);
          router.push('/report' as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#312E81',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '700',
  },
  signOutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#450A0A',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signOutHeaderText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  segmentBtnActive: {
    backgroundColor: '#4F46E5',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFF',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  tabContent: {
    gap: 14,
  },
  cardSection: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  disabilityTypeBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  disabilityTypeLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  disabilityTypeValue: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  prefList: {
    gap: 8,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prefText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
  },
  bottomSignOutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  savedImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  savedCardInfo: {
    flex: 1,
  },
  savedName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  savedAddress: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  savedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  savedConfirms: {
    color: '#64748B',
    fontSize: 10,
  },
  removeSavedBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextContainer: {
    flex: 1,
  },
  notifMessage: {
    color: '#F8FAFC',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  notifTimestamp: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
});
