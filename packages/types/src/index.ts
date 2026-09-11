export type UserRole =
  | "CUSTOMER"
  | "RESTAURANT"
  | "DELIVERY_PARTNER"
  | "ADMIN";

export type RestaurantStatus =
  | "OPEN"
  | "CLOSED"
  | "PAUSED";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export type OrderStatus =
  | "CREATED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";


  export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

  export interface TimeSlot {
  open: string;
  close: string;
}

export interface DailyHours {
  day: DayOfWeek;
  isClosed: boolean;
  slots: TimeSlot[];
}

export type ServiceabilityType =
  | "RADIUS"
  | "ZONE";

export interface DeliveryConfig {
  serviceabilityType: ServiceabilityType;
  deliveryRadiusKm?: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Address {
  line1: string;
  line2?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  location: GeoLocation;
  address: Address;
  status: RestaurantStatus;
  rating: number;
  reviewCount: number;
  openingHours: DailyHours[];
  deliveryConfig: DeliveryConfig;
}