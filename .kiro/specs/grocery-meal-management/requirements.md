# Requirements Document - Grocery & Meal Management System

## Introduction

This document outlines the requirements for a comprehensive Grocery and Meal Management System integrated with Blinkit for ordering groceries. The system allows users to plan meals, manage grocery lists, receive timely notifications, and seamlessly order ingredients through Blinkit.

## Glossary

- **Meal Plan**: A scheduled meal (breakfast, lunch, or dinner) with associated recipe and ingredients
- **Grocery List**: A collection of ingredients needed for planned meals
- **Meal Time**: User-configured time for breakfast, lunch, or dinner
- **Notification**: An alert sent to the user before their scheduled meal time
- **Blinkit**: A grocery delivery service integrated for ordering ingredients
- **Deep Link**: A URL that opens the Blinkit mobile app if installed, otherwise opens in browser
- **Mark**: Action to indicate an ingredient has been purchased or is available
- **Ingredient**: A food item required for a recipe

## Requirements

### Requirement 1: Meal Planning

**User Story:** As a user, I want to plan my meals for breakfast, lunch, and dinner, so that I can organize my daily cooking schedule.

#### Acceptance Criteria

1. WHEN a user accesses the meal planner THEN the system SHALL display three meal categories: Breakfast, Lunch, and Dinner
2. WHEN a user selects a meal category THEN the system SHALL allow the user to assign a recipe to that meal slot
3. WHEN a user assigns a recipe to a meal THEN the system SHALL save the meal plan and display the recipe name
4. WHEN a user views a meal plan THEN the system SHALL display all ingredients required for that meal
5. WHERE a meal plan exists THEN the system SHALL persist the meal plan across sessions

### Requirement 2: Meal Time Configuration

**User Story:** As a user, I want to set specific times for my meals, so that I can receive timely reminders.

#### Acceptance Criteria

1. WHEN a user configures meal times THEN the system SHALL allow setting time for breakfast, lunch, and dinner
2. WHEN a user saves meal times THEN the system SHALL store the times in the user profile
3. WHEN meal times are configured THEN the system SHALL validate that times are in valid 24-hour or 12-hour format
4. WHEN a user updates meal times THEN the system SHALL update notification schedules accordingly
5. WHERE no meal times are set THEN the system SHALL use default times (Breakfast: 8:00 AM, Lunch: 1:00 PM, Dinner: 8:00 PM)

### Requirement 3: Notification System

**User Story:** As a user, I want to receive notifications before my meal times, so that I can prepare my meals on time.

#### Acceptance Criteria

1. WHEN a meal time approaches THEN the system SHALL send a notification 30 minutes or 1 hour before the scheduled time
2. WHEN a notification is sent THEN the system SHALL include the meal name and ingredients list
3. WHEN a user clicks a notification THEN the system SHALL navigate to the meal plan page
4. WHERE a meal plan exists for a time slot THEN the system SHALL send notifications for that meal
5. WHEN notification preferences are changed THEN the system SHALL update the notification schedule immediately

### Requirement 4: Grocery List Management

**User Story:** As a user, I want to manage my grocery list with ingredients from my meal plans, so that I know what to purchase.

#### Acceptance Criteria

1. WHEN a user views the grocery list THEN the system SHALL display all ingredients from all planned meals
2. WHEN a user marks an ingredient THEN the system SHALL visually indicate the ingredient as purchased
3. WHEN an ingredient is marked THEN the system SHALL persist the marked state
4. WHEN a user unmarks an ingredient THEN the system SHALL remove the purchased indicator
5. WHEN ingredients are displayed THEN the system SHALL group them by meal type (Breakfast, Lunch, Dinner)

### Requirement 5: Blinkit Integration

**User Story:** As a user, I want to order ingredients directly through Blinkit, so that I can quickly purchase what I need.

#### Acceptance Criteria

1. WHEN a user clicks the Blinkit button for an ingredient THEN the system SHALL generate a Blinkit deep link with the ingredient name
2. WHEN the Blinkit link is opened on mobile THEN the system SHALL attempt to open the Blinkit app
3. IF the Blinkit app is not installed THEN the system SHALL open the Blinkit website in the browser
4. WHEN generating Blinkit links THEN the system SHALL use the format: https://blinkit.com/s/?q={ingredient}
5. WHEN multiple ingredients are selected THEN the system SHALL allow batch ordering through Blinkit

### Requirement 6: Persistent Meal Plans

**User Story:** As a user, I want my meal plans to be saved automatically, so that I don't have to recreate them every time.

#### Acceptance Criteria

1. WHEN a user creates a meal plan THEN the system SHALL save it to the database
2. WHEN a user returns to the app THEN the system SHALL load previously saved meal plans
3. WHEN a user updates a meal plan THEN the system SHALL update the database immediately
4. WHEN a user deletes a meal plan THEN the system SHALL remove it from the database
5. WHERE meal plans exist THEN the system SHALL display them on the meal planner page

### Requirement 7: Ingredient Display and Reusability

**User Story:** As a user, I want to see all ingredients for my saved meals without searching again, so that I can quickly access my meal information.

#### Acceptance Criteria

1. WHEN a user views a saved meal THEN the system SHALL display all ingredients without requiring a new search
2. WHEN ingredients are displayed THEN the system SHALL show ingredient names clearly
3. WHEN a meal is saved THEN the system SHALL store all ingredient information
4. WHEN a user accesses a meal plan THEN the system SHALL retrieve ingredients from storage
5. WHERE ingredients are displayed THEN the system SHALL provide mark and Blinkit buttons for each ingredient

### Requirement 8: User Interface for Meal Management

**User Story:** As a user, I want an intuitive interface for managing my meals and groceries, so that I can easily navigate the system.

#### Acceptance Criteria

1. WHEN a user accesses meal management THEN the system SHALL display a clear navigation menu
2. WHEN viewing the grocery list THEN the system SHALL provide filtering options by meal type
3. WHEN interacting with ingredients THEN the system SHALL provide immediate visual feedback
4. WHEN managing meal plans THEN the system SHALL allow easy editing and deletion
5. WHERE multiple meals are planned THEN the system SHALL display them in an organized layout

### Requirement 9: Browser Notification Permissions

**User Story:** As a user, I want to grant notification permissions, so that I can receive meal reminders.

#### Acceptance Criteria

1. WHEN a user first accesses notifications THEN the system SHALL request browser notification permissions
2. WHEN permissions are granted THEN the system SHALL enable notification scheduling
3. IF permissions are denied THEN the system SHALL display a message explaining how to enable notifications
4. WHEN permissions are granted THEN the system SHALL store the permission state
5. WHERE notifications are enabled THEN the system SHALL display notification settings in user preferences

### Requirement 10: Meal Plan Calendar View

**User Story:** As a user, I want to view my meal plans in a calendar format, so that I can see my weekly meal schedule.

#### Acceptance Criteria

1. WHEN a user accesses the calendar view THEN the system SHALL display meals organized by day and meal type
2. WHEN viewing a specific day THEN the system SHALL show all meals planned for that day
3. WHEN a user clicks on a meal in the calendar THEN the system SHALL display meal details
4. WHEN planning meals THEN the system SHALL allow scheduling for future dates
5. WHERE no meals are planned for a day THEN the system SHALL display an empty state with option to add meals
