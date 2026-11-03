import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import type { HomeCategory } from '../../services/home/useHomeData';

type CategorySectionProps = {
  categories: HomeCategory[];
};

const categoryImages: Record<string, any> = {
  biryani: require('../../../assets/images/home/categories/briyani.png'),
  pizza: require('../../../assets/images/home/categories/pizza.png'),
  burger: require('../../../assets/images/home/categories/burger.png'),
  chinese: require('../../../assets/images/home/categories/chinese.png'),
  dosa: require('../../../assets/images/home/categories/dosa.png'),
  snacks: require('../../../assets/images/home/categories/snacks.png'),
};

function CategoryCard({ category }: { category: HomeCategory }) {
  const image = categoryImages[category.name.trim().toLowerCase()];

  return (
    <View style={styles.category}>
      <View style={styles.imageContainer}>
        {image ? (
          <Image
            source={image}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>
              {category.name.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.categoryName} numberOfLines={1}>
        {category.name}
      </Text>
    </View>
  );
}

export default function CategorySection({
  categories,
}: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>What are you craving?</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
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
  heading: {
    fontSize: Theme.typography.size.lg,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  seeAll: {
    fontSize: Theme.typography.size.sm,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  list: {
    paddingHorizontal: Theme.spacing.screen,
    gap: Theme.spacing.lg,
  },
  category: {
    width: 76,
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  imageContainer: {
    width: 76,
    height: 76,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EEE5',
  },
  fallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  categoryName: {
    fontSize: Theme.typography.size.sm,
    fontWeight: '600',
    color: Theme.colors.text,
    textAlign: 'center',
  },
});
