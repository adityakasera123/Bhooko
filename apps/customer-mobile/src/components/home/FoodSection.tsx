import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Theme } from '../../theme';

const foodItems = [1, 2, 3];

export default function FoodSection() {
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
        {foodItems.map((item) => (
          <View key={item} style={styles.card}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.details}>
              <View style={styles.titlePlaceholder} />
              <View style={styles.subtitlePlaceholder} />
              <View style={styles.bottomRow}>
                <View style={styles.pricePlaceholder} />
                <View style={styles.addPlaceholder} />
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
  headingPlaceholder: {
    width: 175,
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
  card: {
    width: 190,
    borderRadius: Theme.radius.card,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 115,
    backgroundColor: Theme.colors.border,
  },
  details: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  titlePlaceholder: {
    width: '85%',
    height: 13,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  subtitlePlaceholder: {
    width: '60%',
    height: 9,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  pricePlaceholder: {
    width: 48,
    height: 12,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  addPlaceholder: {
    width: 48,
    height: 27,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.disabled,
  },
});
