
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme } from '../../theme';

export default function OfferBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.smallLine} />
          <View style={styles.headingLine} />
          <View style={styles.descriptionLine} />
          <View style={styles.buttonPlaceholder} />
        </View>

        <View style={styles.imagePlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.screen,
    marginBottom: Theme.spacing.xxl,
  },
  banner: {
    minHeight: 150,
    borderRadius: Theme.radius.banner,
    backgroundColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    gap: Theme.spacing.sm,
  },
  smallLine: {
    height: 9,
    width: '38%',
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.disabled,
  },
  headingLine: {
    height: 18,
    width: '90%',
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.disabled,
  },
  descriptionLine: {
    height: 10,
    width: '70%',
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.disabled,
  },
  buttonPlaceholder: {
    width: 82,
    height: 29,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.disabled,
    marginTop: Theme.spacing.xs,
  },
  imagePlaceholder: {
    width: 105,
    height: 105,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.disabled,
    marginLeft: Theme.spacing.sm,
  },
});
