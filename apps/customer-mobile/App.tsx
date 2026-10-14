import { useState } from 'react';

import { StatusBar } from 'expo-status-bar';

import * as Notifications from 'expo-notifications';

import Constants from 'expo-constants';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as SecureStore from 'expo-secure-store';

import {

  ActivityIndicator,

  Alert,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,

} from 'react-native';

import TrackingScreen from './src/screens/tracking/TrackingScreen';

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

  const [deliveryIdInput, setDeliveryIdInput] = useState('');

  const [trackingDeliveryId, setTrackingDeliveryId] = useState('');

  // Customer authentication for development testing.

  const [accessTokenInput, setAccessTokenInput] = useState('');

  const [refreshTokenInput, setRefreshTokenInput] = useState('');

  const [savingToken, setSavingToken] = useState(false);

  const [tokenSaved, setTokenSaved] = useState(false);

  async function saveCustomerToken() {

    const accessToken = accessTokenInput.trim();

    const refreshToken = refreshTokenInput.trim();

    if (!accessToken || !refreshToken) {

      Alert.alert(

        'Missing tokens',

        'Enter both your customer access token and refresh token.',

      );

      return;

    }

    setSavingToken(true);

    try {

      await SecureStore.setItemAsync(

        'bhooko.accessToken',

        accessToken,

      );

      await SecureStore.setItemAsync(

        'bhooko.refreshToken',

        refreshToken,

      );

      // Keep compatibility with the current Socket.IO implementation.

      await AsyncStorage.setItem(

        'bhooko.accessToken',

        accessToken,

      );

      setAccessTokenInput('');

      setRefreshTokenInput('');

      setTokenSaved(true);

      Alert.alert(

        'Customer session saved',

        'Access and refresh tokens have been saved on this device.',

      );

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : 'Unable to save the customer session.';

      Alert.alert('Save failed', message);

    } finally {

      setSavingToken(false);

    }

  }

  async function clearCustomerToken() {

    try {

      await Promise.all([

        SecureStore.deleteItemAsync('bhooko.accessToken'),

        SecureStore.deleteItemAsync('bhooko.refreshToken'),

        AsyncStorage.removeItem('bhooko.accessToken'),

      ]);

      setTokenSaved(false);

      setAccessTokenInput('');

      setRefreshTokenInput('');

      Alert.alert(

        'Session cleared',

        'The saved customer session has been removed.',

      );

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : 'Unable to clear the customer session.';

      Alert.alert('Error', message);

    }

  }

  async function registerForPushNotifications() {

    setLoading(true);

    try {

      const existing = await Notifications.getPermissionsAsync();

      let status = existing.status;

      if (status !== 'granted') {

        const requested =

          await Notifications.requestPermissionsAsync();

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

      const tokenResponse =

        await Notifications.getExpoPushTokenAsync({

          projectId,

        });

      setPushToken(tokenResponse.data);

      // Register the current emulator/device token with the authenticated customer.
      const accessToken = await SecureStore.getItemAsync(
        'bhooko.accessToken',
      );

      if (!accessToken) {
        throw new Error(
          'Customer session missing. Save the customer access token first.',
        );
      }

      // Android Studio emulator reaches the host machine through 10.0.2.2.
      // This assumes the NestJS API is listening on port 3000.
      const apiBaseUrl = 'http://10.0.2.2:3000';

      const response = await fetch(
        `${apiBaseUrl}/notifications/push-devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            pushToken: tokenResponse.data,
            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
            deviceName: 'BHOOKO Customer App',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Device registration failed (HTTP ${response.status}).`,
        );
      }

      Alert.alert(
        'Push Ready',
        'Device token generated and registered with BHOOKO backend.',
      );

    } catch (error) {

      const message =

        error instanceof Error ? error.message : 'Unknown error';

      Alert.alert('Push token error', message);

    } finally {

      setLoading(false);

    }

  }

  async function testLocalNotification() {

    try {

      await Notifications.scheduleNotificationAsync({

        content: {

          title: 'BHOOKO Test',

          body: 'Bhai, local notification successfully aa gayi! 🎉',

          sound: 'default',

        },

        trigger: null,

      });

    } catch (error) {

      const message =

        error instanceof Error ? error.message : 'Unknown error';

      Alert.alert('Notification error', message);

    }

  }

  async function copyToken() {

    if (!pushToken) return;

    try {

      const Clipboard = await import('expo-clipboard');

      await Clipboard.setStringAsync(pushToken);

      Alert.alert(

        'Copied',

        'Expo Push Token clipboard mein copy ho gaya.',

      );

    } catch {

      Alert.alert('Token', pushToken);

    }

  }

  function openTracking() {

    const id = deliveryIdInput.trim();

    if (!id) {

      Alert.alert(

        'Delivery ID required',

        'Tracking test karne ke liye delivery ID enter karo.',

      );

      return;

    }

    setTrackingDeliveryId(id);

  }

  if (trackingDeliveryId) {

    return (

      <View style={styles.trackingContainer}>

        <StatusBar style="dark" />

        <View style={styles.trackingHeader}>

          <TouchableOpacity

            style={styles.backButton}

            onPress={() => setTrackingDeliveryId('')}

          >

            <Text style={styles.backButtonText}>

              ← Back to Test Screen

            </Text>

          </TouchableOpacity>

        </View>

        <TrackingScreen deliveryId={trackingDeliveryId} />

      </View>

    );

  }

  return (

    <ScrollView

      contentContainerStyle={styles.container}

      keyboardShouldPersistTaps="handled"

    >

      <StatusBar style="dark" />

      <Text style={styles.logo}>BHOOKO</Text>

      <Text style={styles.heading}>

        Development Test Panel

      </Text>

      <Text style={styles.description}>

        Push notifications aur delivery tracking ko test karne ke liye

        temporary development screen.

      </Text>

      {/* Customer authentication */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>

          Customer Session Test

        </Text>

        <Text style={styles.label}>

          Customer Access Token

        </Text>

        <TextInput

          value={accessTokenInput}

          onChangeText={setAccessTokenInput}

          placeholder="Paste customer access token"

          placeholderTextColor="#9A8D85"

          autoCapitalize="none"

          autoCorrect={false}

          multiline

          textAlignVertical="top"

          secureTextEntry

          style={[styles.deliveryInput, styles.tokenInput]}

        />

        <Text style={styles.label}>

          Customer Refresh Token

        </Text>

        <TextInput

          value={refreshTokenInput}

          onChangeText={setRefreshTokenInput}

          placeholder="Paste customer refresh token"

          placeholderTextColor="#9A8D85"

          autoCapitalize="none"

          autoCorrect={false}

          multiline

          textAlignVertical="top"

          secureTextEntry

          style={[styles.deliveryInput, styles.tokenInput]}

        />

        <TouchableOpacity

          style={[

            styles.primaryButton,

            savingToken && styles.disabledButton,

          ]}

          onPress={saveCustomerToken}

          disabled={savingToken}

        >

          {savingToken ? (

            <ActivityIndicator color="#FFFFFF" />

          ) : (

            <Text style={styles.buttonText}>

              Save Customer Session

            </Text>

          )}

        </TouchableOpacity>

        {tokenSaved ? (

          <View style={styles.sessionStatus}>

            <Text style={styles.sessionStatusText}>

              Customer session saved on this device.

            </Text>

            <TouchableOpacity

              style={styles.secondaryButton}

              onPress={clearCustomerToken}

            >

              <Text style={styles.secondaryButtonText}>

                Clear Customer Session

              </Text>

            </TouchableOpacity>

          </View>

        ) : (

          <Text style={styles.helperText}>

            Enter both valid customer tokens. They are saved locally

            and are not displayed after saving.

          </Text>

        )}

      </View>

      {/* Delivery tracking */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>

          Delivery Tracking Test

        </Text>

        <Text style={styles.label}>Delivery ID</Text>

        <TextInput

          value={deliveryIdInput}

          onChangeText={setDeliveryIdInput}

          placeholder="Enter actual delivery ID"

          placeholderTextColor="#9A8D85"

          autoCapitalize="none"

          autoCorrect={false}

          style={styles.deliveryInput}

        />

        <TouchableOpacity

          style={styles.primaryButton}

          onPress={openTracking}

        >

          <Text style={styles.buttonText}>

            Open Delivery Tracking

          </Text>

        </TouchableOpacity>

        <Text style={styles.helperText}>

          A valid delivery ID and an authorized customer access token are

          required.

        </Text>

      </View>

      {/* Push notification permission and token */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>

          Push Notification Test

        </Text>

        <Text style={styles.label}>

          Notification Permission

        </Text>

        <Text style={styles.value}>{permission}</Text>

        <TouchableOpacity

          style={[

            styles.primaryButton,

            loading && styles.disabledButton,

          ]}

          onPress={registerForPushNotifications}

          disabled={loading}

        >

          {loading ? (

            <ActivityIndicator color="#FFFFFF" />

          ) : (

            <Text style={styles.buttonText}>

              Get Expo Push Token

            </Text>

          )}

        </TouchableOpacity>

      </View>

      <View style={styles.card}>

        <Text style={styles.label}>Expo Push Token</Text>

        <Text selectable style={styles.token}>

          {pushToken || 'Token abhi generate nahi hua.'}

        </Text>

        {pushToken ? (

          <TouchableOpacity

            style={styles.secondaryButton}

            onPress={copyToken}

          >

            <Text style={styles.secondaryButtonText}>

              Copy Token

            </Text>

          </TouchableOpacity>

        ) : null}

      </View>

      <TouchableOpacity

        style={styles.localButton}

        onPress={testLocalNotification}

      >

        <Text style={styles.buttonText}>

          Test Local Notification

        </Text>

      </TouchableOpacity>

      <Text style={styles.note}>

        Local notification phone par hi schedule hoti hai. Remote push ke

        liye Expo Push Token registration aur backend delivery alag se test

        karenge.

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

  trackingContainer: {

    flex: 1,

    backgroundColor: '#FFF8F2',

  },

  trackingHeader: {

    paddingHorizontal: 20,

    paddingTop: 8,

    paddingBottom: 4,

  },

  backButton: {

    alignSelf: 'flex-start',

    paddingVertical: 10,

  },

  backButtonText: {

    color: '#C74718',

    fontSize: 14,

    fontWeight: '700',

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

  sectionTitle: {

    color: '#211B18',

    fontSize: 17,

    fontWeight: '800',

    marginBottom: 16,

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

  deliveryInput: {

    minHeight: 48,

    marginTop: 10,

    marginBottom: 12,

    paddingHorizontal: 12,

    borderWidth: 1,

    borderColor: '#F0E3DA',

    borderRadius: 10,

    backgroundColor: '#FFF8F2',

    color: '#211B18',

  },

  tokenInput: {

    minHeight: 70,

    paddingTop: 12,

  },

  primaryButton: {

    minHeight: 50,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#F15A24',

    borderRadius: 12,

    padding: 12,

  },

  disabledButton: {

    opacity: 0.6,

  },

  buttonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '700',

  },

  helperText: {

    marginTop: 10,

    color: '#8A7D75',

    fontSize: 12,

    lineHeight: 18,

  },

  sessionStatus: {

    marginTop: 12,

  },

  sessionStatusText: {

    color: '#237A45',

    fontSize: 13,

    lineHeight: 19,

  },

  token: {

    marginTop: 10,

    color: '#211B18',

    fontSize: 12,

    lineHeight: 18,

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
