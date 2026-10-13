import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

interface TrackingMapProps {
  riderLocation?: TrackingCoordinate | null;
  destination: TrackingCoordinate;
}

const MAP_DELTAS = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

export default function TrackingMap({
  riderLocation,
  destination,
}: TrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  const initialCoordinate = riderLocation ?? destination;

  useEffect(() => {
    if (!riderLocation) {
      return;
    }

    const region: Region = {
      ...riderLocation,
      ...MAP_DELTAS,
    };

    mapRef.current?.animateToRegion(region, 500);
  }, [riderLocation?.latitude, riderLocation?.longitude]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...initialCoordinate,
          ...MAP_DELTAS,
        }}
      >
        <Marker
          coordinate={destination}
          title="Delivery destination"
          description="Your delivery address"
          pinColor="red"
        />

        {riderLocation ? (
          <Marker
            coordinate={riderLocation}
            title="Your delivery rider"
            description="Live rider location"
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
