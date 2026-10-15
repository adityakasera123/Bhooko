import { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
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
  encodedPolyline?: string | null;
}

const MAP_DELTAS = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

function decodePolyline(encoded: string): TrackingCoordinate[] {
  const coordinates: TrackingCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      if (index >= encoded.length) return coordinates;
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) return coordinates;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      if (index >= encoded.length) return coordinates;
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) return coordinates;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

export default function TrackingMap({
  riderLocation,
  destination,
  encodedPolyline,
}: TrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  const routeCoordinates = useMemo(
    () => (encodedPolyline ? decodePolyline(encodedPolyline) : []),
    [encodedPolyline],
  );

  const initialCoordinate = riderLocation ?? destination;

  useEffect(() => {
    if (routeCoordinates.length >= 2) {
      mapRef.current?.fitToCoordinates(
        [
          ...routeCoordinates,
          destination,
          ...(riderLocation ? [riderLocation] : []),
        ],
        {
          edgePadding: {
            top: 48,
            right: 40,
            bottom: 48,
            left: 40,
          },
          animated: true,
        },
      );
      return;
    }

    if (riderLocation) {
      const region: Region = {
        ...riderLocation,
        ...MAP_DELTAS,
      };

      mapRef.current?.animateToRegion(region, 500);
    }
  }, [
    routeCoordinates,
    destination.latitude,
    destination.longitude,
    riderLocation?.latitude,
    riderLocation?.longitude,
  ]);

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
        {routeCoordinates.length >= 2 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2563EB"
            strokeWidth={5}
          />
        ) : null}

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