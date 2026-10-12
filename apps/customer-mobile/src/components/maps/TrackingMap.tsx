import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

interface TrackingMapProps {
  riderLocation?: TrackingCoordinate | null;
  destination: TrackingCoordinate;
}

export default function TrackingMap({
  riderLocation,
  destination,
}: TrackingMapProps) {
  const initialCoordinate = riderLocation ?? destination;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...initialCoordinate,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Marker
          coordinate={destination}
          title="Delivery destination"
          pinColor="red"
        />

        {riderLocation ? (
          <Marker
            coordinate={riderLocation}
            title="Your delivery rider"
            pinColor="orange"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 360,
    overflow: 'hidden',
    borderRadius: 16,
  },
  map: {
    flex: 1,
  },
});
