
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  House,
  Search,
  ShoppingBag,
  UserRound,
} from 'lucide-react-native';

import { Theme } from '../../theme';
import type { HomeTab } from '../../screens/home/HomeScreen';

type BottomTabBarProps = {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
};

const tabs = [
  { key: 'home', label: 'Home', Icon: House },
  { key: 'search', label: 'Search', Icon: Search },
  { key: 'orders', label: 'Orders', Icon: ShoppingBag },
  { key: 'profile', label: 'Profile', Icon: UserRound },
] as const;

export default function BottomTabBar({
  activeTab,
  onTabChange,
}: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;

        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onTabChange(key)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && styles.activeIconContainer,
              ]}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                color={
                  isActive
                    ? Theme.colors.primary
                    : Theme.colors.textSecondary
                }
              />
            </View>

            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 54,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.pill,
  },
  activeIconContainer: {
    backgroundColor: '#FFF0E6',
  },
  label: {
    fontSize: Theme.typography.size.xs,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  activeLabel: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
});
