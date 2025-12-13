# Design Document - Grocery & Meal Management System

## Overview

The Grocery & Meal Management System is a comprehensive feature that enables users to plan meals, manage grocery lists, receive timely notifications, and seamlessly order ingredients through Blinkit integration. The system consists of frontend React components, backend API endpoints, database models, and a notification service.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  - MealPlanner Component                                     │
│  - GroceryList Component                                     │
│  - MealTimeSettings Component                                │
│  - NotificationManager Service                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Express.js)                    │
├─────────────────────────────────────────────────────────────┤
│  - Meal Plan Routes                                          │
│  - Grocery List Routes                                       │
│  - Notification Routes                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database (MongoDB)                         │
├─────────────────────────────────────────────────────────────┤
│  - MealPlan Collection                                       │
│  - GroceryItem Collection                                    │
│  - UserSettings Collection                                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React, React Router, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Notifications**: Browser Notification API
- **External Integration**: Blinkit Deep Links

## Components and Interfaces

### Frontend Components

#### 1. MealPlanner Component
**Purpose**: Main interface for planning meals

**Props**: None (uses context for user data)

**State**:
```javascript
{
  mealPlans: {
    breakfast: { recipe: Object, time: String },
    lunch: { recipe: Object, time: String },
    dinner: { recipe: Object, time: String }
  },
  loading: Boolean,
  selectedMeal: String
}
```

**Key Functions**:
- `loadMealPlans()`: Fetch user's meal plans from backend
- `assignRecipe(mealType, recipe)`: Assign a recipe to a meal slot
- `updateMealTime(mealType, time)`: Update meal time
- `deleteMealPlan(mealType)`: Remove a meal plan

#### 2. GroceryList Component
**Purpose**: Display and manage grocery items

**Props**: None

**State**:
```javascript
{
  groceryItems: Array<{
    id: String,
    name: String,
    mealType: String,
    marked: Boolean
  }>,
  filter: String, // 'all', 'breakfast', 'lunch', 'dinner'
  loading: Boolean
}
```

**Key Functions**:
- `loadGroceryList()`: Fetch grocery items from meal plans
- `toggleMark(itemId)`: Mark/unmark an ingredient
- `openBlinkit(ingredient)`: Generate and open Blinkit deep link
- `filterByMeal(mealType)`: Filter items by meal type

#### 3. MealTimeSettings Component
**Purpose**: Configure meal times and notification preferences

**Props**: None

**State**:
```javascript
{
  breakfastTime: String,
  lunchTime: String,
  dinnerTime: String,
  notificationOffset: Number, // 30 or 60 minutes
  notificationsEnabled: Boolean
}
```

**Key Functions**:
- `loadSettings()`: Load user's meal time settings
- `updateMealTime(mealType, time)`: Update specific meal time
- `updateNotificationOffset(minutes)`: Set notification timing
- `requestNotificationPermission()`: Request browser permissions

#### 4. NotificationManager Service
**Purpose**: Handle browser notifications

**Methods**:
- `requestPermission()`: Request notification permissions
- `scheduleNotification(mealType, time, offset)`: Schedule a notification
- `sendNotification(title, body, data)`: Send immediate notification
- `cancelNotification(id)`: Cancel scheduled notification
- `checkAndScheduleAll()`: Check all meal times and schedule notifications

### Backend API Endpoints

#### Meal Plan Routes (`/api/meal-plans`)

**POST /api/meal-plans/create**
- Create or update a meal plan
- Body: `{ mealType, recipeId, time }`
- Response: `{ success, mealPlan }`

**GET /api/meal-plans/my**
- Get all meal plans for authenticated user
- Response: `{ breakfast, lunch, dinner }`

**PUT /api/meal-plans/:id**
- Update a specific meal plan
- Body: `{ recipeId, time }`
- Response: `{ success, mealPlan }`

**DELETE /api/meal-plans/:id**
- Delete a meal plan
- Response: `{ success, message }`

#### Grocery List Routes (`/api/grocery`)

**GET /api/grocery/list**
- Get grocery list from all meal plans
- Response: `{ items: Array }`

**PUT /api/grocery/mark/:itemId**
- Mark/unmark an ingredient
- Body: `{ marked: Boolean }`
- Response: `{ success, item }`

**GET /api/grocery/by-meal/:mealType**
- Get grocery items filtered by meal type
- Response: `{ items: Array }`

#### User Settings Routes (`/api/settings`)

**GET /api/settings/meal-times**
- Get user's meal time settings
- Response: `{ breakfastTime, lunchTime, dinnerTime, notificationOffset }`

**PUT /api/settings/meal-times**
- Update meal time settings
- Body: `{ breakfastTime, lunchTime, dinnerTime, notificationOffset }`
- Response: `{ success, settings }`

## Data Models

### MealPlan Model

```javascript
{
  userId: ObjectId (ref: User),
  mealType: String (enum: ['breakfast', 'lunch', 'dinner']),
  recipe: {
    id: String,
    title: String,
    ingredients: Array<String>,
    steps: Array<String>
  },
  time: String, // Format: "HH:MM"
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### GroceryItem Model

```javascript
{
  userId: ObjectId (ref: User),
  name: String,
  mealType: String,
  mealPlanId: ObjectId (ref: MealPlan),
  marked: Boolean,
  createdAt: Date
}
```

### UserSettings Model

```javascript
{
  userId: ObjectId (ref: User),
  mealTimes: {
    breakfast: String, // "08:00"
    lunch: String,     // "13:00"
    dinner: String     // "20:00"
  },
  notificationOffset: Number, // 30 or 60 minutes
  notificationsEnabled: Boolean,
  updatedAt: Date
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Meal Plan Persistence
*For any* meal plan created by a user, retrieving meal plans should return the same meal plan data
**Validates: Requirements 6.1, 6.2**

### Property 2: Ingredient Marking Consistency
*For any* ingredient marked as purchased, subsequent retrievals should show the marked state until explicitly unmarked
**Validates: Requirements 4.2, 4.3**

### Property 3: Notification Timing Accuracy
*For any* meal time configured, notifications should be scheduled exactly at the specified offset (30 or 60 minutes) before the meal time
**Validates: Requirements 3.1**

### Property 4: Blinkit Link Format
*For any* ingredient name, the generated Blinkit link should follow the format `https://blinkit.com/s/?q={encoded_ingredient}`
**Validates: Requirements 5.1, 5.4**

### Property 5: Meal Time Validation
*For any* meal time input, the system should accept only valid time formats (HH:MM in 24-hour or 12-hour with AM/PM)
**Validates: Requirements 2.3**

### Property 6: Grocery List Completeness
*For any* set of meal plans, the grocery list should contain all unique ingredients from all meals
**Validates: Requirements 4.1, 7.1**

### Property 7: Meal Plan Update Consistency
*For any* meal plan update, the grocery list should reflect the new ingredients immediately
**Validates: Requirements 6.3, 7.3**

### Property 8: Notification Permission State
*For any* notification permission request, the system should correctly store and retrieve the permission state
**Validates: Requirements 9.1, 9.4**

## Error Handling

### Frontend Error Handling

1. **Network Errors**: Display user-friendly messages with retry options
2. **Permission Denied**: Show instructions for enabling notifications
3. **Invalid Time Format**: Validate input and show format requirements
4. **Failed API Calls**: Log errors and display fallback UI

### Backend Error Handling

1. **Database Connection Errors**: Return 503 Service Unavailable
2. **Invalid Input**: Return 400 Bad Request with validation errors
3. **Unauthorized Access**: Return 401 Unauthorized
4. **Resource Not Found**: Return 404 Not Found
5. **Server Errors**: Return 500 Internal Server Error with generic message

## Blinkit Integration Details

### Deep Link Implementation

**URL Format**: `https://blinkit.com/s/?q={ingredient}`

**Encoding**: URL-encode ingredient names to handle spaces and special characters

**Example**:
- Ingredient: "red onion"
- Link: `https://blinkit.com/s/?q=red%20onion`

**Mobile Detection**:
```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const blinkitLink = `https://blinkit.com/s/?q=${encodeURIComponent(ingredient)}`;

if (isMobile) {
  // Attempt to open app with intent/universal link
  window.location.href = `blinkit://search?q=${encodeURIComponent(ingredient)}`;
  
  // Fallback to web after 2 seconds if app doesn't open
  setTimeout(() => {
    window.location.href = blinkitLink;
  }, 2000);
} else {
  // Desktop: open in new tab
  window.open(blinkitLink, '_blank');
}
```

## Notification System Implementation

### Browser Notification API

**Permission Request**:
```javascript
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}
```

**Scheduling Logic**:
```javascript
function scheduleNotification(mealType, mealTime, offsetMinutes) {
  const [hours, minutes] = mealTime.split(':');
  const mealDate = new Date();
  mealDate.setHours(hours, minutes, 0, 0);
  
  const notificationTime = new Date(mealDate.getTime() - offsetMinutes * 60000);
  const now = new Date();
  
  if (notificationTime > now) {
    const delay = notificationTime.getTime() - now.getTime();
    setTimeout(() => {
      sendNotification(mealType);
    }, delay);
  }
}
```

**Notification Content**:
```javascript
function sendNotification(mealType, ingredients) {
  new Notification(`Time to prepare ${mealType}!`, {
    body: `Ingredients needed: ${ingredients.join(', ')}`,
    icon: '/meal-icon.png',
    badge: '/badge-icon.png',
    tag: `meal-${mealType}`,
    requireInteraction: false
  });
}
```

## Testing Strategy

### Unit Tests
- Test meal plan CRUD operations
- Test grocery item marking/unmarking
- Test time validation functions
- Test Blinkit link generation
- Test notification scheduling logic

### Integration Tests
- Test meal plan creation and grocery list generation
- Test notification scheduling with meal time updates
- Test Blinkit link opening on different devices

### Property-Based Tests
- Test that all meal plans persist correctly (Property 1)
- Test ingredient marking consistency (Property 2)
- Test notification timing accuracy (Property 3)
- Test Blinkit link format for various ingredient names (Property 4)
- Test meal time validation with random inputs (Property 5)
- Test grocery list completeness with various meal combinations (Property 6)

## UI/UX Design

### Meal Planner Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (with Meal Planner link)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📅 My Meal Planner                                     │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  🍳 Breakfast │  │  🍱 Lunch    │  │  🍽️ Dinner   │ │
│  │  Time: 08:00  │  │  Time: 13:00 │  │  Time: 20:00 │ │
│  │              │  │              │  │              │ │
│  │  [Recipe]    │  │  [Recipe]    │  │  [Recipe]    │ │
│  │  [+ Add]     │  │  [+ Add]     │  │  [+ Add]     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  🛒 Grocery List                                        │
│  ─────────────────────────────────────────────────────  │
│  Filter: [All] [Breakfast] [Lunch] [Dinner]            │
│                                                          │
│  ☐ Onion          [Blinkit]                            │
│  ☑ Tomato         [Blinkit]                            │
│  ☐ Chicken        [Blinkit]                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Color Scheme
- Primary: #FFC107 (Yellow/Warning)
- Success: #28A745 (Green for marked items)
- Blinkit Brand: #F8CB46 (Yellow)
- Background: #F8F9FA (Light gray)

## Security Considerations

1. **Authentication**: All API endpoints require valid JWT token
2. **Authorization**: Users can only access their own meal plans and grocery lists
3. **Input Validation**: Sanitize all user inputs to prevent XSS and injection attacks
4. **Rate Limiting**: Implement rate limiting on API endpoints
5. **HTTPS**: Ensure all communications use HTTPS in production

## Performance Optimization

1. **Caching**: Cache meal plans and grocery lists in frontend state
2. **Lazy Loading**: Load meal details only when needed
3. **Debouncing**: Debounce search and filter operations
4. **Pagination**: Implement pagination for large grocery lists
5. **Indexing**: Add database indexes on userId and mealType fields

## Future Enhancements

1. **Meal Plan Templates**: Pre-made meal plans for common diets
2. **Nutritional Information**: Display calories and macros
3. **Shopping History**: Track purchased items over time
4. **Recipe Suggestions**: AI-powered recipe recommendations
5. **Multi-day Planning**: Plan meals for entire week
6. **Shared Meal Plans**: Share meal plans with family members
7. **Budget Tracking**: Track grocery spending
8. **Barcode Scanning**: Scan items to add to grocery list
