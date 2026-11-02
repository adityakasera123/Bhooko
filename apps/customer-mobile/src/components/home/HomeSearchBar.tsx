
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Theme } from '../../theme';

export default function HomeSearchBar() {
  return (
    <View style={styles.container}>
      <View style={styles.searchIconPlaceholder} />

      <TextInput
        style={styles.input}
        placeholder="Search dishes, restaurants..."
        placeholderTextColor={Theme.colors.textSecondary}
        editable={false}
      />

      <View style={styles.filterPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    marginHorizontal: Theme.spacing.screen,
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
  },
  searchIconPlaceholder: {
    width: 19,
    height: 19,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.border,
    marginRight: Theme.spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.size.sm,
    color: Theme.colors.text,
    paddingVertical: 0,
  },
  filterPlaceholder: {
    width: 27,
    height: 27,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.border,
  },
});
