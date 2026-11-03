
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import type { Restaurant } from '../../services/api/restaurantsApi';

type RestaurantCardProps = {
  restaurant: Restaurant;
};

export default function RestaurantCard({
  restaurant,
}: RestaurantCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const fallbackImage = require('../../../assets/images/home/restaurants/restaurant-01.jpg');

  const imageSource =
    restaurant.imageUrl && !imageFailed
      ? { uri: restaurant.imageUrl }
      : fallbackImage;

  const location = [
    restaurant.area,
    restaurant.city,
  ].filter(Boolean).join(', ');

  const isOpen = restaurant.status === 'OPEN';

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />

        <View
          style={[
            styles.statusBadge,
            !isOpen && styles.pausedBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {isOpen ? 'OPEN' : 'PAUSED'}
          </Text>
        </View>

        {restaurant.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>
              {restaurant.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>

        <Text style={styles.location} numberOfLines={1}>
          {location || restaurant.addressLine1}
        </Text>

        <Text style={styles.reviewText}>
          {restaurant.reviewCount > 0
            ? `${restaurant.reviewCount} reviews`
            : 'New restaurant'}
        </Text>
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
    ...Theme.shadows.card,
  },
  imageContainer: {
    height: 145,
    position: 'relative',
    backgroundColor: Theme.colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#287A4B',
  },
  pausedBadge: {
    backgroundColor: '#777777',
  },
  statusText: {
    color: Theme.colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Theme.radius.pill,
  },
  ratingStar: {
    color: '#E5A323',
    fontSize: 12,
  },
  ratingText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  name: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  location: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  reviewText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
