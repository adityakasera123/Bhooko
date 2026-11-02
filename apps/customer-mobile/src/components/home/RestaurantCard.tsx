import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme } from '../../theme';

export default function RestaurantCard() {
  return (
    <View style={styles.container}>
      <View style={styles.imagePlaceholder}>
        <View style={styles.offerPlaceholder} />
      </View>
      <View style={styles.details}>
        <View style={styles.titlePlaceholder} />
        <View style={styles.subtitlePlaceholder} />
        <View style={styles.metaRow}>
          <View style={styles.metaPlaceholder} />
          <View style={styles.metaPlaceholder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  imagePlaceholder: {
    height: 145,
    backgroundColor: Theme.colors.border,
    padding: Theme.spacing.md,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  offerPlaceholder: {
    width: 75,
    height: 20,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.disabled,
  },
  details: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  titlePlaceholder: {
    width: '75%',
    height: 14,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  subtitlePlaceholder: {
    width: '55%',
    height: 9,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Theme.spacing.lg,
    marginTop: Theme.spacing.xs,
  },
  metaPlaceholder: {
    width: 65,
    height: 10,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
});
