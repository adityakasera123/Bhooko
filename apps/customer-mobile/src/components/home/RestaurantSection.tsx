import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import type { Restaurant } from '../../services/api/restaurantsApi';
import RestaurantCard from './RestaurantCard';

type RestaurantSectionProps = {
  restaurants: Restaurant[];
};

export default function RestaurantSection({
  restaurants,
}: RestaurantSectionProps) {
  if (restaurants.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headingRow}>
          <View style={styles.headingContent}>
            <Text style={styles.heading}>Restaurants near you</Text>
            <Text style={styles.subtitle}>
              Discover great food around you
            </Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No restaurants available
          </Text>
          <Text style={styles.emptySubtitle}>
            Please check again later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingContent}>
          <Text style={styles.heading}>Restaurants near you</Text>
          <Text style={styles.subtitle}>
            Discover great food around you
          </Text>
        </View>

        <Text style={styles.seeAll}>See all</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
          />
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
  headingContent: {
    gap: 4,
  },
  heading: {
    fontSize: Theme.typography.size.lg,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: Theme.typography.size.xs,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: Theme.typography.size.sm,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  list: {
    paddingHorizontal: Theme.spacing.screen,
    gap: Theme.spacing.md,
    paddingBottom: 5,
  },
  emptyContainer: {
    marginHorizontal: Theme.spacing.screen,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.card,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 5,
  },
  emptyTitle: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
});
