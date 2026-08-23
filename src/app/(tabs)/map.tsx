import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { InteractiveMap } from '@/components/InteractiveMap';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { Place, StatusType } from '@/types/accessibility';

type FilterType = 'all' | 'verified' | 'ramp' | 'stepFree' | 'toilet';

export default function MapScreen() {
  const router = useRouter();
  const { places, selectedPlaceId, setSelectedPlaceId, toggleSavePlace } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeModalPlace, setActiveModalPlace] = useState<Place | null>(null);

  // Filtered places calculation
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // Search text match
      const matchesSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter chip logic
      switch (activeFilter) {
        case 'verified':
          return place.status === 'verified';
        case 'ramp':
          return place.features.ramp;
        case 'stepFree':
          return place.features.stepFree;
        case 'toilet':
          return place.features.toilet;
        case 'all':
        default:
          return true;
      }
    });
  }, [places, searchQuery, activeFilter]);

  const handleSelectPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    setActiveModalPlace(place);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      {/* App Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="accessibility" size={24} color="#6366F1" />
          <View>
            <Text style={styles.appTitle}>InclusiveMapper</Text>
            <Text style={styles.appSubtitle}>Public Space Accessibility</Text>
          </View>
        </View>

        {/* View Mode Toggle Button */}
        <TouchableOpacity
          style={styles.viewToggleBtn}
          onPress={() => setViewMode((prev) => (prev === 'map' ? 'list' : 'map'))}
        >
          <Ionicons
            name={viewMode === 'map' ? 'list' : 'map-outline'}
            size={18}
            color="#FFF"
          />
          <Text style={styles.viewToggleText}>
            {viewMode === 'map' ? 'List View' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venue, transit, park..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips ScrollView */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[styles.filterChipText, activeFilter === 'all' && styles.filterTextActive]}
            >
              All Places ({places.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'verified' && styles.filterChipActive]}
            onPress={() => setActiveFilter('verified')}
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={activeFilter === 'verified' ? '#FFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'verified' && styles.filterTextActive,
              ]}
            >
              Verified Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ramp' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ramp')}
          >
            <MaterialCommunityIcons
              name="wheelchair"
              size={14}
              color={activeFilter === 'ramp' ? '#FFF' : '#818CF8'}
            />
            <Text
              style={[styles.filterChipText, activeFilter === 'ramp' && styles.filterTextActive]}
            >
              Wheelchair Ramp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'stepFree' && styles.filterChipActive]}
            onPress={() => setActiveFilter('stepFree')}
          >
            <MaterialCommunityIcons
              name="walk"
              size={14}
              color={activeFilter === 'stepFree' ? '#FFF' : '#818CF8'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'stepFree' && styles.filterTextActive,
              ]}
            >
              Step-free Entrance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'toilet' && styles.filterChipActive]}
            onPress={() => setActiveFilter('toilet')}
          >
            <MaterialCommunityIcons
              name="human-handsdown"
              size={14}
              color={activeFilter === 'toilet' ? '#FFF' : '#818CF8'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'toilet' && styles.filterTextActive,
              ]}
            >
              Accessible Toilet
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Map / List View Display */}
      {viewMode === 'map' ? (
        <ScrollView style={styles.scrollWrapper} showsVerticalScrollIndicator={false}>
          {/* Interactive Map Visual Widget */}
          <InteractiveMap
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handleSelectPlace}
          />

          {/* Quick Cards below Map */}
          <Text style={styles.sectionHeader}>DISCOVER PLACES ({filteredPlaces.length})</Text>
          {filteredPlaces.map((item) => {
            const statusColor = getStatusColor(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleSelectPlace(item)}
              >
                <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleSavePlace(item.id)}
                      style={styles.cardSaveBtn}
                    >
                      <Ionicons
                        name={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={item.saved ? '#6366F1' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {item.address}
                  </Text>

                  {/* Feature Badges Row */}
                  <View style={styles.featureRow}>
                    {item.features.ramp && (
                      <View style={styles.badgePill}>
                        <MaterialCommunityIcons name="wheelchair" size={12} color="#10B981" />
                        <Text style={styles.badgeText}>Ramp</Text>
                      </View>
                    )}
                    {item.features.elevator && (
                      <View style={styles.badgePill}>
                        <MaterialCommunityIcons name="elevator-passenger" size={12} color="#10B981" />
                        <Text style={styles.badgeText}>Elevator</Text>
                      </View>
                    )}
                    {item.features.toilet && (
                      <View style={styles.badgePill}>
                        <MaterialCommunityIcons name="human-handsdown" size={12} color="#10B981" />
                        <Text style={styles.badgeText}>Toilet</Text>
                      </View>
                    )}
                  </View>

                  {/* Status Footer */}
                  <View style={styles.cardFooter}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={styles.confirmsText}>
                      • {item.confirmCount} Confirms ({item.disputeCount} Disputes)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        /* List View */
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleSelectPlace(item)}
              >
                <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <TouchableOpacity onPress={() => toggleSavePlace(item.id)}>
                      <Ionicons
                        name={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={item.saved ? '#6366F1' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardAddress}>{item.address}</Text>
                  <View style={styles.featureRow}>
                    {item.features.ramp && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>Ramp</Text>
                      </View>
                    )}
                    {item.features.elevator && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>Elevator</Text>
                      </View>
                    )}
                    {item.features.toilet && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>Accessible Restroom</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={styles.confirmsText}>
                      {item.confirmCount} confirmations
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Place Details Modal Popup */}
      <PlaceDetailsModal
        place={activeModalPlace}
        visible={!!activeModalPlace}
        onClose={() => setActiveModalPlace(null)}
        onToggleSave={toggleSavePlace}
        onReportUpdate={() => {
          setActiveModalPlace(null);
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#312E81',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  viewToggleText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  filterScroll: {
    marginTop: 10,
    marginBottom: 4,
  },
  filterContainer: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  scrollWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardImage: {
    width: 100,
    height: '100%',
    minHeight: 110,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  cardSaveBtn: {
    padding: 2,
  },
  cardAddress: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmsText: {
    color: '#64748B',
    fontSize: 10,
  },
});
