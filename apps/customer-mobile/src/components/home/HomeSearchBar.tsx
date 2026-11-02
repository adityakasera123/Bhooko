import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Theme } from '../../theme';

export default function HomeSearchBar() {
  return (
    <View style={styles.container}>
      <View style={styles.searchIcon}>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search dishes, restaurants..."
        placeholderTextColor={Theme.colors.textSecondary}
        editable={false}
        accessibilityLabel="Search dishes and restaurants"
      />

      <View style={styles.divider} />

      <View style={styles.filterIcon}>
        <View style={styles.filterLine} />
        <View style={[styles.filterLine, styles.filterLineShort]} />
        <View style={[styles.filterLine, styles.filterLineMedium]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    marginHorizontal: Theme.spacing.screen,
    marginBottom: Theme.spacing.xxl,
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    gap: Theme.spacing.md,
  },
  searchIcon: {
    width: 20,
    height: 20,
    justifyContent: 'flex-start',
  },
  searchCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Theme.colors.textSecondary,
  },
  searchHandle: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: Theme.colors.textSecondary,
    transform: [{ rotate: '45deg' }],
    left: 11,
    top: 14,
    borderRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.size.sm,
    color: Theme.colors.text,
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 25,
    backgroundColor: Theme.colors.border,
  },
  filterIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    gap: 4,
  },
  filterLine: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: Theme.colors.primary,
  },
  filterLineShort: {
    width: 11,
  },
  filterLineMedium: {
    width: 15,
  },
});
