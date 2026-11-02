import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Theme } from '../../theme';

import HomeHeader from './HomeHeader';
import HomeSearchBar from './HomeSearchBar';
import OfferBanner from './OfferBanner';
import CategorySection from './CategorySection';
import RestaurantSection from './RestaurantSection';
import FoodSection from './FoodSection';
import SweetToothSection from './SweetToothSection';

export default function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HomeHeader />
        <HomeSearchBar />
        <OfferBanner />
        <CategorySection />
        <RestaurantSection />
        <FoodSection />
        <SweetToothSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxxl,
  },
});
