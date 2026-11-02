import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';

const desserts = [
  {
    id: '1',
    name: 'Chocolate Lava Cake',
    description: 'Rich, warm & gooey',
    price: '₹149',
    rating: '4.8',
    tag: 'CHOCOLATE LOVE',
    image: require('../../../assets/images/home/desserts/dessert-01.jpg'),
  },
  {
    id: '2',
    name: 'Strawberry Cheesecake',
    description: 'Creamy with a fruity twist',
    price: '₹179',
    rating: '4.7',
    tag: 'FAN FAVOURITE',
    image: require('../../../assets/images/home/desserts/dessert-02.jpg'),
  },
  {
    id: '3',
    name: 'Brownie & Ice Cream',
    description: 'Warm brownie, cool delight',
    price: '₹159',
    rating: '4.9',
    tag: 'MUST TRY',
    image: require('../../../assets/images/home/desserts/dessert-03.jpg'),
  },
];

export default function SweetToothSection() {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingContent}>
          <Text style={styles.eyebrow}>A LITTLE HAPPINESS</Text>
          <Text style={styles.heading}>Sweet Tooth Corner</Text>
          <Text style={styles.subtitle}>
            Because every meal deserves a sweet ending
          </Text>
        </View>

        <View style={styles.heartCircle}>
          <Text style={styles.heart}>♡</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {desserts.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageContainer}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="cover"
              />

              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>

              <View style={styles.rating}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>

              <Text style={styles.description} numberOfLines={1}>
                {item.description}
              </Text>

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
    marginBottom: Theme.spacing.xxxl,
  },
  headingRow: {
    paddingHorizontal: Theme.spacing.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headingContent: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heading: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  heartCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCE9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  heart: {
    color: Theme.colors.primary,
    fontSize: 25,
    lineHeight: 29,
  },
  list: {
    paddingHorizontal: Theme.spacing.screen,
    gap: Theme.spacing.md,
    paddingBottom: 6,
  },
  card: {
    width: 225,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  imageContainer: {
    height: 155,
    backgroundColor: '#F7EAE0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tag: {
    position: 'absolute',
    top: 11,
    left: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.white,
  },
  tagText: {
    color: Theme.colors.brown,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rating: {
    position: 'absolute',
    right: 11,
    bottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Theme.radius.pill,
  },
  star: {
    color: '#E5A323',
    fontSize: 11,
  },
  ratingText: {
    color: Theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  details: {
    padding: 13,
    gap: 7,
  },
  name: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  description: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  price: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  addButton: {
    minWidth: 65,
    height: 31,
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
