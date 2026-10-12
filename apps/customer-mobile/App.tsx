
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [pushToken, setPushToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('Not requested');

  async function registerForPushNotifications() {
    setLoading(true);

    try {
      if (!Device.isDevice) {
        Alert.alert(
          'Physical device required',
          'Push notification testing ke liye physical Android phone use karo.',
        );
        return;
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }

      setPermission(status);

      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Android settings mein BHOOKO notifications allow karo.',
        );
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'BHOOKO Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });
      }

      const projectId =
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error('Expo EAS project ID is missing.');
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      setPushToken(tokenResponse.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      Alert.alert('Push token error', message);
    } finally {
      setLoading(false);
    }
  }

  async function testLocalNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'BHOOKO Test',
        body: 'Bhai, local notification successfully aa gayi! 🎉',
        sound: 'default',
      },
      trigger: null,
    });
  }

  async function copyToken() {
    if (!pushToken) return;

    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(pushToken);
      Alert.alert('Copied', 'Expo Push Token clipboard mein copy ho gaya.');
    } catch {
      Alert.alert('Token', pushToken);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.logo}>BHOOKO</Text>
      <Text style={styles.heading}>Push Notification Test</Text>
      <Text style={styles.description}>
        Android device par notification permission aur Expo Push Token test
        karo.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Notification Permission</Text>
        <Text style={styles.value}>{permission}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={registerForPushNotifications}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Expo Push Token</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Expo Push Token</Text>
        <Text selectable style={styles.token}>
          {pushToken || 'Token abhi generate nahi hua.'}
        </Text>

        {pushToken ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={copyToken}>
            <Text style={styles.secondaryButtonText}>Copy Token</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.localButton}
        onPress={testLocalNotification}
      >
        <Text style={styles.buttonText}>Test Local Notification</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Local notification phone par hi schedule hoti hai. Remote push ke liye
        Expo Push Token aur backend registration alag se test karenge.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF8F2',
  },
  logo: {
    color: '#F15A24',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  heading: {
    marginTop: 12,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
    color: '#211B18',
  },
  description: {
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    color: '#70645E',
    lineHeight: 21,
  },
  card: {
    padding: 18,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E3DA',
  },
  label: {
    color: '#70645E',
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 16,
    color: '#211B18',
  },
  token: {
    marginTop: 10,
    color: '#211B18',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F15A24',
    borderRadius: 12,
    padding: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 14,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
  },
  secondaryButtonText: {
    color: '#C74718',
    fontWeight: '700',
  },
  localButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28211D',
    borderRadius: 12,
    padding: 12,
  },
  note: {
    marginTop: 18,
    color: '#70645E',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
