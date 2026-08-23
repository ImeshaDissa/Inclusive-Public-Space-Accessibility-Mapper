import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, places, reports } = useApp();

  const verifiedCount = places.filter((p) => p.status === 'verified').length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const disputedCount = places.filter((p) => p.status === 'disputed').length;
  const totalConfirms = places.reduce((acc, p) => acc + p.confirmCount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* App Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.userInfoRow}>
          <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.greetingText}>Welcome back 👋</Text>
            <Text style={styles.userNameText}>{userProfile.name}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBadgeBtn}
          onPress={() => router.push('/profile' as any)}
        >
          <Ionicons name="ribbon-outline" size={16} color="#818CF8" />
          <Text style={styles.profileBadgeText}>Level 3 Auditor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Main Hero Card Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <Ionicons name="accessibility" size={12} color="#10B981" />
              <Text style={styles.heroTagText}>COMMUNITY ACCESSIBILITY PLATFORM</Text>
            </View>
            <Text style={styles.heroTitle}>Mapping Step-Free & Inclusive Public Spaces</Text>
            <Text style={styles.heroSubtitle}>
              Together we audit ramps, elevators, and accessible amenities so everyone can navigate freely.
            </Text>

            <TouchableOpacity
              style={styles.heroCTA}
              onPress={() => router.push('/map' as any)}
            >
              <Ionicons name="map" size={16} color="#FFF" />
              <Text style={styles.heroCTAText}>Explore Interactive Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Platform Overview Stats Grid */}
        <Text style={styles.sectionTitle}>PLATFORM IMPACT & STATS</Text>
        <View style={styles.statsGrid}>
          {/* Card 1: Verified Venues */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#064E3B' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{verifiedCount}</Text>
            <Text style={styles.statLabel}>Verified Places</Text>
          </View>

          {/* Card 2: Pending Audits */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#78350F' }]}>
              <Ionicons name="time" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Queue</Text>
          </View>

          {/* Card 3: Disputed Issues */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#7F1D1D' }]}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>{disputedCount}</Text>
            <Text style={styles.statLabel}>Disputed Venues</Text>
          </View>

          {/* Card 4: Total Confirmations */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#312E81' }]}>
              <Ionicons name="people" size={20} color="#818CF8" />
            </View>
            <Text style={styles.statNumber}>{totalConfirms}</Text>
            <Text style={styles.statLabel}>Total Confirms</Text>
          </View>
        </View>

        {/* Quick Action Shortcut Buttons */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/map' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#312E81' }]}>
              <Ionicons name="map-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.actionTitle}>Discover Map</Text>
            <Text style={styles.actionDesc}>Find step-free routes & color-coded pins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/report' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#064E3B' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Submit Audit</Text>
            <Text style={styles.actionDesc}>Log a venue ramp, elevator or restroom</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/verify' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#78350F' }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.actionTitle}>Verify Queue</Text>
            <Text style={styles.actionDesc}>Audit reports and vote to confirm or dispute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/profile' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#1E293B' }]}>
              <Ionicons name="bookmark-outline" size={24} color="#CBD5E1" />
            </View>
            <Text style={styles.actionTitle}>Saved & Preferences</Text>
            <Text style={styles.actionDesc}>Manage disability settings & saved places</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Community Activity Stream */}
        <Text style={styles.sectionTitle}>RECENT COMMUNITY AUDITS</Text>
        <View style={styles.activityList}>
          {reports.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityCard}
              onPress={() => router.push('/verify' as any)}
            >
              <Image source={{ uri: item.photos[0] }} style={styles.activityImage} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityPlace}>{item.placeName}</Text>
                <Text style={styles.activityNote} numberOfLines={2}>
                  "{item.note}"
                </Text>
                <View style={styles.activityMetaRow}>
                  <Text style={styles.activitySubmitter}>By {item.submitterName}</Text>
                  <Text style={styles.activityTime}>• {item.timestamp}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Tip Card */}
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Accessibility Pro-Tip</Text>
            <Text style={styles.tipText}>
              Ramp slopes should ideally not exceed 1:12 (8.3% grade) for safe manual wheelchair navigation. Always note automatic door status!
            </Text>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  greetingText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  userNameText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  profileBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  profileBadgeText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  heroContent: {},
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  heroTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  heroCTAText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  actionDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  activityList: {
    gap: 10,
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityPlace: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  activityNote: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  activityMetaRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  activitySubmitter: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '600',
  },
  activityTime: {
    color: '#64748B',
    fontSize: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#451A03',
    borderColor: '#78350F',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
  },
  tipTitle: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '800',
  },
  tipText: {
    color: '#FEF3C7',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
