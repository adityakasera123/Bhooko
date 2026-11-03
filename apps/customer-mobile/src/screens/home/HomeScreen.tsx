
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import HomeSkeleton from '../../components/home/HomeSkeleton';
import { Theme } from '../../theme';

export type HomeTab = 'home' | 'search' | 'orders' | 'profile';

type HomeScreenProps = {
  activeTab: HomeTab;
  customerName?: string;
  onLogout?: () => void;
  onOpenDevPanel?: () => void;
};

const tabContent: Record<
  Exclude<HomeTab, 'home' | 'profile'>,
  { title: string; description: string; symbol: string }
> = {
  search: {
    title: 'Find your favourites',
    description: 'Search for dishes and restaurants will be available here.',
    symbol: '⌕',
  },
  orders: {
    title: 'Your orders',
    description: 'Your active and previous orders will appear here.',
    symbol: '▤',
  },
};

export default function HomeScreen({
  activeTab,
  customerName,
  onLogout,
  onOpenDevPanel,
}: HomeScreenProps) {
  if (activeTab === 'home') {
    return <HomeSkeleton />;
  }

  if (activeTab === 'profile') {
    const displayName = customerName?.trim() || 'BHOOKO Customer';
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <ScrollView
        style={styles.profileScreen}
        contentContainerStyle={styles.profileContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.headingTitle}>My Profile</Text>
          <Text style={styles.headingSubtitle}>
            Your account, your preferences.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>WELCOME TO BHOOKO</Text>
            <View style={styles.memberPill}>
              <Text style={styles.memberText}>CUSTOMER</Text>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.customerSubtitle}>
                Your BHOOKO account
              </Text>
            </View>
          </View>

          <View style={styles.heroDecoration} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>

          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.rowIcon}>
                <Text style={styles.rowSymbol}>○</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Account details</Text>
                <Text style={styles.rowSubtitle}>
                  Signed in as a BHOOKO customer
                </Text>
              </View>
              <Text style={styles.rowStatus}>ACTIVE</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES & SUPPORT</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoDot} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>More features coming soon</Text>
                <Text style={styles.rowSubtitle}>
                  Address management and support will be available here.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {__DEV__ && onOpenDevPanel && (
          <TouchableOpacity
            style={styles.developerButton}
            onPress={onOpenDevPanel}
            activeOpacity={0.75}
          >
            <Text style={styles.developerText}>Developer tools</Text>
            <Text style={styles.developerHint}>Development only</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() =>
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: onLogout,
                },
              ],
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>MADE WITH CARE BY BHOOKO</Text>
      </ScrollView>
    );
  }

  const content = tabContent[activeTab];

  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{content.symbol}</Text>
      </View>

      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.description}>{content.description}</Text>
      <Text style={styles.comingSoon}>COMING SOON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xxxl,
    backgroundColor: Theme.colors.background,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  icon: {
    fontSize: 34,
    color: Theme.colors.primary,
  },
  title: {
    fontSize: Theme.typography.size.xl,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: Theme.typography.size.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Theme.spacing.sm,
  },
  comingSoon: {
    marginTop: Theme.spacing.xl,
    color: Theme.colors.primary,
    fontSize: Theme.typography.size.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  profileScreen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  profileContent: {
    padding: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
  },
  heading: {
    marginBottom: Theme.spacing.xl,
  },
  headingTitle: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  headingSubtitle: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.size.sm,
    color: Theme.colors.textSecondary,
  },
  heroCard: {
    backgroundColor: Theme.colors.brown,
    borderRadius: Theme.radius.banner,
    padding: Theme.spacing.xl,
    overflow: 'hidden',
    ...Theme.shadows.floating,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    color: '#F8D9C5',
    fontSize: Theme.typography.size.xs,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  memberPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.pill,
  },
  memberText: {
    color: Theme.colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xxl,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Theme.colors.white,
    fontSize: 27,
    fontWeight: '800',
  },
  heroInfo: {
    flex: 1,
    marginLeft: Theme.spacing.lg,
  },
  customerName: {
    color: Theme.colors.white,
    fontSize: Theme.typography.size.xl,
    fontWeight: '800',
  },
  customerSubtitle: {
    color: '#E8D6CC',
    fontSize: Theme.typography.size.sm,
    marginTop: Theme.spacing.xs,
  },
  heroDecoration: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 22,
    borderColor: 'rgba(255,255,255,0.045)',
    right: -48,
    bottom: -78,
  },
  section: {
    marginTop: Theme.spacing.xxl,
  },
  sectionTitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.size.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.md,
  },
  accountCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: Theme.radius.md,
    backgroundColor: '#FFF1E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSymbol: {
    fontSize: 25,
    color: Theme.colors.primary,
  },
  rowContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  rowTitle: {
    color: Theme.colors.text,
    fontSize: Theme.typography.size.md,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.size.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  rowStatus: {
    color: Theme.colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
  },
  developerButton: {
    marginTop: Theme.spacing.xxl,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  developerText: {
    color: Theme.colors.text,
    fontSize: Theme.typography.size.sm,
    fontWeight: '600',
  },
  developerHint: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.size.xs,
    marginTop: 3,
  },
  logoutButton: {
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: '#F0D4CB',
    alignItems: 'center',
  },
  logoutText: {
    color: Theme.colors.error,
    fontSize: Theme.typography.size.md,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: Theme.spacing.xxl,
  },
});
