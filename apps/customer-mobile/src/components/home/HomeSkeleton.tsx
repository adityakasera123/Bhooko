import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Theme } from '../../theme';
import useHomeData from '../../services/home/useHomeData';

import HomeHeader from './HomeHeader';
import HomeSearchBar from './HomeSearchBar';

import CategorySection from './CategorySection';
import RestaurantSection from './RestaurantSection';
import FoodSection from './FoodSection';

import StreetFoodSection from './StreetFoodSection';

export default function HomeSkeleton() {
  const {
    restaurants,
    categories,
    foodItems,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  } = useHomeData();

  const hasData =
    restaurants.length > 0 ||
    categories.length > 0 ||
    foodItems.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Theme.colors.primary}
          />
        }
      >
        <HomeHeader />
        <HomeSearchBar />


        {loading && !hasData && (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              size="large"
              color={Theme.colors.primary}
            />
            <Text style={styles.stateText}>
              Finding delicious food for you...
            </Text>
          </View>
        )}

        {error && !hasData && !loading && (
          <View style={styles.stateContainer}>
            <Text style={styles.errorTitle}>
              Unable to load home
            </Text>
            <Text style={styles.stateText}>
              {error}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && !hasData && (
          <View style={styles.stateContainer}>
            <Text style={styles.errorTitle}>
              Nothing to show right now
            </Text>
            <Text style={styles.stateText}>
              Please check back in a little while.
            </Text>
          </View>
        )}

        {hasData && (
          <>
            <CategorySection categories={categories} />
            <RestaurantSection restaurants={restaurants} />
            <FoodSection items={foodItems} />

            <StreetFoodSection />
          </>
        )}
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
    flexGrow: 1,
  },
  stateContainer: {
    marginHorizontal: Theme.spacing.screen,
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxl,
    padding: Theme.spacing.xl,
    borderRadius: Theme.radius.card,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  stateText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  errorTitle: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.pill,
  },
  retryText: {
    color: Theme.colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
