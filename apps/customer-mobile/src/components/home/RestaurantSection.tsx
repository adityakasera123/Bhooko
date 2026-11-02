import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import RestaurantCard from './RestaurantCard';

const restaurants = [
  {
    id: '1',
    name: 'Royal Indian Thali',
    cuisine: 'Veg • North Indian',
    rating: '4.5',
    deliveryTime: '25-30 min',
    deliveryFee: 'Free delivery',
    offer: '50% OFF',
    image: require('../../../assets/images/home/restaurants/restaurant-01.jpg'),
  },
  {
    id: '2',
    name: 'The Non-Veg Corner',
    cuisine: 'Non-Veg • Chiken ',
    rating: '4.3',
    deliveryTime: '20-25 min',
    deliveryFee: 'Free delivery',
    offer: '40% OFF',
    image: require('../../../assets/images/home/restaurants/restaurant-02.jpg'),
  },
  {
    id: '3',
    name: 'Chinese Wok',
    cuisine: 'Chinese • Asian',
    rating: '4.4',
    deliveryTime: '30-35 min',
    deliveryFee: 'Free delivery',
    offer: '30% OFF',
    image: require('../../../assets/images/home/restaurants/restaurant-03.jpg'),
  },
];

export default function RestaurantSection() {
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
            image={restaurant.image}
            name={restaurant.name}
            cuisine={restaurant.cuisine}
            rating={restaurant.rating}
            deliveryTime={restaurant.deliveryTime}
            deliveryFee={restaurant.deliveryFee}
            offer={restaurant.offer}
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
});
