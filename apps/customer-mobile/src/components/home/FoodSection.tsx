
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import type { HomeFoodItem } from '../../services/home/useHomeData';

type FoodSectionProps = {
  items: HomeFoodItem[];
};

function FoodCard({ item }: { item: HomeFoodItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageSource =
    item.imageUrl && !imageFailed
      ? { uri: item.imageUrl }
      : require('../../../assets/images/home/categories/briyani.png');

  const price = `₹${(item.priceInPaise / 100).toFixed(0)}`;

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />

        <View
          style={[
            styles.foodTypeBadge,
            item.foodType === 'VEG'
              ? styles.vegBadge
              : item.foodType === 'NON_VEG'
                ? styles.nonVegBadge
                : styles.eggBadge,
          ]}
        >
          <View
            style={[
              styles.foodTypeDot,
              item.foodType === 'VEG'
                ? styles.vegDot
                : item.foodType === 'NON_VEG'
                  ? styles.nonVegDot
                  : styles.eggDot,
            ]}
          />
          <Text style={styles.foodTypeText}>
            {item.foodType === 'NON_VEG' ? 'NON-VEG' : item.foodType}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.restaurant} numberOfLines={1}>
          {item.restaurantName}
        </Text>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{price}</Text>
          <View style={styles.addButton}>
            <Text style={styles.addText}>ADD</Text>
            <Text style={styles.plus}>+</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function FoodSection({ items }: FoodSectionProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingContent}>
          <Text style={styles.heading}>Explore dishes</Text>
          <Text style={styles.subtitle}>
            Discover dishes from restaurants near you
          </Text>
        </View>

        <Text style={styles.seeAll}>See all</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {items.map((item) => (
          <FoodCard key={item.id} item={item} />
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
  foodTypeBadge: {
    position: 'absolute',
    top: 11,
    left: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.white,
  },
  vegBadge: {
    borderColor: '#27834B',
    borderWidth: 1,
  },
  nonVegBadge: {
    borderColor: '#C74735',
    borderWidth: 1,
  },
  eggBadge: {
    borderColor: '#C18A25',
    borderWidth: 1,
  },
  foodTypeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  vegDot: {
    backgroundColor: '#27834B',
  },
  nonVegDot: {
    backgroundColor: '#C74735',
  },
  eggDot: {
    backgroundColor: '#C18A25',
  },
  foodTypeText: {
    color: Theme.colors.text,
    fontSize: 9,
    fontWeight: '800',
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
  restaurant: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
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
