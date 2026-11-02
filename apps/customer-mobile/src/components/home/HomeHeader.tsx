
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../theme';

export default function HomeHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.locationContainer}>
        <View style={styles.locationIcon} />

        <View style={styles.locationText}>
          <Text style={styles.label}>DELIVERING TO</Text>
          <View style={styles.locationRow}>
            <Text style={styles.location}>Your Location</Text>
            <View style={styles.arrowPlaceholder} />
          </View>
          <Text style={styles.address}>Add your delivery address</Text>
        </View>
      </View>

      <View style={styles.profilePlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.screen,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.border,
    marginRight: Theme.spacing.md,
  },
  locationText: {
    flex: 1,
  },
  label: {
    fontSize: Theme.typography.size.xs,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  location: {
    fontSize: Theme.typography.size.lg,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  arrowPlaceholder: {
    width: 7,
    height: 7,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Theme.colors.text,
    transform: [{ rotate: '45deg' }],
    marginLeft: 8,
    marginTop: -4,
  },
  address: {
    fontSize: Theme.typography.size.xs,
    color: Theme.colors.textSecondary,
    marginTop: 3,
  },
  profilePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
    marginLeft: Theme.spacing.md,
  },
});
