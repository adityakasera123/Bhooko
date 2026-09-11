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


export type FoodType =
  | "VEG"
  | "NON_VEG"
  | "EGG";

  export interface FoodCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}


export type CustomizationSelectionType =
  | "SINGLE"
  | "MULTIPLE";

  export interface FoodCustomizationGroup {
  id: string;
  foodItemId: string;
  name: string;
  selectionType: CustomizationSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
}
export interface FoodCustomizationOption {
  id: string;
  customizationGroupId: string;
  name: string;
  priceAdjustmentInPaise: number;
  isAvailable: boolean;
  displayOrder: number;
  isActive: boolean;
}


export type CustomerAddressLabel =
  | "HOME"
  | "WORK"
  | "OTHER";

  export interface CustomerAddress {
  id: string;
  customerId: string;
  label: CustomerAddressLabel;
  line1: string;
  line2?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  location: GeoLocation;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
  deliveryInstructions?: string;
}


export interface FoodItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceInPaise: number;
  isAvailable: boolean;
  foodType: FoodType;
}


//order items and customizations

export interface OrderItem {
  id: string;
  orderId: string;
  foodItemId: string;
  foodName: string;
  unitPriceInPaise: number;
  quantity: number;
  customizations: OrderItemCustomization[];
  lineTotalInPaise: number;
}

export interface OrderItemCustomization {
  id: string;
  orderItemId: string;
  groupName: string;
  optionName: string;
  priceAdjustmentInPaise: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveryAddress: OrderDeliveryAddress;
  pricing: OrderPricing;
  items: OrderItem[];
}

export interface OrderDeliveryAddress {
  line1: string;
  line2?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  location: GeoLocation;
  contactName: string;
  contactPhone: string;
  deliveryInstructions?: string;
}

export interface OrderPricing {
  itemsSubtotalInPaise: number;
  deliveryFeeInPaise: number;
  taxInPaise: number;
  discountInPaise: number;
  totalInPaise: number;
}

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

  export type PaymentMethod =
  | "UPI"
  | "CARD"
  | "NET_BANKING"
  | "WALLET"
  | "CASH_ON_DELIVERY";

  export type PaymentProvider =
  | "RAZORPAY";

  export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amountInPaise: number;
  currency: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  providerOrderId: string;
  providerPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RefundStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED";

  export interface Refund {
  id: string;
  paymentId: string;
  amountInPaise: number;
    status: RefundStatus;
  providerRefundId?: string;
  createdAt: string;
}