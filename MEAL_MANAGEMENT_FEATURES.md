# 🍽️ Meal Management & Grocery Features

## Overview
Complete meal planning and grocery management system with Blinkit integration and smart notifications.

---

## ✨ Features Implemented

### 1. 📅 Meal Planner
**Location:** `/meal-planner`

**Features:**
- Plan meals for Breakfast, Lunch, and Dinner
- Assign saved recipes to meal slots
- Set custom meal times
- View and manage all meal plans in one place
- Quick access to grocery list

**How to Use:**
1. Click "📅 Meal Planner" in the navbar
2. Click "+ Add Recipe" on any meal card
3. Select a recipe from your saved recipes
4. Recipe is automatically assigned with default time
5. View, change, or remove meals anytime

---

### 2. 🛒 Grocery List
**Location:** `/grocery-list`

**Features:**
- Automatic grocery list from all meal plans
- Mark ingredients as purchased (checkbox)
- Filter by meal type (All, Breakfast, Lunch, Dinner)
- **Blinkit Integration** - Order ingredients directly
- Grouped by meal type for easy shopping

**How to Use:**
1. Click "🛒 Grocery List" in the navbar
2. View all ingredients from your meal plans
3. Check off items as you purchase them
4. Click "Order on Blinkit" to buy ingredients

**Blinkit Integration:**
- **Mobile:** Opens Blinkit app if installed, otherwise browser
- **Desktop:** Opens Blinkit website in new tab
- **Direct Search:** Each ingredient links to Blinkit search
- **Format:** `https://blinkit.com/s/?q={ingredient}`

---

### 3. ⚙️ Meal Settings
**Location:** `/meal-settings`

**Features:**
- Set custom times for each meal
- Configure notification timing (30 min or 1 hour before)
- Enable/disable browser notifications
- View notification status

**How to Use:**
1. Go to Meal Planner → Click "⚙️ Meal Settings"
2. Set your preferred meal times
3. Choose notification offset (30 or 60 minutes)
4. Click "Enable Notifications" to allow browser notifications
5. Save settings

---

### 4. 🔔 Smart Notifications
**Features:**
- Browser notifications before meal times
- Configurable timing (30 min or 1 hour before)
- Shows meal name and ingredients
- Click notification to go to meal planner
- Automatic daily scheduling

**How Notifications Work:**
1. Set meal times in settings
2. Enable browser notifications
3. System automatically schedules notifications
4. Receive reminders before each meal
5. Notifications repeat daily

**Notification Content:**
- Title: "Time to prepare {meal}! 🍽️"
- Body: "Ingredients: {first 3 ingredients}..."
- Click to open meal planner

---

### 5. 📝 Add to Meal Plan (from Saved Recipes)
**Location:** `/saved` (Saved Recipes page)

**Features:**
- Add any saved recipe directly to meal plan
- Choose which meal (Breakfast/Lunch/Dinner)
- One-click assignment

**How to Use:**
1. Go to Saved Recipes
2. Click "📅 Add to Meal Plan" on any recipe
3. Select meal type (Breakfast, Lunch, or Dinner)
4. Recipe is instantly added to your meal plan

---

## 🎯 User Flow

### Complete Workflow:
```
1. Search & Save Recipes
   ↓
2. Add Recipes to Meal Plan
   ↓
3. Set Meal Times & Notifications
   ↓
4. View Grocery List
   ↓
5. Mark Items & Order on Blinkit
   ↓
6. Receive Meal Reminders
   ↓
7. Prepare & Enjoy!
```

---

## 🔧 Technical Implementation

### Backend (Node.js + Express + MongoDB)

**Models:**
- `MealPlan` - Stores meal plans with recipe and time
- `GroceryItem` - Stores individual grocery items
- `UserSettings` - Stores meal times and notification preferences

**API Endpoints:**
```
POST   /api/meal-plans/create      - Create/update meal plan
GET    /api/meal-plans/my          - Get all user's meal plans
PUT    /api/meal-plans/:id         - Update meal plan
DELETE /api/meal-plans/:id         - Delete meal plan

GET    /api/grocery/list           - Get all grocery items
PUT    /api/grocery/mark/:itemId   - Mark/unmark ingredient
GET    /api/grocery/by-meal/:type  - Filter by meal type

GET    /api/settings/meal-times    - Get user settings
PUT    /api/settings/meal-times    - Update settings
```

### Frontend (React)

**Components:**
- `MealPlanner.jsx` - Main meal planning interface
- `GroceryList.jsx` - Grocery list with Blinkit integration
- `MealSettings.jsx` - Settings configuration
- `NotificationManager.js` - Notification service

**Key Features:**
- Real-time updates
- Optimistic UI updates
- Mobile-responsive design
- Browser Notification API integration
- Deep linking for Blinkit

---

## 📱 Blinkit Integration Details

### How It Works:

**URL Format:**
```
https://blinkit.com/s/?q={ingredient}
```

**Mobile Detection:**
```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  // Try app first
  window.location.href = `blinkit://search?q=${ingredient}`;
  
  // Fallback to web after 2 seconds
  setTimeout(() => {
    window.location.href = blinkitLink;
  }, 2000);
} else {
  // Desktop: open in new tab
  window.open(blinkitLink, '_blank');
}
```

**Examples:**
- Onion: `https://blinkit.com/s/?q=onion`
- Red Onion: `https://blinkit.com/s/?q=red%20onion`
- Chicken Breast: `https://blinkit.com/s/?q=chicken%20breast`

---

## 🔔 Notification System

### Browser Notification API

**Permission Request:**
```javascript
const permission = await Notification.requestPermission();
// Returns: 'granted', 'denied', or 'default'
```

**Scheduling Logic:**
```javascript
// Calculate notification time
const mealTime = "13:00"; // 1:00 PM
const offset = 30; // 30 minutes before

const notificationTime = mealTime - offset;
// Notification at 12:30 PM
```

**Notification Object:**
```javascript
new Notification("Time to prepare lunch! 🍽️", {
  body: "Ingredients: Chicken, Rice, Vegetables...",
  icon: "/meal-icon.png",
  tag: "meal-lunch",
  requireInteraction: false
});
```

---

## 🎨 UI/UX Highlights

### Design Features:
- **Color Scheme:** Yellow (#FFC107) primary, Green for success
- **Icons:** Emojis for visual clarity (🍳 🍱 🍽️ 🛒)
- **Animations:** Smooth transitions and hover effects
- **Responsive:** Works on mobile, tablet, and desktop
- **Accessibility:** Proper labels and keyboard navigation

### User Experience:
- **One-Click Actions:** Quick recipe assignment
- **Visual Feedback:** Immediate UI updates
- **Clear Navigation:** Breadcrumb-style back buttons
- **Empty States:** Helpful messages when no data
- **Loading States:** Spinners during API calls

---

## 🚀 Getting Started

### For Users:

1. **Plan Your Meals:**
   - Go to Meal Planner
   - Add recipes to breakfast, lunch, dinner

2. **Set Your Schedule:**
   - Go to Meal Settings
   - Set your meal times
   - Enable notifications

3. **Shop for Groceries:**
   - Go to Grocery List
   - Mark items as you shop
   - Order missing items on Blinkit

4. **Get Reminders:**
   - Receive notifications before meals
   - Click to view meal details
   - Prepare and enjoy!

---

## 📊 Data Flow

```
User Creates Meal Plan
        ↓
Backend Saves to MongoDB
        ↓
Generates Grocery Items
        ↓
User Views Grocery List
        ↓
User Marks Items / Orders on Blinkit
        ↓
Notification Service Schedules Reminders
        ↓
User Receives Timely Notifications
```

---

## 🔐 Security

- **Authentication:** All endpoints require JWT token
- **Authorization:** Users can only access their own data
- **Input Validation:** Time format and meal type validation
- **XSS Protection:** Input sanitization
- **HTTPS:** Secure communication in production

---

## 🎯 Future Enhancements

1. **Weekly Meal Planning:** Plan entire week at once
2. **Nutritional Info:** Calories and macros
3. **Shopping History:** Track purchases over time
4. **Recipe Suggestions:** AI-powered recommendations
5. **Shared Meal Plans:** Family meal planning
6. **Budget Tracking:** Monitor grocery spending
7. **Barcode Scanning:** Quick item addition
8. **Meal Templates:** Pre-made meal plans

---

## 📝 Notes

- Notifications require browser permission
- Blinkit app must be installed for app deep linking
- Grocery list updates automatically when meal plans change
- Marked items persist across sessions
- Notifications reschedule daily automatically

---

## 🐛 Troubleshooting

**Notifications Not Working:**
1. Check browser permissions (click lock icon in address bar)
2. Ensure notifications are enabled in settings
3. Try the "Test Notification" feature

**Blinkit Not Opening:**
1. Check if Blinkit app is installed (mobile)
2. Try opening link manually
3. Clear browser cache

**Grocery List Empty:**
1. Ensure you have meal plans created
2. Check that recipes have ingredients
3. Refresh the page

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review the spec files in `.kiro/specs/grocery-meal-management/`
3. Contact support

---

**Enjoy your meal planning experience! 🍽️✨**
