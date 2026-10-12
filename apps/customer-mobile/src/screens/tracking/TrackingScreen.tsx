import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import TrackingMap, {
  type TrackingCoordinate,
} from '../../components/maps/TrackingMap';

export default function TrackingScreen() {
  const [destination] = useState<TrackingCoordinate | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>BHOOKO DELIVERY</Text>
        <Text style={styles.title}>Track your order</Text>
        <Text style={styles.subtitle}>
          Follow your delivery once rider tracking becomes available.
        </Text>

        {destination ? (
          <TrackingMap destination={destination} riderLocation={null} />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>⌖</Text>
            <Text style={styles.mapTitle}>Your map will appear here</Text>
            <Text style={styles.mapDescription}>
              Delivery location will load from your order details.
            </Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Live tracking</Text>
              <Text style={styles.statusDescription}>
                Waiting for an active delivery
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Pending</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery partner</Text>
            <Text style={styles.infoValue}>Not assigned yet</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated arrival</Text>
            <Text style={styles.infoValue}>Not available</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Tracking information will appear when an order has an assigned rider.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F2',
  },
  container: {
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    marginTop: 8,
    color: '#F15A24',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#211B18',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#70645E',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  mapPlaceholder: {
    height: 300,
    borderRadius: 18,
    backgroundColor: '#F0E8E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mapIcon: {
    color: '#F15A24',
    fontSize: 42,
    marginBottom: 8,
  },
  mapTitle: {
    color: '#211B18',
    fontSize: 17,
    fontWeight: '700',
  },
  mapDescription: {
    marginTop: 8,
    color: '#70645E',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E3DA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D99A36',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#211B18',
    fontSize: 15,
    fontWeight: '700',
  },
  statusDescription: {
    color: '#70645E',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#FFF0D7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#875C12',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E3DA',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  infoLabel: {
    color: '#70645E',
    fontSize: 13,
  },
  infoValue: {
    color: '#211B18',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  note: {
    color: '#8A7D75',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
});
