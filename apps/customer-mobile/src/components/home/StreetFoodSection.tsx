import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Theme } from '../../theme';

const StreetFoodSection = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        {/* Heading */}
        <View style={styles.headingRow}>
          <View style={styles.headingContent}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>THE DESI FOOD SCENE</Text>
              <View style={styles.eyebrowLine} />
            </View>

            <Text style={styles.heading}>
              STREET FOOD
            </Text>

            <Text style={styles.headingAccent}>
              MASTI!
              <Text style={styles.burst}> ✦</Text>
            </Text>
          </View>

          <View style={styles.stamp}>
            <Text style={styles.stampEmoji}>🔥</Text>
            <Text style={styles.stampText}>DESI</Text>
            <Text style={styles.stampText}>CRAVINGS</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Galiyon wala swaad! Ek bite aur mood set!
        </Text>

        {/* Pani Puri Hero */}
        <View style={styles.heroCard}>
          <Image
            source={require('../../../assets/images/home/street-food/street-01.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.heroOverlay}>
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>
                STREET FOOD FAVOURITE
              </Text>
            </View>

            <View>
              <Text style={styles.heroTitle}>PANI PURI</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.heroDescription}>
                Khatti, meethi, teekhi — full-on chatpata!
              </Text>
            </View>
          </View>
        </View>

        {/* Supporting Cards */}
        <View style={styles.supportingRow}>
          <View style={styles.foodCard}>
            <Image
              source={require('../../../assets/images/home/street-food/street-02.jpg')}
              style={styles.foodImage}
              resizeMode="cover"
            />

            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>Butter Pav Bhaji</Text>
              <Text style={styles.foodCaption}>
                Mumbai ka classic ❤️
              </Text>
            </View>
          </View>

          <View style={styles.foodCard}>
            <Image
              source={require('../../../assets/images/home/street-food/street-03.jpg')}
              style={styles.foodImage}
              resizeMode="cover"
            />

            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>Samosa Chaat</Text>
              <Text style={styles.foodCaption}>
                Full desi delight ✨
              </Text>
            </View>
          </View>
        </View>

        {/* Brand Closing */}
        <View style={styles.closing}>
          <View style={styles.closingDivider}>
            <View style={styles.closingLine} />
            <Text style={styles.closingIcon}>🍴</Text>
            <View style={styles.closingLine} />
          </View>

          <Text style={styles.brand}>
            BHOOKO<Text style={styles.brandDot}>.</Text>
          </Text>

          <Text style={styles.brandTagline}>
            Good food. Great mood.
          </Text>

          <View style={styles.madeWithBadge}>
            <Text style={styles.madeWith}>MADE WITH </Text>
            <Text style={styles.heart}>♥</Text>
            <Text style={styles.madeWith}> FOR FOOD LOVERS</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Theme.spacing.screen,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xl,
  },

  container: {
    backgroundColor: '#281711',
    borderRadius: 30,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#563323',
  },

  /* Heading */
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headingContent: {
    flex: 1,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  eyebrow: {
    color: '#FF914D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  eyebrowLine: {
    width: 55,
    height: 1.5,
    backgroundColor: '#A85A30',
  },

  heading: {
    color: '#FFF8F2',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  headingAccent: {
    color: '#FF741F',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  burst: {
    color: '#FF741F',
    fontSize: 19,
  },

  stamp: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: '#E66B23',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    transform: [{ rotate: '8deg' }],
  },

  stampEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },

  stampText: {
    color: '#F8D4BD',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  subtitle: {
    color: '#E0BDA9',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 15,
    marginBottom: 19,
  },

  /* Hero */
  heroCard: {
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#49352B',
    borderWidth: 1.5,
    borderColor: '#E96B1F',
    elevation: 5,
    shadowColor: '#FF741F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'rgba(20, 8, 3, 0.25)',
  },

  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF751D',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 30,
  },

  heroTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  titleUnderline: {
    width: 115,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#FF741F',
    marginTop: 3,
    marginBottom: 8,
  },

  heroDescription: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Food cards */
  supportingRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },

  foodCard: {
    flex: 1,
    backgroundColor: '#38231B',
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A9552C',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
  },

  foodImage: {
    width: '100%',
    height: 125,
  },

  foodInfo: {
    paddingHorizontal: 11,
    paddingVertical: 12,
  },

  foodName: {
    color: '#FFF8F2',
    fontSize: 12,
    fontWeight: '900',
  },

  foodCaption: {
    color: '#D9B7A3',
    fontSize: 10,
    marginTop: 7,
  },

  /* Closing */
  closing: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },

  closingDivider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    marginBottom: 22,
  },

  closingLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#B65E2E',
  },

  closingIcon: {
    fontSize: 23,
  },

  brand: {
    color: '#FFF8F2',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
  },

  brandDot: {
    color: '#FF741F',
  },

  brandTagline: {
    color: '#F2B18C',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },

  madeWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E66B23',
    borderRadius: 35,
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginTop: 20,
  },

  madeWith: {
    color: '#F0D0BD',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  heart: {
    color: '#FF342D',
    fontSize: 16,
  },
});

export default StreetFoodSection;
