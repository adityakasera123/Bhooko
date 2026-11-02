import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';

const foodItems = [
  {
    id: '1',
    name: 'Chicken Biryani',
    restaurant: 'Royal Biryani House',
    price: '₹199',
    rating: '4.8',
    badge: 'BESTSELLER',
    image: require('../../../assets/images/home/categories/briyani.png'),
  },
  {
    id: '2',
    name: 'Margherita Pizza',
    restaurant: 'The Pizza Corner',
    price: '₹179',
    rating: '4.6',
    badge: 'POPULAR',
    image: require('../../../assets/images/home/categories/pizza.png'),
  },
  {
    id: '3',
    name: 'Crispy Burger',
    restaurant: 'Burger House',
    price: '₹129',
    rating: '4.5',
    badge: 'MUST TRY',
    image: require('../../../assets/images/home/categories/burger.png'),
  },
];

export default function FoodSection() {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingContent}>
          <Text style={styles.heading}>Popular dishes</Text>
          <Text style={styles.subtitle}>
            Tasty picks you shouldn't miss
          </Text>
        </View>

        <Text style={styles.seeAll}>See all</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {foodItems.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageContainer}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="contain"
              />

              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>

              <View style={styles.restaurantRow}>
                <Text style={styles.restaurant} numberOfLines={1}>
                  {item.restaurant}
                </Text>

                <View style={styles.rating}>
                  <Text style={styles.star}>★</Text>
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.bottomRow}>
                <Text style={styles.price}>{item.price}</Text>

                <View style={styles.addButton}>
                  <Text style={styles.addText}>ADD</Text>
                  <Text style={styles.plus}>+</Text>
                </View>
              </View>
            </View>
          </View>
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
    paddingBottom: 6,
  },
  card: {
    width: 205,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  imageContainer: {
    height: 145,
    backgroundColor: '#F8EEE5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 11,
    left: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.primary,
  },
  badgeText: {
    color: Theme.colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  details: {
    padding: 13,
    gap: 10,
  },
  name: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  restaurant: {
    flex: 1,
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF5E7',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Theme.radius.pill,
  },
  star: {
    color: '#E5A323',
    fontSize: 10,
  },
  ratingText: {
    color: Theme.colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  addButton: {
    minWidth: 65,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Theme.colors.white,
  },
  addText: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  plus: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
