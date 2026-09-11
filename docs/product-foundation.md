# 🍔 Hyperlocal Food Delivery Product

## Master Product Requirements Document (PRD) + MVP

**Product Type:** Hyperlocal Food Delivery Platform
**Initial Strategy:** Single-city / limited-area launch
**Primary Customer Platform:** Mobile App
**Supporting Platform:** Responsive Web
**Product Model:** Customer + Restaurant + Delivery Partner + Admin ecosystem

---

# 1. Product Vision

Build a **modern, production-grade hyperlocal food delivery product** that connects customers with nearby restaurants and delivery partners through a reliable, realtime platform.

The product will begin in a limited service area instead of trying to compete with large platforms everywhere from day one.

The long-term goal is to create an independent food-delivery brand with:

* Its own customer experience
* Its own restaurant ecosystem
* Its own delivery network
* Realtime order infrastructure
* Strong location intelligence
* Smart food discovery
* AI-powered assistance
* Scalable backend architecture

The product should feel like a **normal premium food-delivery application**, not an "AI application."

---

# 2. The Core Problem

Large food-delivery platforms already solve basic food ordering.

Therefore, simply providing:

> "Restaurants + menu + cart + delivery"

is not enough.

Our product should focus initially on:

### Hyperlocal discovery

Help customers discover nearby restaurants and food that are genuinely relevant to their location.

### Better local restaurant participation

Give smaller/local restaurants a strong digital presence and operational dashboard.

### Better food discovery

Make it easier for customers to answer:

> "Aaj kya khaun?"

rather than forcing them to manually browse hundreds of items.

### Strong technology foundation

Build a system where customer, restaurant, rider and admin are connected in realtime.

---

# 3. Product Differentiation Direction

The exact USP will be validated before launch.

Potential differentiation:

### 1. Hyperlocal-first

Start with one area/city and understand it deeply.

### 2. Better local discovery

Focus on nearby restaurants, local favorites and relevant food rather than simply showing a huge marketplace.

### 3. Smart food discovery

Customers can search naturally:

> "₹250 ke andar spicy veg kuch suggest karo."

The system can understand:

* Budget
* Cuisine
* Veg/non-veg
* Preferences
* Location
* Availability

and return relevant actual menu items.

### 4. Personalized experience

Over time:

* Previous orders
* Favorites
* Frequently ordered cuisines
* Preferences

can improve recommendations.

### 5. Restaurant intelligence

Restaurants can eventually receive useful insights about:

* Best-selling items
* Peak ordering times
* Revenue
* Customer behavior
* Demand patterns

---

# 4. Product Ecosystem

The product consists of four major participants.

```text
                    FOOD DELIVERY PRODUCT
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
      CUSTOMER           RESTAURANT         DELIVERY
          │                  │                  │
      📱 Mobile           💻 Web             📱 Mobile
      💻 Web
          │
          └──────────────────┬──────────────────┘
                             │
                        ⚙️ BACKEND
                             │
                 ┌───────────┼───────────┐
                 │           │           │
             PostgreSQL    Redis      Realtime
                 │
       Payments / Maps / Notifications / AI
                 │
              🛠️ ADMIN WEB
```

---

# 5. Platforms

## 📱 Customer Mobile App — Primary

This is the main customer experience.

Technology:

* React Native
* Expo
* TypeScript
* Expo Router

---

## 💻 Customer Web

Responsive web version for customers.

Technology:

* Next.js
* TypeScript
* Responsive UI

The web experience should work across:

* Desktop
* Tablet
* Mobile browser

It should not be treated as a simple mobile wrapper.

---

## 🏪 Restaurant Web Dashboard

Restaurants manage their entire operation from a dedicated web dashboard.

Technology:

* Next.js
* TypeScript

---

## 🚴 Delivery Partner Mobile App

Delivery partners use a dedicated mobile application.

Technology:

* React Native
* Expo
* TypeScript

---

## 🛠️ Admin Web Dashboard

Central control system for the business.

Technology:

* Next.js
* TypeScript

---

# 6. Customer Experience

## Splash Screen

First screen:

* Product logo
* Lightweight loading state
* App initialization

No unnecessary heavy animation.

---

# 7. Authentication

Customer:

* Signup
* Login
* Logout
* OTP/email authentication
* Password reset where applicable
* Session management
* Profile creation

---

# 8. Location

Location is fundamental to the product.

Customer can:

* Allow current location
* Select location manually
* Add address
* Save multiple addresses
* Change delivery location

System determines:

```text
Customer Location
       ↓
Serviceability
       ↓
Available Restaurants
       ↓
Restaurant Delivery Area
       ↓
Delivery Information
```

---

# 9. Customer Home

Initial structure:

```text
┌─────────────────────────────┐
│ 📍 Location          Profile│
│                             │
│ 🔍 Search food or restaurant│
│                             │
│       HERO / OFFER          │
│                             │
│ Popular Food → → →          │
│ [Food] [Food] [Food]        │
│                             │
│ What are you craving?       │
│ [Pizza] [Burger] [Biryani]  │
│                             │
│ Popular Restaurants         │
│ Restaurant Cards             │
│                             │
│ Recommended                 │
│ Restaurant Cards             │
│                             │
│ Offers                      │
│                             │
│ More Restaurants            │
└─────────────────────────────┘
```

The exact sections will be finalized during UI/UX design.

---

# 10. Search

Search should support:

* Restaurants
* Food items
* Categories
* Cuisines
* Recent searches
* Search suggestions
* Filters
* Sorting

Possible filters:

* Rating
* Price
* Vegetarian
* Cuisine
* Delivery time
* Offers

---

# 11. Smart / AI Search

AI should be integrated naturally.

Example:

> "₹300 ke andar 2 logon ke liye kuch spicy suggest karo."

The system can interpret:

```text
Budget = ₹300
People = 2
Preference = Spicy
```

Then search actual available menu data.

Another example:

> "Momos nahi chahiye."

The current recommendation context can avoid momos.

AI should **not invent restaurants or menu items**.

Recommendations should be grounded in actual product data.

---

# 12. Food Categories

Examples:

* Pizza
* Burger
* Biryani
* Chinese
* North Indian
* South Indian
* Momos
* Desserts
* Beverages
* Snacks
* Healthy
* Fast Food

Categories can be expanded later.

---

# 13. Restaurant Listing

Restaurant card can show:

* Restaurant image
* Name
* Rating
* Cuisine
* Delivery ETA
* Distance
* Price information
* Offer
* Open/closed status

---

# 14. Restaurant Detail Page

Contains:

* Cover image
* Restaurant logo/image
* Restaurant name
* Rating
* Cuisine
* Delivery ETA
* Delivery information
* Offers
* Menu categories
* Menu items
* Restaurant search
* Availability

---

# 15. Food Item Detail

Each food item:

* Image
* Name
* Description
* Price
* Veg/non-veg indicator
* Customization
* Add-ons
* Quantity
* Special instructions
* Availability
* Add to cart

---

# 16. Cart

Cart contains:

* Restaurant
* Items
* Quantity
* Customizations
* Item subtotal
* Delivery fee
* Taxes
* Discount
* Coupon
* Platform charges if applicable
* Final total

Important:

The system must prevent invalid cart/order states.

---

# 17. Address

Features:

* Current location
* Saved addresses
* Add address
* Edit address
* Delete address
* Address labels

  * Home
  * Work
  * Other
* Delivery instructions

---

# 18. Checkout

Checkout contains:

* Restaurant
* Items
* Address
* Price breakdown
* Coupon
* Payment method
* Final amount
* Place Order

---

# 19. Payment

Initial gateway:

**Razorpay**

Payment workflows:

* Create payment
* Payment success
* Payment failure
* Payment pending
* Retry
* Verification
* Webhooks
* Refunds
* Reconciliation

Payment status must be tracked separately from order status.

---

# 20. Order Lifecycle

Core order lifecycle:

```text
Customer places order
        ↓
Payment verification
        ↓
Order Created
        ↓
Restaurant receives order
        ↓
Restaurant Accepts
        ↓
Preparing
        ↓
Ready
        ↓
Delivery Partner Assigned
        ↓
Picked Up
        ↓
Out for Delivery
        ↓
Delivered
        ↓
Rating / Review
```

---

# 21. Order Edge Cases

Production system must handle:

### Payment failure

Order should not incorrectly become paid.

### Payment pending

System waits for verification/reconciliation.

### Restaurant rejection

Customer receives update and refund workflow begins if applicable.

### Restaurant timeout

Admin/system can handle expired orders.

### Customer cancellation

Cancellation rules depend on order state.

### Restaurant cancellation

Refund process.

### Rider cancellation

Order can be reassigned.

### Delivery failure

Admin/support workflow.

### Duplicate requests

Backend must protect against duplicate order/payment operations.

---

# 22. Realtime System

Realtime is a core product capability.

Technology:

**Socket.IO / WebSockets**

Examples:

### Customer → Restaurant

```text
Customer places order
        ↓
Restaurant receives order instantly
```

### Restaurant → Customer

```text
Restaurant accepts
        ↓
Customer sees update instantly
```

### Restaurant → Delivery

```text
Order ready
        ↓
Delivery partner gets request
```

### Delivery → Customer

```text
Rider picks up
        ↓
Customer sees "Out for delivery"
```

No manual page refresh should be required for critical live status changes.

---

# 23. Restaurant Dashboard

## Dashboard

* Orders
* Active orders
* Revenue
* Completed orders
* Cancelled orders
* Basic performance

## Order Management

* New order
* Accept
* Reject
* Preparing
* Ready
* Order details
* Customer information

## Menu Management

* Add item
* Edit item
* Delete item
* Price
* Description
* Image
* Category
* Add-ons
* Availability
* Veg/non-veg

## Restaurant Settings

* Name
* Description
* Images
* Cuisine
* Opening hours
* Closing hours
* Open/closed status
* Service area
* Delivery settings

## Offers

* Discounts
* Coupons
* Item offers

## Analytics

* Orders
* Revenue
* Best-selling items
* Average order value
* Peak hours

Future:

* AI-generated insights
* Demand recommendations

---

# 24. Delivery Partner App

## Authentication

* Login
* Signup
* Verification
* Profile

## Dashboard

* Online/offline toggle
* Current delivery
* Today's deliveries
* Earnings

## Delivery Request

Shows:

* Restaurant
* Pickup area
* Customer area
* Distance
* Estimated information

Actions:

* Accept
* Reject

## Delivery Flow

```text
Online
 ↓
Request
 ↓
Accept
 ↓
Navigate to Restaurant
 ↓
Arrived
 ↓
Pickup
 ↓
Navigate to Customer
 ↓
Delivered
```

## Navigation

Maps integration for:

* Restaurant
* Customer
* Route
* Distance

## Earnings

* Today's earnings
* Delivery history
* Weekly earnings
* Completed deliveries

---

# 25. Admin Dashboard

Admin is the control center.

## Dashboard

* Customers
* Restaurants
* Delivery partners
* Orders
* Revenue
* Cancellations
* Refunds
* Service-area statistics

## Users

* View customers
* Account status
* Order history

## Restaurants

* Applications
* Approvals
* Status
* Service area
* Performance
* Menu monitoring

## Delivery Partners

* Verification
* Status
* Active deliveries
* Performance
* Earnings

## Orders

* All orders
* Order status
* Restaurant
* Customer
* Delivery partner
* Payment
* Cancellation
* Refund

## Payments

* Transactions
* Success
* Failed
* Pending
* Refunds
* Reconciliation

## Coupons

* Create
* Expiry
* Usage limit
* Discount
* Minimum order

## Service Areas

* Cities
* Areas
* Zones
* Restaurant availability
* Delivery availability

## Support

* Customer complaints
* Restaurant complaints
* Delivery issues
* Order disputes

---

# 26. Notifications

## Customer

* Order placed
* Restaurant accepted
* Preparing
* Rider assigned
* Pickup
* Out for delivery
* Delivered
* Payment updates
* Promotional notifications

## Restaurant

* New order
* Cancellation
* Important operational alerts

## Delivery Partner

* New delivery
* Pickup reminders
* Delivery updates

Technology:

* Firebase Cloud Messaging
* Expo Notifications

---

# 27. Reviews & Ratings

After delivery:

* Food rating
* Restaurant rating
* Delivery rating
* Written review

Future:

* Review moderation
* Sentiment analysis

---

# 28. Favorites & Personalization

Post-MVP:

* Favorite restaurants
* Favorite food
* Personalized home
* Recent orders
* Reorder
* Frequently ordered

---

# 29. AI Layer

AI should remain a **quiet capability**, not the visual identity.

## Customer AI

Potential features:

* Natural-language food discovery
* Personalized recommendations
* Smart reorder
* Preference-aware suggestions
* Customer support

## Restaurant AI

Potential features:

* Sales insights
* Best-selling analysis
* Demand trends
* Menu recommendations

AI must never control critical transactional operations blindly.

Payments, prices, order state, refunds and permissions remain deterministic backend logic.

---

# 30. Hyperlocal Service Model

Initial launch:

**Limited geographic area**

Example:

```text
City
 ↓
Service Zones
 ↓
Restaurants
 ↓
Delivery Radius
 ↓
Customer
```

System checks:

* Is customer serviceable?
* Is restaurant serviceable?
* Is delivery available?
* What is the estimated distance?
* What delivery fee applies?

This allows the product to expand gradually instead of requiring a nationwide infrastructure from day one.

---

# 31. Database

## Primary Database: PostgreSQL

Core entities:

```text
Users
Restaurants
RestaurantUsers
DeliveryPartners
MenuCategories
MenuItems
Addons
Addresses
Carts
CartItems
Orders
OrderItems
Payments
Refunds
Deliveries
Coupons
Reviews
Notifications
ServiceAreas
OrderStatusHistory
```

PostgreSQL is preferred because the product contains many relationships and transactional workflows.

---

# 32. Redis

Redis will be included as a production infrastructure component where useful.

Potential uses:

* Caching
* Rate limiting
* Short-lived data
* Temporary state
* Distributed locks
* Frequently accessed restaurant/menu information
* Future delivery assignment logic

Redis should not replace PostgreSQL as the source of truth.

---

# 33. Background Jobs

Technology:

**BullMQ + Redis**

Used when asynchronous processing becomes useful.

Examples:

* Notifications
* Payment-related background processing
* Order timeout handling
* Cleanup jobs
* Scheduled tasks
* Non-critical processing

Not every operation needs a queue.

---

# 34. Backend

Technology:

**Node.js + TypeScript + NestJS**

Backend modules:

```text
Auth
Users
Restaurants
Menu
Categories
Cart
Orders
Payments
Delivery
Notifications
Coupons
Reviews
Service Areas
Admin
AI
```

NestJS provides a structured modular backend suitable for a growing production product.

---

# 35. API

Primary communication:

**REST API**

Realtime:

**WebSockets / Socket.IO**

The API will handle:

* Authentication
* CRUD
* Business logic
* Orders
* Payments
* Restaurant operations
* Delivery
* Admin

Realtime handles live state changes.

---

# 36. Authentication & Authorization

* JWT
* Refresh tokens
* Secure password hashing
* Role-based access control

Roles:

```text
CUSTOMER
RESTAURANT
DELIVERY_PARTNER
ADMIN
```

Every sensitive operation must be authorized server-side.

---

# 37. Maps & Location

Technology:

**Google Maps Platform**

Potential functionality:

* Current location
* Address selection
* Geocoding
* Reverse geocoding
* Distance
* Directions
* Delivery navigation
* Future live rider tracking

---

# 38. Storage & Images

Restaurant and food images require proper media infrastructure.

Potential:

* Amazon S3 / S3-compatible storage
* Cloudinary

Requirements:

* Image compression
* CDN delivery
* Responsive sizes
* Optimization

---

# 39. Analytics

Product analytics:

* Signups
* Restaurant views
* Food views
* Search
* Add-to-cart
* Checkout
* Payment success
* Orders
* Cancellations
* Repeat orders
* Retention

Potential technology:

**PostHog**

---

# 40. Testing

Testing strategy:

### Frontend

* Unit tests
* Component tests

### Backend

* Unit tests
* Integration tests
* API tests

### End-to-End

* Playwright for web
* React Native testing tools for mobile

Critical flow:

```text
Signup
 ↓
Browse
 ↓
Restaurant
 ↓
Food
 ↓
Cart
 ↓
Checkout
 ↓
Payment
 ↓
Order
 ↓
Restaurant
 ↓
Delivery
 ↓
Customer
```

---

# 41. Security

Production requirements:

* Password hashing
* JWT security
* Refresh token handling
* Role-based authorization
* Input validation
* Rate limiting
* API protection
* Secure environment variables
* Payment verification
* Webhook verification
* Audit logs
* Proper CORS configuration
* Secure file uploads
* Sensitive-data protection

---

# 42. Development Environment

Primary development environment:

**VS Code**

Tools:

* Node.js
* pnpm
* Git
* GitHub
* PostgreSQL
* Redis
* Android Emulator
* iOS Simulator
* Browser DevTools

The product will be developed and tested locally before cloud deployment.

---

# 43. Containerization

Technology:

**Docker**

Docker can be used for:

* Backend
* PostgreSQL development
* Redis development
* Consistent development environment
* Deployment

Docker is infrastructure tooling, not something that needs to complicate everyday frontend development.

---

# 44. CI/CD

Technology:

**GitHub Actions**

Potential pipeline:

```text
Push Code
   ↓
Lint
   ↓
Type Check
   ↓
Tests
   ↓
Build
   ↓
Deploy
```

---

# 45. Repository Architecture

A monorepo can be used when shared code becomes valuable.

Potential structure:

```text
food-product/
│
├── apps/
│   ├── customer-mobile/
│   ├── delivery-mobile/
│   ├── customer-web/
│   ├── restaurant-web/
│   └── admin-web/
│
├── packages/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   ├── ui/
│   └── utils/
│
├── backend/
│   └── api/
│
├── infrastructure/
│
└── docs/
```

Possible tooling:

* pnpm
* Turborepo

Turborepo can be introduced when the shared-code structure justifies it; it is not mandatory on day one.

---

# 46. Final Technology Stack

## Frontend

### Customer Mobile

**React Native + Expo + TypeScript**

### Delivery Mobile

**React Native + Expo + TypeScript**

### Web

**Next.js + TypeScript**

---

## Backend

**Node.js + NestJS + TypeScript**

---

## Database

**PostgreSQL**

---

## Cache / Fast Data

**Redis**

---

## Background Jobs

**BullMQ**

---

## Realtime

**Socket.IO / WebSockets**

---

## Authentication

**JWT + Refresh Tokens**

---

## Payments

**Razorpay**

---

## Maps

**Google Maps Platform**

---

## Notifications

**Firebase Cloud Messaging + Expo Notifications**

---

## Storage

**S3-compatible storage / Cloudinary**

---

## AI

**OpenAI API**

---

## Analytics

**PostHog**

---

## Development / Infrastructure

**VS Code + Git + GitHub + Docker**

---

## CI/CD

**GitHub Actions**

---

# 47. Technology We Are NOT Adding Initially

To avoid unnecessary architecture complexity:

* ❌ Microservices
* ❌ Kubernetes
* ❌ Kafka
* ❌ Elasticsearch
* ❌ GraphQL
* ❌ Multiple primary databases
* ❌ Complex event-driven infrastructure

These can be introduced only if the product actually requires them.

Production quality does **not** mean using every technology available.

---

# 48. MVP

The MVP must complete the fundamental business loop:

> **Customer → Restaurant → Delivery Partner → Customer**

## Customer MVP

* Authentication
* Location
* Serviceability
* Home
* Categories
* Search
* Restaurant listing
* Restaurant details
* Food details
* Cart
* Address
* Checkout
* Razorpay
* Order creation
* Realtime order status
* Notifications
* Order history

---

## Restaurant MVP

* Authentication
* Restaurant profile
* Menu management
* Food availability
* New order notification
* Accept/reject
* Preparing
* Ready
* Order history

---

## Delivery MVP

* Authentication
* Online/offline
* Delivery request
* Accept
* Pickup
* Delivery
* Basic navigation
* Delivery history
* Basic earnings

---

## Admin MVP

* Admin authentication
* User management
* Restaurant management
* Delivery partner management
* Order management
* Payment visibility
* Refund handling
* Service-area management
* Basic analytics

---

# 49. MVP Realtime Flow

```text
CUSTOMER
   │
   │ Place Order
   ▼
BACKEND
   │
   ├──────────────► RESTAURANT
   │                    │
   │                    │ Accept
   │                    ▼
   │                 PREPARING
   │                    │
   │                    │ Ready
   │                    ▼
   │              DELIVERY SYSTEM
   │                    │
   │                    │ Assign
   │                    ▼
   │                 RIDER APP
   │                    │
   │                    │ Pickup
   │                    ▼
   │              OUT FOR DELIVERY
   │                    │
   │                    │ Delivered
   ▼                    ▼
CUSTOMER ◄──────── REALTIME UPDATE
```

---

# 50. MVP Success Criteria

The MVP is considered functionally complete when a real test order can successfully travel through:

```text
Customer signup
      ↓
Select location
      ↓
Browse restaurant
      ↓
Select food
      ↓
Cart
      ↓
Checkout
      ↓
Payment
      ↓
Order created
      ↓
Restaurant receives order
      ↓
Restaurant accepts
      ↓
Preparing
      ↓
Ready
      ↓
Rider receives assignment
      ↓
Pickup
      ↓
Out for delivery
      ↓
Customer receives order
      ↓
Delivered
      ↓
Rating
```

All important states must be persisted correctly.

---

# 51. Post-MVP Roadmap

## Phase 2 — Product Enhancement

* Favorites
* Reorder
* Advanced search
* Better filters
* Coupons
* Offers
* Reviews
* Restaurant analytics
* Improved delivery assignment
* Live rider location

## Phase 3 — Intelligence

* AI food discovery
* Personalized recommendations
* AI customer support
* Restaurant AI insights
* Smarter ETA
* Demand prediction

## Phase 4 — Growth

* More service areas
* Multi-city support
* Loyalty
* Rewards
* Membership
* Advanced restaurant tools
* Advanced delivery optimization

---

# 52. Product Design Principles

### Clean

The interface should be modern and easy to understand.

### Food-first

High-quality food imagery should be a major visual component.

### Subtle animation

Use animation only where it improves feedback and UX.

Avoid:

* Excessive motion
* Heavy transitions
* Unnecessary effects
* Neon/glow AI aesthetics

### AI should be invisible

The user should feel:

> "This app understands what I want."

not:

> "This is an AI app."

### Responsive

Customer web must work properly across screen sizes.

### Native-first

Mobile customer and delivery experiences should be proper mobile applications, not website wrappers.

---

# 53. Product Architecture Philosophy

The most important principle:

> **Start simple, but design correctly.**

We will not add technology merely to make the stack look impressive.

Every major technology must solve a real problem.

For example:

**PostgreSQL** → transactional relational data
**Redis** → fast temporary/cache workloads
**BullMQ** → asynchronous jobs
**Socket.IO** → realtime communication
**NestJS** → structured backend architecture
**Docker** → consistent infrastructure
**React Native** → native mobile experience
**Next.js** → production web applications

---

# 54. Final Product Definition

This product is a **hyperlocal, realtime food-delivery ecosystem** consisting of:

```text
📱 Customer App
💻 Customer Web
🏪 Restaurant Web
🚴 Delivery App
🛠️ Admin Web
⚙️ Central Backend
🗄️ PostgreSQL
🔴 Redis
🔴 Realtime
💳 Payments
📍 Maps
🔔 Notifications
🤖 AI
📊 Analytics
```

The first goal is not to become a nationwide Swiggy/Zomato competitor immediately.

The first goal is:

> **Build one complete, reliable hyperlocal food-delivery ecosystem that can actually operate end-to-end.**

Then expand.

---

# 55. Product North Star

The product should eventually make food ordering feel like:

> **Open → know what's good nearby → choose quickly → order confidently → track live → receive → reorder effortlessly.**

And behind that simple experience should be a properly engineered system connecting:

**Customer + Restaurant + Delivery Partner + Admin.**

---

## Final MVP Stack

```text
React Native + Expo
        +
Next.js
        +
Node.js + NestJS
        +
PostgreSQL
        +
Redis
        +
BullMQ
        +
Socket.IO
        +
JWT
        +
Razorpay
        +
Google Maps
        +
FCM / Expo Notifications
        +
S3 / Cloudinary
        +
OpenAI API
        +
PostHog
        +
Docker
        +
GitHub Actions
```

**This is the baseline product specification.**

Detailed UI/UX, exact screen hierarchy, database schema, API contracts, order state machine, folder structure, development phases, and implementation decisions should be finalized from this baseline before coding begins.
