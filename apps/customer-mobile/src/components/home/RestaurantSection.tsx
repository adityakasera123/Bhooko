import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Theme } from '../../theme';
import RestaurantCard from './RestaurantCard';

const restaurants = [1, 2, 3];

export default function RestaurantSection() {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingPlaceholder} />
        <View style={styles.linkPlaceholder} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {restaurants.map((item) => (
          <RestaurantCard key={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.xxl,
  },
  headingRow: {
    paddingHorizontal: Theme.spacing.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headingPlaceholder: {
    width: 165,
    height: 17,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  linkPlaceholder: {
    width: 45,
    height: 10,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  list: {
    paddingHorizontal: Theme.spacing.screen,
    gap: Theme.spacing.md,
  },
});
