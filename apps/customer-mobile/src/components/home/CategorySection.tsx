import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';

const categories = [
  {
    id: 'biryani',
    name: 'Biryani',
    image: require('../../../assets/images/home/categories/briyani.png'),
  },
  {
    id: 'pizza',
    name: 'Pizza',
    image: require('../../../assets/images/home/categories/pizza.png'),
  },
  {
    id: 'burger',
    name: 'Burger',
    image: require('../../../assets/images/home/categories/burger.png'),
  },
  {
    id: 'chinese',
    name: 'Chinese',
    image: require('../../../assets/images/home/categories/chinese.png'),
  },
  {
    id: 'dosa',
    name: 'Dosa',
    image: require('../../../assets/images/home/categories/dosa.png'),
  },
  {
    id: 'snacks',
    name: 'Snacks',
    image: require('../../../assets/images/home/categories/snacks.png'),
  },
];

export default function CategorySection() {
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
          <View key={category.id} style={styles.category}>
            <View style={styles.imageContainer}>
              <Image
                source={category.image}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.categoryName} numberOfLines={1}>
              {category.name}
            </Text>
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
  categoryName: {
    fontSize: Theme.typography.size.sm,
    fontWeight: '600',
    color: Theme.colors.text,
    textAlign: 'center',
  },
});
