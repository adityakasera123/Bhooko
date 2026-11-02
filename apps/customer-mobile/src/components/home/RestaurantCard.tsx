import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';

type RestaurantCardProps = {
  image: any;
  name: string;
  cuisine: string;
  rating: string;
  deliveryTime: string;
  deliveryFee: string;
  offer: string;
};

export default function RestaurantCard({
  image,
  name,
  cuisine,
  rating,
  deliveryTime,
  deliveryFee,
  offer,
}: RestaurantCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={image}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.offerBadge}>
          <Text style={styles.offerText}>{offer}</Text>
        </View>

        <View style={styles.ratingBadge}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <Text style={styles.cuisine} numberOfLines={1}>
          {cuisine}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>◷</Text>
            <Text style={styles.metaText}>{deliveryTime}</Text>
          </View>

          <View style={styles.metaDot} />

          <Text style={styles.metaText}>{deliveryFee}</Text>
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
  offerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primary,
  },
  offerText: {
    color: Theme.colors.white,
    fontSize: 11,
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
  cuisine: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    color: Theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  metaText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Theme.colors.textSecondary,
  },
});
