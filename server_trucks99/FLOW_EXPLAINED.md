# iTruck — Flow Explained (Simple)

## One real example: Dubai → Chennai

Imagine **someone in Dubai wants to send electronics to Chennai**. Here is what happens, step by step.

---

## Step 1: We have people and a truck in the system

Before any shipment, the system already has:

| Who | What we have in the system |
|-----|-----------------------------|
| **Shipper** | e.g. "ABC Exports" – the company that wants to send the goods |
| **Buyer/Seller** | e.g. "Chennai Traders" – the company that will receive/buy the goods |
| **Driver** | e.g. "Ramesh" – the person who will drive the truck |
| **Truck** | e.g. "TN-01-AB-1234" – the vehicle; we can link it to Ramesh and say it is in "Chennai" |

We add these once (Create). Later we only use them when we create or assign a load.

---

## Step 2: Shipper (or Agent) creates a LOAD = one shipment

**Load** = one shipment from A to B.

- Someone (shipper or agent) creates a load, for example:
  - **From (origin):** Dubai  
  - **To (destination):** Chennai  
  - **What:** Electronics, 500 kg  
  - **Who sent:** we can link the Shipper (e.g. ABC Exports)  
  - **Who receives:** we can link the Buyer/Seller (e.g. Chennai Traders)  

At this moment the load is **pending** = "no truck assigned yet".

```
LOAD: Dubai → Chennai, 500 kg, status = PENDING
```

---

## Step 3: Agent (or someone) finds "available" loads

The transport agent (or any user) wants to see: **which loads are still waiting for a truck?**

- They call: **GET /api/load/available**
- They get back all **pending** loads (no truck assigned yet).
- They can also filter by place, e.g. "show me loads near Chennai" or "from Dubai":
  - `GET /api/load/available?location=Chennai`
  - `GET /api/load/available?origin=Dubai`

So: **available loads** = list of shipments that still need a truck.

---

## Step 4: Assign a truck to the load

We have a truck (e.g. "TN-01-AB-1234") and a driver. We decide: "this truck will do the Dubai → Chennai load."

- We **edit that load** and set **assignedTruckId** = id of that truck.
- The system then sets the load status to **assigned**.

```
LOAD: Dubai → Chennai  
  → assignedTruckId = TN-01-AB-1234  
  → status = ASSIGNED
```

So: **assign** = link the load to one truck. That load is no longer "available" (it’s assigned).

---

## Step 5: Delivery done → mark as delivered

When the truck has delivered the goods to Chennai:

- Someone **edits the same load** and sets **status = delivered**.

```
LOAD: Dubai → Chennai  
  → status = DELIVERED
```

Flow for that shipment is finished.

---

## Picture of the full flow

```
1. CREATE LOAD
   "Ship electronics from Dubai to Chennai"
   → Load created, status = PENDING

2. SEE AVAILABLE LOADS
   GET /api/load/available  (or ?location=Chennai)
   → List of PENDING loads (no truck yet)

3. ASSIGN TRUCK
   Edit load: set assignedTruckId = <truck id>
   → Load status = ASSIGNED

4. DELIVERY DONE
   Edit load: set status = delivered
   → Load status = DELIVERED
```

---

## Who does what (simple)

| Person | What they do in the flow |
|--------|---------------------------|
| **Shipper** | Wants to send goods. We store them in the system and can link them to a load (who is sending). |
| **Buyer/Seller** | Receiving/buying. We store them and can link them to a load (who is receiving). |
| **Transport Agent** | Looks at available loads, assigns trucks to loads, manages operations. |
| **Driver** | We register them; we link a truck to a driver. The driver does the actual delivery. |
| **Truck** | The vehicle. We assign a load to a truck so we know which truck is doing which shipment. |

---

## Short summary

1. **Load** = one shipment (from where → to where, weight, etc.).  
2. **Pending** = load exists but no truck assigned.  
3. **Available loads** = API that returns pending loads (optional: filter by location).  
4. **Assign** = set the load’s truck id → status becomes **assigned**.  
5. **Delivered** = set load status to delivered when the job is done.  

Shipper/Buyer/Seller/Agent/Driver are **parties and actors** we keep in the system and **link to loads and trucks** so we know who sent, who receives, and who is driving.

---

## 2. Buyer / Seller Flow

A **buyer or seller** can post a **load request** (what they want to move, from where to where, at what price) and see only **their** requests.

### Step 1: Post a load request

The buyer/seller (logged-in user) submits a request with:

- **Pickup location:** address, lat, lng (e.g. Chennai: 13.0827, 80.2707)
- **Drop location:** address, lat, lng (e.g. Bangalore: 12.9716, 77.5946)
- **Material** (e.g. Steel), **weight**, **truck type** (e.g. Open Truck), **price**, **scheduled date**

**API:** `POST /api/load/add` with body:

```json
{
  "userId": "<current_user_id>",
  "pickupLocation": { "address": "Chennai", "lat": 13.0827, "lng": 80.2707 },
  "dropLocation": { "address": "Bangalore", "lat": 12.9716, "lng": 77.5946 },
  "material": "Steel",
  "weight": 10,
  "truckType": "Open Truck",
  "price": 25000,
  "scheduledDate": "2026-02-25"
}
```

The load is created with `userId` (and optionally `createdBy`) set to the buyer/seller. Status starts as **pending**.

### Step 2: View my load requests

The buyer/seller fetches only the loads they posted or are linked to.

**API:** `GET /api/load/my?userId=<current_user_id>`

Returns loads where `createdBy` or `userId` equals that user.

### Step 3: Cancel a request (optional)

The buyer/seller can cancel a request before it is assigned.

**API:** `DELETE /api/load/delete` with body `{ "ids": ["<load_id>"] }`.

### Summary (Buyer / Seller)

1. **Post** – `POST /api/load/add` with `userId`, `pickupLocation`, `dropLocation`, `material`, `weight`, `truckType`, `price`, `scheduledDate`.
2. **List mine** – `GET /api/load/my?userId=<id>`.
3. **Cancel** – `DELETE /api/load/delete` with the load id(s).

The **frontend** exposes this as the **Buyer/Seller flow** page: one form to post a request and a table of “My load requests” with the option to cancel.
