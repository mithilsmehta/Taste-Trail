# Implementation Plan - Grocery & Meal Management System

## Overview
This implementation plan breaks down the Grocery & Meal Management System into discrete, actionable coding tasks. Each task builds incrementally on previous work.

---

- [ ] 1. Set up backend database models and schemas
  - Create MealPlan model with userId, mealType, recipe, time fields
  - Create GroceryItem model with userId, name, mealType, marked fields
  - Create UserSettings model with mealTimes and notification preferences
  - Add proper indexes for performance (userId, mealType)
  - _Requirements: 6.1, 2.2, 9.4_

- [ ] 2. Implement backend API routes for meal plans
  - [ ] 2.1 Create POST /api/meal-plans/create endpoint
    - Accept mealType, recipeId, time in request body
    - Validate meal type is one of: breakfast, lunch, dinner
    - Save meal plan to database with user authentication
    - Return created meal plan
    - _Requirements: 1.3, 6.1_

  - [ ] 2.2 Create GET /api/meal-plans/my endpoint
    - Fetch all meal plans for authenticated user
    - Return organized by meal type (breakfast, lunch, dinner)
    - _Requirements: 1.1, 6.2_

  - [ ] 2.3 Create PUT /api/meal-plans/:id endpoint
    - Update existing meal plan
    - Validate ownership before updating
    - _Requirements: 6.3_

  - [ ] 2.4 Create DELETE /api/meal-plans/:id endpoint
    - Delete meal plan and associated grocery items
    - Validate ownership before deletion
    - _Requirements: 6.4_

- [ ] 3. Implement backend API routes for grocery list
  - [ ] 3.1 Create GET /api/grocery/list endpoint
    - Fetch all grocery items from user's meal plans
    - Extract unique ingredients from all meals
    - Return with marked status
    - _Requirements: 4.1, 7.1_

  - [ ] 3.2 Create PUT /api/grocery/mark/:itemId endpoint
    - Toggle marked status of ingredient
    - Persist marked state to database
    - _Requirements: 4.2, 4.3_

  - [ ] 3.3 Create GET /api/grocery/by-meal/:mealType endpoint
    - Filter grocery items by meal type
    - Return filtered list
    - _Requirements: 4.5_

- [ ] 4. Implement backend API routes for user settings
  - [ ] 4.1 Create GET /api/settings/meal-times endpoint
    - Fetch user's meal time settings
    - Return default times if not set
    - _Requirements: 2.2, 2.5_

  - [ ] 4.2 Create PUT /api/settings/meal-times endpoint
    - Update meal times and notification preferences
    - Validate time format (HH:MM)
    - Update notification schedules
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 5. Create MealPlanner frontend component
  - [ ] 5.1 Build MealPlanner page structure
    - Create three meal cards (Breakfast, Lunch, Dinner)
    - Display meal times for each card
    - Add "Add Recipe" button for each meal
    - Style with Bootstrap cards and grid
    - _Requirements: 1.1, 8.1_

  - [ ] 5.2 Implement recipe assignment functionality
    - Create modal to select from saved recipes
    - Call API to assign recipe to meal slot
    - Update UI to show assigned recipe
    - Display recipe name and ingredients
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 5.3 Add meal time editing
    - Add time picker for each meal
    - Validate time format
    - Save time changes to backend
    - _Requirements: 2.1, 2.3_

  - [ ] 5.4 Implement meal plan deletion
    - Add delete button for each meal
    - Confirm before deletion
    - Update UI after deletion
    - _Requirements: 6.4_

  - [ ] 5.5 Load and display existing meal plans
    - Fetch meal plans on component mount
    - Display saved meals in appropriate slots
    - Show loading state while fetching
    - _Requirements: 6.2, 1.5_

- [ ] 6. Create GroceryList frontend component
  - [ ] 6.1 Build grocery list UI
    - Display all ingredients in a list
    - Group by meal type with headers
    - Add filter buttons (All, Breakfast, Lunch, Dinner)
    - Style with cards and badges
    - _Requirements: 4.1, 4.5, 8.2_

  - [ ] 6.2 Implement ingredient marking
    - Add checkbox for each ingredient
    - Toggle marked state on click
    - Visual feedback (strikethrough, color change)
    - Persist marked state to backend
    - _Requirements: 4.2, 4.3, 8.3_

  - [ ] 6.3 Add Blinkit integration buttons
    - Add "Order on Blinkit" button for each ingredient
    - Generate Blinkit deep link with ingredient name
    - URL encode ingredient names properly
    - Open link in new tab/app
    - _Requirements: 5.1, 5.4_

  - [ ] 6.4 Implement mobile Blinkit deep linking
    - Detect mobile device
    - Attempt to open Blinkit app first
    - Fallback to browser if app not installed
    - Use timeout for app detection
    - _Requirements: 5.2, 5.3_

  - [ ] 6.5 Add filtering functionality
    - Filter ingredients by meal type
    - Update UI based on selected filter
    - Show count of items per filter
    - _Requirements: 4.5, 8.2_

- [ ] 7. Create MealTimeSettings component
  - [ ] 7.1 Build settings page UI
    - Create form for meal times (Breakfast, Lunch, Dinner)
    - Add time input fields
    - Add notification offset selector (30 min / 1 hour)
    - Style with Bootstrap form components
    - _Requirements: 2.1, 3.1, 8.1_

  - [ ] 7.2 Implement settings save functionality
    - Validate time inputs
    - Call API to save settings
    - Show success/error messages
    - Update notification schedules
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 7.3 Load existing settings
    - Fetch settings on component mount
    - Populate form with saved values
    - Show default values if not set
    - _Requirements: 2.2, 2.5_

- [ ] 8. Implement notification system
  - [ ] 8.1 Create NotificationManager service
    - Request browser notification permissions
    - Handle permission granted/denied states
    - Store permission state in localStorage
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ] 8.2 Implement notification scheduling
    - Calculate notification time based on meal time and offset
    - Schedule notifications using setTimeout
    - Handle multiple meal notifications
    - Reschedule on settings change
    - _Requirements: 3.1, 2.4, 3.5_

  - [ ] 8.3 Create notification content
    - Format notification title with meal name
    - Include ingredients list in body
    - Add notification icon
    - Set notification tag for uniqueness
    - _Requirements: 3.2_

  - [ ] 8.4 Handle notification clicks
    - Navigate to meal planner page on click
    - Focus window if already open
    - _Requirements: 3.3_

  - [ ] 8.5 Add permission denied UI
    - Show instructions for enabling notifications
    - Provide link to browser settings
    - Display current permission status
    - _Requirements: 9.3_

- [ ] 9. Add navigation and routing
  - [ ] 9.1 Update Navbar component
    - Add "Meal Planner" link
    - Add "Grocery List" link
    - Position before Profile button
    - Add icons for visual clarity
    - _Requirements: 8.1_

  - [ ] 9.2 Add routes to App.jsx
    - Add /meal-planner route
    - Add /grocery-list route
    - Add /meal-settings route
    - Wrap with ProtectedRoute
    - _Requirements: 8.1_

- [ ] 10. Integrate with existing recipe system
  - [ ] 10.1 Update SavedRecipes to support meal assignment
    - Add "Add to Meal Plan" button on recipe cards
    - Show modal to select meal type
    - Call meal plan API to assign recipe
    - Show success message
    - _Requirements: 1.2, 7.1_

  - [ ] 10.2 Update SearchResults to support meal assignment
    - Add "Add to Meal Plan" button after saving recipe
    - Allow direct assignment from search results
    - _Requirements: 1.2, 7.1_

- [ ] 11. Add CSS styling and animations
  - Create MealPlanner.css with card styles
  - Create GroceryList.css with list and button styles
  - Add hover effects and transitions
  - Ensure mobile responsiveness
  - Add loading spinners and skeletons
  - _Requirements: 8.3_

- [ ] 12. Implement error handling and loading states
  - Add try-catch blocks to all API calls
  - Display user-friendly error messages
  - Add loading spinners during API calls
  - Handle network errors gracefully
  - Add retry mechanisms for failed requests
  - _Requirements: 8.3_

- [ ] 13. Add data persistence and caching
  - Cache meal plans in component state
  - Implement optimistic UI updates
  - Sync with backend on changes
  - Handle offline scenarios
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 14. Testing and validation
  - Test meal plan CRUD operations
  - Test grocery list marking functionality
  - Test Blinkit link generation
  - Test notification scheduling
  - Test on mobile devices
  - Test permission flows
  - Verify all requirements are met

- [ ] 15. Final polish and optimization
  - Optimize API calls (reduce redundant requests)
  - Add loading skeletons
  - Improve error messages
  - Add helpful tooltips
  - Ensure accessibility (ARIA labels, keyboard navigation)
  - Test cross-browser compatibility
  - _Requirements: 8.1, 8.3_

---

## Notes

- Each task should be completed and tested before moving to the next
- Backend tasks (1-4) should be completed before frontend tasks (5-8)
- Notification system (8) can be developed in parallel with UI components
- Integration tasks (10) should be done after core functionality is complete
- Testing (14) should be ongoing throughout development
