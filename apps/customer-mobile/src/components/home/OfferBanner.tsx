import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '../../theme';

const offerImage = require('../../../assets/images/home/offers/offer-01.png');

export default function OfferBanner() {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={offerImage}
        resizeMode="contain"
        style={styles.banner}
        imageStyle={styles.image}
      >
        <View style={styles.buttonArea}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Explore Now</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.screen,
    marginBottom: Theme.spacing.xxl,
  },
  banner: {
    width: '100%',
    aspectRatio: 1365 / 768,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: Theme.radius.banner,
  },
  image: {
    borderRadius: Theme.radius.banner,
  },
  buttonArea: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    minWidth: 155,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    elevation: 4,
  },
  buttonText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  arrow: {
    color: Theme.colors.white,
    fontSize: 21,
    fontWeight: '700',
    marginTop: -2,
  },
});
