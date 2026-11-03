import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../theme';
import { MapPin, ChevronDown } from 'lucide-react-native';

export default function HomeHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.locationSection}>
      <MapPin
  size={26}
  color={Theme.colors.primary}
  strokeWidth={2.2}
/>

        <View style={styles.locationText}>
          <View style={styles.cityRow}>
            <Text style={styles.city}>Jaunpur</Text>
            <ChevronDown
  size={19}
  color={Theme.colors.primary}
  strokeWidth={2.8}
/>
          </View>

          <Text style={styles.address}>Uttar Pradesh, India</Text>
        </View>
      </View>

      <View style={styles.profile}>
        <Text style={styles.profileInitial}>A</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.screen,
    paddingTop: 20,
    paddingBottom: 20,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Theme.colors.white,
  },
  locationText: {
    marginLeft: 12,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  city: {
    color: Theme.colors.text,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  chevron: {
    width: 10,
    height: 10,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: Theme.colors.primary,
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
  },
  address: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  profile: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  profileInitial: {
    color: Theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
});
