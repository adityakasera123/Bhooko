import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../theme';

const categories = [1, 2, 3, 4, 5, 6];

export default function CategorySection() {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>What are you craving?</Text>
        <View style={styles.seeAllPlaceholder} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {categories.map((item) => (
          <View key={item} style={styles.category}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.textPlaceholder} />
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
  seeAllPlaceholder: {
    width: 38,
    height: 10,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
  list: {
    paddingHorizontal: Theme.spacing.screen,
    gap: Theme.spacing.lg,
  },
  category: {
    width: 66,
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  imagePlaceholder: {
    width: 66,
    height: 66,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.border,
  },
  textPlaceholder: {
    width: 48,
    height: 9,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
  },
});
