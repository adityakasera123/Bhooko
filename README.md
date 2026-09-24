# BHOOKO

> **Bhook lagi? Bhooko karo.**

Bhooko is a hyperlocal food delivery product focused on making food discovery and ordering simple, fast, and delightful.

## Product

**Category:** Hyperlocal Food Delivery

## Platforms

- Customer Mobile App
- Customer Web
- Restaurant Web Dashboard
- Delivery Partner Mobile App
- Admin Web Dashboard

## Core Roles

- Customer
- Restaurant
- Delivery Partner
- Admin

## Product Vision

Build a modern, reliable, and genuinely useful hyperlocal food delivery experience with strong local discovery, seamless ordering, realtime updates, and a polished customer experience.

## Current Status

**Day 0 — Product Foundation**

The product name and initial brand direction are locked. Detailed UX, architecture, database design, and implementation will be developed next.

## Initial Technology Direction

- React Native + Expo
- Next.js
- TypeScript
- Node.js + NestJS
- PostgreSQL
- Redis
- Socket.IO
- Razorpay
- Google Maps
- Firebase/Expo Notifications
- Docker
- GitHub Actions

## Repository Structure

```text
Bhooko/
├── README.md
└── docs/
    └── product-foundation.md
```

## Development Philosophy

Bhooko is being built as a real product, not a demo.

Every major technology and feature will be understood before implementation:
- what it is
- why we need it
- how it works in Bhooko
- how it is implemented in code

## Brand

**Name:** BHOOKO

**Tagline:** Bhook lagi? Bhooko karo.

# BHOOKO — PAYMENTS MODULE

## Locked Payment & Settlement Flow

### 1. Purpose

BHOOKO ka payment system customer payment, Razorpay verification, restaurant settlement, cancellation, refund aur post-delivery issues ko safely handle karega.

Payment aur restaurant settlement ko **alag concepts** maana jayega.

---

## 2. Customer Payment Flow

Customer order place karta hai.

```text
Customer
   ↓
Order Created
   ↓
BHOOKO Payment
   ↓
Razorpay
   ↓
Customer pays
   ↓
BHOOKO verifies payment
   ↓
Payment = PAID
```

Customer Razorpay API keys nahi dega.

Razorpay integration BHOOKO ke backend/business account ke through hoga.

Supported payment methods Razorpay ke through honge, jaise:

* UPI
* Card
* Net Banking
* Other supported methods

---

## 3. Payment Amount

Customer/frontend final amount decide nahi karega.

Correct flow:

```text
Frontend
   ↓
orderId
   ↓
BHOOKO Backend
   ↓
Order fetch
   ↓
Order.totalInPaise
   ↓
Razorpay Order
```

All money values integer paise mein store hongi.

Example:

```text
₹500 = 50000 paise
```

---

## 4. Payment Verification

Frontend ke "payment successful" bolne par directly payment ko PAID nahi kiya jayega.

Backend verify karega:

* BHOOKO Order
* Razorpay Order ID
* Razorpay Payment ID
* Razorpay Signature
* Payment record
* Expected amount

Verification successful hone ke baad:

```text
Payment = PAID
```

Invalid verification reject hogi.

Webhook bhi payment synchronization ke liye use hoga.

---

# 5. Restaurant Settlement

Customer ka payment successful hote hi restaurant ko immediately final settlement nahi diya jayega.

Flow:

```text
Customer Pays
      ↓
Payment Verified
      ↓
Payment = PAID
      ↓
Restaurant Processing
      ↓
Order Delivered
      ↓
Settlement Hold / Eligibility
      ↓
No unresolved issue
      ↓
Restaurant Settlement
```

Settlement ka exact schedule abhi hardcode nahi kiya jayega.

Future mein business requirement ke according:

* Daily
* Every few days
* Weekly

jaise settlement schedules configure kiye ja sakte hain.

---

# 6. Why Settlement Is Separate

Payment:

> Customer ne BHOOKO ko successfully payment kiya.

Settlement:

> BHOOKO se restaurant ko payable amount transfer hona.

Isliye:

```text
Payment = PAID
```

ka matlab automatically:

```text
Restaurant = SETTLED
```

nahi hai.

---

# 7. Successful Order

Example:

```text
1:50 PM
Customer orders ₹200 Chaumin
        ↓
Payment verified
        ↓
Payment = PAID
        ↓
Restaurant prepares
        ↓
2:20 PM
Order = DELIVERED
        ↓
Settlement Hold / Issue Window
        ↓
No issue
        ↓
Restaurant becomes settlement eligible
        ↓
Restaurant payout
```

---

# 8. Order Cancellation

Cancellation ka result order ke current stage aur cancellation reason par depend karega.

### Before preparation

Generally:

```text
Order Cancelled
      ↓
Full Refund
```

### After preparation started

Automatic full refund nahi hoga.

```text
Cancellation
      ↓
Cancellation Policy
      ↓
Partial Refund / No Refund
```

### Restaurant/BHOOKO side problem

Agar restaurant unavailable ho, restaurant cancel kare, ya BHOOKO-side problem ho, customer-protection refund rules apply honge.

---

# 9. Refund Lifecycle

Refund ko payment status se separately track kiya jayega.

```text
PAID
 ↓
REFUND_PENDING
 ↓
REFUNDED
```

Refund request/decision ke baad Razorpay refund process execute hoga.

Refund successful hone par payment:

```text
REFUNDED
```

---

# 10. Wrong / Missing / Incorrect Order

Customer ko wrong ya incomplete order milne par:

```text
Order = DELIVERED
        ↓
Customer
"Report an Issue"
        ↓
BHOOKO verification
        ↓
Refund Decision
```

Customer khud refund amount decide nahi karega.

BHOOKO issue verify karke decide karega:

```text
FULL REFUND
PARTIAL REFUND
NO REFUND
```

---

# 11. Examples

### Complete Wrong Order

Customer ne ₹500 ka order kiya.

Restaurant ne completely wrong food bheja.

```text
Customer reports issue
        ↓
Issue verified
        ↓
Full refund ₹500
```

Food ko normal e-commerce product ki tarah physically return nahi kiya jayega.

---

### Missing Item

Order:

```text
Food       ₹150
Drink       ₹50
Total      ₹200
```

Drink missing:

```text
Issue verified
      ↓
Partial refund
      ↓
₹50
```

---

### Minor Issue

Issue ki severity ke according:

```text
Partial Refund
       OR
Compensation
       OR
No Refund
```

Final decision BHOOKO ki future refund policy ke according hoga.

---

# 12. Order Status vs Payment Status

Dono independent rahenge.

Example:

```text
Order:
CANCELLED

Payment:
REFUND_PENDING
```

Refund complete hone ke baad:

```text
Order:
CANCELLED

Payment:
REFUNDED
```

Similarly:

```text
Order:
DELIVERED

Payment:
PAID
```

Settlement separately track hoga.

---

# 13. Settlement + Refund Adjustment

Agar restaurant ko settlement milne se pehle refund issue ho gaya:

```text
Refund
   ↓
Restaurant settlement reduced/adjusted
```

Agar kisi exceptional case mein restaurant settlement already ho chuka hai aur baad mein valid refund approve hota hai:

```text
Customer Refund
      ↓
Restaurant Settlement Adjustment / Recovery
```

Iske liye future settlement/reconciliation system maintain kiya jayega.

---

# 14. Core Principle

BHOOKO payment architecture ka fundamental rule:

```text
CUSTOMER PAYMENT
       ↓
PAYMENT VERIFIED
       ↓
ORDER PROCESSING
       ↓
ORDER DELIVERED
       ↓
SETTLEMENT ELIGIBILITY
       ↓
ISSUE / REFUND CHECK
       ↓
RESTAURANT SETTLEMENT
```

Aur issue hone par:

```text
REPORT ISSUE
     ↓
VERIFY
     ↓
FULL / PARTIAL / NO REFUND
     ↓
SETTLEMENT ADJUSTMENT
```

---

# 15. Locked Decisions

✅ Customer pays through BHOOKO's Razorpay integration
✅ Customer does not provide Razorpay credentials
✅ Amount always comes from server-side Order
✅ Payment verification happens server-side
✅ Razorpay webhook will be implemented
✅ Payment and settlement are separate
✅ Restaurant is not settled immediately after payment
✅ Settlement happens after successful delivery + applicable issue/adjustment handling
✅ Cancellation policy depends on order stage/reason
✅ Wrong/missing order uses "Report an Issue"
✅ Refund can be full, partial, or none
✅ Food is not treated like a normal physical-return product
✅ Order status and Payment status remain separate
✅ Refunds can require restaurant settlement adjustment
✅ Exact settlement schedule remains configurable
✅ Exact refund percentages/rules will be defined during Refund Policy implementation


BHOOKO 8 — DELIVERY 🚚
│
├── 8.1 — Delivery Architecture
│   ├── Delivery domain boundaries
│   ├── Delivery entity / Prisma model
│   ├── Order ↔ Delivery relationship
│   ├── Delivery ↔ Delivery Partner relationship
│   ├── Delivery status / enums
│   ├── Delivery lifecycle timestamps
│   ├── Delivery address snapshot/reference
│   ├── Delivery ownership model
│   ├── Delivery module structure
│   ├── Database constraints
│   └── Idempotency / consistency rules
│
├── 8.2 — Delivery Partner / Rider
│   ├── Delivery partner identity
│   ├── Partner profile
│   ├── Partner availability
│   ├── ONLINE / OFFLINE
│   ├── ACTIVE / INACTIVE
│   ├── Current active delivery
│   ├── Partner delivery history
│   ├── Partner ↔ Delivery relationship
│   └── Partner authorization foundation
│
├── 8.3 — Delivery Assignment
│   ├── Assignment creation
│   ├── Assign rider
│   ├── Assignment validation
│   ├── Rider availability check
│   ├── Prevent duplicate assignment
│   ├── Accept assignment
│   ├── Reject assignment
│   ├── Unassign
│   ├── Reassign
│   ├── Assignment timestamps
│   └── Assignment idempotency
│
├── 8.4 — Delivery Lifecycle
│   ├── Delivery state machine
│   ├── CREATED
│   ├── ASSIGNED
│   ├── ACCEPTED
│   ├── PICKED_UP
│   ├── OUT_FOR_DELIVERY
│   ├── DELIVERED
│   ├── CANCELLED
│   ├── FAILED
│   ├── Valid transitions
│   ├── Invalid transition protection
│   └── Transition timestamps / audit data
│
├── 8.5 — Pickup Flow
│   ├── Rider reaches restaurant
│   ├── Pickup eligibility
│   ├── Restaurant handoff readiness
│   ├── Pickup confirmation
│   ├── PICKED_UP transition
│   ├── Pickup timestamp
│   ├── Duplicate pickup protection
│   └── Pickup failure handling
│
├── 8.6 — Out-for-Delivery
│   ├── Pickup prerequisite
│   ├── OUT_FOR_DELIVERY transition
│   ├── Delivery start timestamp
│   ├── Rider authorization
│   ├── Customer visibility
│   ├── Restaurant visibility
│   ├── Status validation
│   └── Invalid transition protection
│
├── 8.7 — Delivered
│   ├── Delivery completion
│   ├── DELIVERED transition
│   ├── Delivery confirmation
│   ├── Completion timestamp
│   ├── Duplicate completion protection
│   ├── Order → completed lifecycle integration
│   ├── Settlement eligibility impact
│   └── Post-delivery state protection
│
├── 8.8 — Delivery Cancellation / Failure
│   ├── Cancellation rules
│   ├── Failure rules
│   ├── Cancellation reason
│   ├── Failure reason
│   ├── Customer unavailable
│   ├── Restaurant issue
│   ├── Rider issue
│   ├── Delivery timeout / failed attempt
│   ├── Reassignment after failure
│   ├── Order lifecycle impact
│   ├── Payment impact
│   ├── Refund integration
│   └── Settlement impact
│
├── 8.9 — Customer Delivery Tracking
│   ├── Delivery status endpoint
│   ├── Assigned rider information
│   ├── Pickup status
│   ├── OUT_FOR_DELIVERY status
│   ├── Delivery completion status
│   ├── Delivery timestamps
│   ├── Tracking information
│   ├── Customer ownership check
│   └── Realtime tracking foundation
│
├── 8.10 — Restaurant → Delivery Handoff
│   ├── Restaurant marks order READY
│   ├── Delivery eligibility
│   ├── Rider assignment
│   ├── Rider acceptance
│   ├── Restaurant handoff
│   ├── Pickup confirmation
│   ├── Handoff timestamp
│   ├── Restaurant visibility
│   └── Handoff failure handling
│
├── 8.11 — Delivery Authorization
│   ├── Customer authorization
│   ├── Restaurant authorization
│   ├── Delivery partner authorization
│   ├── Delivery ownership checks
│   ├── Cross-user protection
│   ├── Cross-restaurant protection
│   ├── Assignment authorization
│   ├── State-transition authorization
│   └── Unauthorized operation protection
│
├── 8.12 — Delivery Realtime Events
│   ├── Delivery created
│   ├── Rider assigned
│   ├── Assignment accepted
│   ├── Assignment rejected
│   ├── Pickup started/completed
│   ├── OUT_FOR_DELIVERY
│   ├── Delivery status updates
│   ├── DELIVERED
│   ├── CANCELLED
│   ├── FAILED
│   ├── Customer events
│   ├── Restaurant events
│   └── Rider events
│
├── 8.13 — Delivery Tests
│   ├── Delivery model/service tests
│   ├── State machine tests
│   ├── Partner tests
│   ├── Availability tests
│   ├── Assignment tests
│   ├── Accept/reject tests
│   ├── Reassignment tests
│   ├── Pickup tests
│   ├── OUT_FOR_DELIVERY tests
│   ├── Delivered tests
│   ├── Cancellation tests
│   ├── Failure tests
│   ├── Authorization/security tests
│   ├── Refund integration tests
│   ├── Settlement integration tests
│   ├── Realtime event tests
│   └── Edge-case / idempotency tests
│
└── 8.14 — Integration / E2E Verification
    ├── Order READY
    ├── Delivery creation
    ├── Rider assignment
    ├── Rider acceptance
    ├── Restaurant → rider handoff
    ├── Pickup
    ├── PICKED_UP
    ├── OUT_FOR_DELIVERY
    ├── Customer tracking
    ├── DELIVERED
    ├── Order completion
    ├── Settlement eligibility
    ├── Cancellation scenario
    ├── Failed delivery scenario
    ├── Reassignment scenario
    ├── Refund scenario
    ├── Authorization/security scenario
    ├── Realtime event verification
    ├── Full API flow
    ├── Full Jest suite
    ├── Production build
    └── Git checkpoint