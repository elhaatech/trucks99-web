# UI Features Location Guide

Where each API flow is implemented in `itruck_ui`:

---

## Transporter Page (Single Page for All Driver Flows)

| View | Purpose |
|------|---------|
| **Assigned loads** | Select driver → see assigned loads → Accept/Reject, Update location |
| **Nearby loads** | Enter lat/lng/radius → Search nearby loads |
| **Drivers** | Add/Edit/Delete drivers, Update location |

All driver-related features in one place: `/dashboard/transporter`

---

## 6. Get Nearby Loads

**API:** `GET http://localhost:3001/api/load/nearby?latitude=13.0827&longitude=80.2707&radiusKm=50`

**Location in UI:**
- **Sidebar:** Click **Transporter**
- **Page:** Transporter / Driver
- **Flow:**
  1. Click **"Nearby loads"** button (next to "Assigned loads")
  2. Enter **Latitude** (default: 13.0827), **Longitude** (default: 80.2707), **Radius (km)** (default: 50)
  3. Click **"Search"** to fetch nearby loads
- **File:** `itruck_ui/app/dashboard/transporter/page.tsx`
- **API call:** `getLoadsNearby(latitude, longitude, radiusKm)`

---

## 7. Get Notifications

**API:** `GET http://localhost:3001/api/notification`

**Location in UI:**
- **Sidebar:** Click **Notifications** (envelope icon)
- **Page:** Notifications
- **Flow:** Page loads automatically and fetches notifications for the logged-in user
- **File:** `itruck_ui/app/dashboard/notifications/page.tsx`
- **API call:** `getNotifications()`
- **Also used in:** Dashboard layout (sidebar badge shows unread count) — `itruck_ui/app/dashboard/layout.tsx`

---

## 8. Mark Notification Read

**API:** `PUT http://localhost:3001/api/notification/NOTIF123/read` (replace NOTIF123 with notification ID)

**Location in UI:**
- **Sidebar:** Click **Notifications**
- **Page:** Notifications
- **Flow:** Each unread notification has a **"Mark read"** button on the right. Click it to mark that notification as read.
- **File:** `itruck_ui/app/dashboard/notifications/page.tsx`
- **API call:** `markNotificationRead(id)`

---

## 9. Mark All Notifications Read

**API:** `PUT http://localhost:3001/api/notification/read-all` with `Content-Type: application/json`

**Location in UI:**
- **Sidebar:** Click **Notifications**
- **Page:** Notifications
- **Flow:** When there are unread notifications, a **"Mark all read"** button appears in the page header (top right). Click it to mark all as read.
- **File:** `itruck_ui/app/dashboard/notifications/page.tsx`
- **API call:** `markAllNotificationsRead()`

---

## Summary

| Feature | UI Location | How to Access |
|---------|-------------|---------------|
| Get Nearby Loads | Transporter page | Sidebar → Transporter → Nearby loads → Enter lat/lng/radius → Search |
| Get Notifications | Notifications page | Sidebar → Notifications |
| Mark Notification Read | Notifications page | "Mark read" button on each unread notification |
| Mark All Notifications Read | Notifications page | "Mark all read" button (when unread exist) |
