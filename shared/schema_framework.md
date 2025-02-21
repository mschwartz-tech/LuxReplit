# Updated LuxReplit Database Schema for Gym Management

This schema adapts the LuxReplit app (assumed from https://github.com/mschwartz-tech/LuxReplit) to support gym management, preserving original functionality (user auth, content) while adding gym-specific features from your app. Tables are designed for SQLite compatibility, with logic explanations for AI guidance.

**Current Date**: February 21, 2025

---

## Tables

### 1. Users Table
Central table for all users, replacing LuxReplit’s Users.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `user_id`       | Integer     | Primary Key, Autoincrement      | Unique identifier for each user      | Aligns with SQLite’s autoincrement; links to all role-specific tables.           |
| `username`      | String      | Not Null, Unique                | Username for login                   | Retained from LuxReplit for simplicity; supplements email login.                 |
| `email`         | String      | Not Null, Unique                | User's email (alternate login)       | Unique identifier for login; ensures no duplicate accounts.                      |
| `password_hash` | String      | Not Null                        | Hashed password for authentication   | Uses bcrypt or similar (LuxReplit style); ensures secure login.                  |
| `role`          | String      | Not Null ('admin', 'trainer', 'member') | User's primary role                | Defines access level; assumes single role unless `User_Roles` is added.          |
| `phone`         | String      | Optional                        | User's phone number                  | Optional for notifications or outreach; enhances UX.                             |
| `address`       | String      | Optional                        | User's address                       | Optional for shipping merchandise; critical for product sales.                   |

- **Purpose**: Combines LuxReplit’s user auth with your gym roles.
- **Notes**: Drop LuxReplit’s `Users` and replace with this; add `User_Roles` for multi-role support if needed.

### 2. User_Roles Table (Optional)
Junction table for multiple roles.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `user_role_id`  | Integer     | Primary Key, Autoincrement      | Unique identifier for each user-role | Unique ID for tracking role assignments.                                         |
| `user_id`       | Integer     | Foreign Key (Users)             | Links to the `Users` table           | Ties role to a specific user; core relational link.                              |
| `role_type`     | String      | Not Null ('admin', 'trainer', 'member') | Specific role assigned             | Defines the role; allows multiple roles per user.                                |
|                 |             | Unique (user_id, role_type)     |                                      | Prevents duplicate role assignments for the same user.                           |

### 3. Admins Table
Specific data for admins.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `admin_id`      | Integer     | Primary Key, Autoincrement      | Unique identifier for each admin     | Unique ID for admins to track them separately from other roles.                  |
| `user_id`       | Integer     | Foreign Key (Users), Unique     | Links to the `Users` table           | Ties admin-specific data to the central user record; ensures one role per user.  |

### 4. Trainers Table
Specific data for trainers.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `trainer_id`    | Integer     | Primary Key, Autoincrement      | Unique identifier for each trainer   | Unique ID for trainers to manage their records and link to sessions.             |
| `user_id`       | Integer     | Foreign Key (Users), Unique     | Links to the `Users` table           | Ties trainer data to the central user record; ensures one role per user.         |
| `location_id`   | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Ties trainer to a specific gym branch; reflects where they work.                 |
| `certification` | String      | Optional                        | Trainer's certification details      | Tracks qualifications for credibility and filtering (e.g., specialization search). |
| `specialization`| String      | Optional                        | Trainer's area of expertise          | Helps match trainers to members’ goals; optional as not all may specialize.      |
| `hourly_rate`   | Real        | Optional                        | Trainer's hourly rate for sessions   | Enables session cost calculation; uses Real for SQLite compatibility.            |

### 5. Members Table
Specific data for members.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `member_id`     | Integer     | Primary Key, Autoincrement      | Unique identifier for each member    | Unique ID for members to track their records and link to memberships/sessions.   |
| `user_id`       | Integer     | Foreign Key (Users), Unique     | Links to the `Users` table           | Ties member data to the central user record; ensures one role per user.          |
| `location_id`   | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Ties member to a home gym branch; reflects their primary registration location.  |
| `join_date`     | DateTime    | Not Null                        | Date the member joined the gym       | Tracks membership tenure for analytics (e.g., retention rates); SQLite DateTime. |
| `fitness_goals` | Text        | Optional                        | Member's fitness goals               | Helps trainers tailor sessions; optional as not all members may specify goals.   |

### 6. Locations Table
Manages gym branches.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `location_id`   | Integer     | Primary Key, Autoincrement      | Unique identifier for each location  | Ensures each gym branch has a unique ID for referencing across the system.       |
| `name`          | String      | Not Null                        | Name of the location (e.g., "Downtown Gym") | Identifies the branch for users and admins; human-readable identifier.           |
| `address`       | String      | Not Null                        | Physical address of the location     | Necessary for members to locate the gym and for legal/business purposes.         |
| `phone`         | String      | Optional                        | Contact number for the location      | Provides a way for users to contact the gym; optional as not all may have one.   |
| `timezone`      | String      | Not Null, Default 'UTC'         | Time zone of the location            | Ensures accurate time handling; app converts to UTC for storage.                 |

### 7. Trainer_Members Table
Manages trainer-client assignments.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `assignment_id` | Integer     | Primary Key, Autoincrement      | Unique identifier for each assignment| Unique ID for tracking trainer-member relationships.                             |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties assignment to a specific trainer; core relational link.                     |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties assignment to a specific member; core relational link.                      |
| `assigned_at`   | DateTime    | Not Null                        | Date/time of assignment              | Tracks when the admin assigned the member to the trainer; useful for auditing.   |
| `status`        | String      | Not Null ('active', 'inactive') | Status of the assignment             | Indicates if the assignment is currently active; allows deactivation.            |
|                 |             | Unique (trainer_id, member_id)  |                                      | Prevents duplicate assignments of the same member to the same trainer.           |

### 8. Membership_Types Table
Defines membership plans.

| Field                 | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `membership_type_id`  | Integer     | Primary Key, Autoincrement      | Unique identifier for each type      | Unique ID for each membership plan to reference across the system.               |
| `location_id`         | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Ties pricing to a specific location; allows different fees per branch.           |
| `type_name`           | String      | Not Null                        | Name of the membership type          | Human-readable identifier (e.g., "Basic", "Premium") for users and admins.       |
| `description`         | Text        | Optional                        | Details about the membership type    | Provides clarity on benefits (e.g., "Includes 5 sessions"); enhances UX.         |
| `fee`                 | Real        | Not Null                        | Cost of the membership at this location | Location-specific pricing; uses Real for SQLite compatibility.                   |
| `duration`            | Integer     | Not Null                        | Duration in days (e.g., 30 for monthly) | Defines membership validity period; used to calculate `end_date` in `Memberships`. |
| `multi_location_access` | Integer   | Not Null, Default 0             | Allows access to all locations (0/1) | SQLite uses Integer for Boolean; 1 = true, triggers `Member_Location_Access`.    |

### 9. Memberships Table
Tracks memberships.

| Field                 | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `membership_id`       | Integer     | Primary Key, Autoincrement      | Unique identifier for each membership| Unique ID for tracking individual memberships and linking to payments.           |
| `member_id`           | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties membership to a specific member; core relational link.                      |
| `membership_type_id`  | Integer     | Foreign Key (Membership_Types)  | Links to the `Membership_Types` table| Specifies the plan type and pricing; ensures location-specific consistency.     |
| `location_id`         | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Clarifies where the membership applies; aligns with `Membership_Types.location_id`. |
| `start_date`          | DateTime    | Not Null                        | Start date of the membership         | Defines when the membership begins; used for validity checks.                    |
| `end_date`            | DateTime    | Not Null                        | End date of the membership           | Defines when the membership expires; calculated as `start_date + duration`.      |
| `payment_status`      | String      | Optional ('pending', 'paid', etc.) | Status of payment for this membership| Tracks payment progress; critical for access control and revenue management.     |
| `deleted_at`          | DateTime    | Optional                        | Date/time of soft deletion           | Preserves historical data; null means active record.                             |

### 10. Member_Location_Access Table
Tracks location access.

| Field                 | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `access_id`           | Integer     | Primary Key, Autoincrement      | Unique identifier for each access    | Unique ID for tracking location access records.                                  |
| `member_id`           | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties access to a specific member; core relational link.                          |
| `location_id`         | Integer     | Foreign Key (Locations)         | Links to the `Locations` table       | Specifies which location the member can access.                                  |
| `access_start_date`   | DateTime    | Not Null                        | Start date of access                 | Defines when access begins; aligns with membership dates if applicable.          |
| `access_end_date`     | DateTime    | Not Null                        | End date of access                   | Defines when access ends; enables temporary or multi-location access.            |
|                       |             | Unique (member_id, location_id) |                                      | Prevents duplicate access entries for the same member-location pair.             |

### 11. Sessions Table
Tracks sessions.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `session_id`    | Integer     | Primary Key, Autoincrement      | Unique identifier for each session   | Unique ID for tracking individual sessions and linking to payments if separate.  |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties session to a trainer; ensures trainer availability can be checked.          |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties session to a member; core relational link for scheduling.                   |
| `location_id`   | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Specifies where the session occurs; must align with trainer’s location.          |
| `date`          | DateTime    | Not Null                        | Date of the session                  | Defines when the session happens; used for scheduling and conflict checks.       |
| `time`          | Text        | Not Null                        | Start time of the session (HH:MM)    | SQLite lacks Time type; stored as text, parsed in app.                           |
| `duration`      | Integer     | Not Null                        | Duration in minutes                  | Defines session length; used for scheduling and billing if applicable.           |
| `status`        | String      | Optional ('scheduled', 'completed', 'canceled') | Status of the session                | Tracks session lifecycle; enables cancellation policies and analytics.           |
| `deleted_at`    | DateTime    | Optional                        | Date/time of soft deletion           | Preserves historical data; null means active record.                             |

### 12. Classes Table
Manages classes.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `class_id`      | Integer     | Primary Key, Autoincrement      | Unique identifier for each class     | Unique ID for tracking group classes and linking to registrations.               |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties class to a trainer; ensures trainer availability can be checked.            |
| `location_id`   | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Specifies where the class occurs; aligns with trainer’s location.                |
| `date`          | DateTime    | Not Null                        | Date of the class                    | Defines when the class happens; used for scheduling and conflict checks.         |
| `time`          | Text        | Not Null                        | Start time of the class (HH:MM)      | SQLite lacks Time type; stored as text, parsed in app.                           |
| `duration`      | Integer     | Not Null                        | Duration in minutes                  | Defines class length; used for scheduling and capacity planning.                 |
| `capacity`      | Integer     | Not Null                        | Maximum number of participants       | Limits class size; ensures manageable group sizes for trainers and space.        |
| `status`        | String      | Optional ('scheduled', 'completed', 'canceled') | Status of the class                  | Tracks class lifecycle; enables cancellation policies and analytics.             |

### 13. Class_Registrations Table
Tracks class registrations.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `registration_id`| Integer    | Primary Key, Autoincrement      | Unique identifier for each registration | Unique ID for tracking individual class registrations.                          |
| `class_id`      | Integer     | Foreign Key (Classes)           | Links to the `Classes` table         | Ties registration to a specific class; core relational link.                     |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties registration to a member; ensures only valid members can register.          |
| `registered_at` | DateTime    | Not Null                        | Date and time of registration        | Tracks when the member signed up; useful for auditing and priority (e.g., waitlist). |
| `deleted_at`    | DateTime    | Optional                        | Date/time of soft deletion           | Preserves historical data; null means active record.                             |
|                 |             | Unique (class_id, member_id)    |                                      | Prevents duplicate registrations for the same class by the same member.          |

### 14. Class_Waitlist Table
Manages waitlists.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `waitlist_id`   | Integer     | Primary Key, Autoincrement      | Unique identifier for each waitlist entry | Unique ID for tracking waitlist records.                                        |
| `class_id`      | Integer     | Foreign Key (Classes)           | Links to the `Classes` table         | Ties waitlist to a specific class; core relational link.                        |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties waitlist to a member; ensures only valid members can join.                 |
| `joined_at`     | DateTime    | Not Null                        | Date and time of joining waitlist    | Tracks when member joined; used for priority (e.g., first-come, first-served).  |
| `status`        | String      | Default 'waiting' ('waiting', 'notified', 'registered', 'expired') | Waitlist status | Tracks waitlist lifecycle; enables notification and registration workflows.     |
|                 |             | Unique (class_id, member_id)    |                                      | Prevents duplicate waitlist entries for the same class by the same member.      |

### 15. Progress Table
Tracks progress.

| Field                 | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `progress_id`         | Integer     | Primary Key, Autoincrement      | Unique identifier for each entry     | Unique ID for tracking individual progress records.                              |
| `member_id`           | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties progress to a specific member; core relational link.                        |
| `date`                | DateTime    | Not Null                        | Date of the progress entry           | Tracks when progress was recorded; enables time-based tracking and charts.       |
| `weight`              | Real        | Optional                        | Member's weight (e.g., in kg)        | Common metric for fitness; optional as not all members track weight; Real for SQLite. |
| `body_fat_percentage` | Real        | Optional                        | Member's body fat percentage         | Common metric for fitness; optional as not all members track this; Real for SQLite. |
| `notes`               | Text        | Optional                        | Additional progress notes            | Allows trainers/members to add context (e.g., "Felt strong today"); enhances UX. |
| `file_reference`      | String      | Optional                        | Reference to uploaded file (e.g., S3 key) | Links to cloud-stored files (e.g., progress photos); keeps DB lightweight.       |

### 16. Strength_Metrics Table
Tracks strength progress.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `metric_id`     | Integer     | Primary Key, Autoincrement      | Unique identifier for each metric    | Unique ID for tracking individual strength records.                              |
| `progress_id`   | Integer     | Foreign Key (Progress)          | Links to the `Progress` table        | Ties metric to a specific progress entry; enables detailed tracking.             |
| `exercise_name` | String      | Not Null                        | Name of the exercise (e.g., "Bench Press") | Identifies the exercise; required for structured data.                          |
| `weight`        | Real        | Optional                        | Weight lifted (e.g., in kg)          | Tracks strength progress; optional if not applicable; Real for SQLite.           |
| `sets`          | Integer     | Optional                        | Number of sets performed             | Tracks workout volume; optional as not always recorded.                          |
| `reps`          | Integer     | Optional                        | Number of repetitions per set        | Tracks workout intensity; optional as not always recorded.                       |
| `notes`         | Text        | Optional                        | Additional notes for this metric     | Adds context (e.g., "Felt easy"); enhances UX and detail.                        |

### 17. Workout_Templates Table
Stores workout templates.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `template_id`   | Integer     | Primary Key, Autoincrement      | Unique identifier for each template  | Unique ID for tracking workout templates.                                        |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties template to its creator; ensures trainer ownership.                         |
| `name`          | String      | Not Null                        | Name of the workout template         | Human-readable identifier (e.g., "Beginner Strength"); aids navigation.          |
| `description`   | Text        | Optional                        | Details of the workout               | Provides context (e.g., "Focus on core"); enhances usability.                    |
| `exercises`     | Text        | Not Null                        | JSON or text list of exercises       | Stores workout details (e.g., {"exercise": "Squats", "sets": 3, "reps": 10}); flexible format. |
| `created_at`    | DateTime    | Not Null                        | Date/time of creation                | Tracks when the template was made; useful for sorting and auditing.              |

### 18. Member_Workouts Table
Assigns workouts to members.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `workout_id`    | Integer     | Primary Key, Autoincrement      | Unique identifier for each workout   | Unique ID for tracking assigned workouts.                                        |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties workout to a specific member; core relational link.                         |
| `template_id`   | Integer     | Foreign Key (Workout_Templates) | Links to the `Workout_Templates` table | References the base template; allows customization.                            |
| `assigned_at`   | DateTime    | Not Null                        | Date/time workout was assigned       | Tracks when the workout was given; useful for scheduling and history.            |
| `start_date`    | DateTime    | Not Null                        | Start date of the workout            | Defines when the member should begin; aids planning.                             |
| `end_date`      | DateTime    | Optional                        | End date of the workout              | Optional deadline; allows open-ended plans if null.                              |
| `custom_exercises` | Text     | Optional                        | JSON or text of customized exercises | Overrides `Workout_Templates.exercises` if customized; maintains flexibility.    |
| `status`        | String      | Not Null ('pending', 'active', 'completed') | Status of the workout            | Tracks progress; enables member/trainer to mark completion.                      |

### 19. Meal_Plans Table
Stores meal plans.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `meal_plan_id`  | Integer     | Primary Key, Autoincrement      | Unique identifier for each meal plan | Unique ID for tracking meal plans.                                               |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties plan to its creator; ensures trainer ownership.                             |
| `name`          | String      | Not Null                        | Name of the meal plan                | Human-readable identifier (e.g., "High Protein"); aids navigation.               |
| `description`   | Text        | Optional                        | Details of the meal plan             | Provides context (e.g., "For muscle gain"); enhances usability.                  |
| `meals`         | Text        | Not Null                        | JSON or text list of meals           | Stores meal details (e.g., {"meal": "Breakfast", "food": "Oats", "calories": 300}); flexible format. |
| `created_at`    | DateTime    | Not Null                        | Date/time of creation                | Tracks when the plan was made; useful for sorting and auditing.                  |

### 20. Member_Meal_Plans Table
Assigns meal plans to members.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `meal_assignment_id` | Integer | Primary Key, Autoincrement      | Unique identifier for each assignment| Unique ID for tracking assigned meal plans.                                      |
| `member_id`     | Integer     | Foreign Key (Members)           | Links to the `Members` table         | Ties meal plan to a specific member; core relational link.                       |
| `meal_plan_id`  | Integer     | Foreign Key (Meal_Plans)        | Links to the `Meal_Plans` table      | References the base meal plan; allows customization.                             |
| `assigned_at`   | DateTime    | Not Null                        | Date/time meal plan was assigned     | Tracks when the plan was given; useful for history.                              |
| `start_date`    | DateTime    | Not Null                        | Start date of the meal plan          | Defines when the member should begin; aids planning.                             |
| `end_date`      | DateTime    | Optional                        | End date of the meal plan            | Optional deadline; allows open-ended plans if null.                              |
| `custom_meals`  | Text        | Optional                        | JSON or text of customized meals     | Overrides `Meal_Plans.meals` if customized; maintains flexibility.               |
| `status`        | String      | Not Null ('pending', 'active', 'completed') | Status of the meal plan          | Tracks adherence; enables member/trainer to mark completion.                     |

### 21. Products Table
Manages merchandise.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `product_id`    | Integer     | Primary Key, Autoincrement      | Unique identifier for each product   | Unique ID for tracking merchandise items in inventory.                           |
| `location_id`   | Integer     | Foreign Key (Locations), Not Null | Links to the `Locations` table       | Ties product to a specific gym branch; allows location-specific inventory.       |
| `name`          | String      | Not Null                        | Name of the product (e.g., "Gym T-Shirt") | Human-readable identifier for users and admins.                                 |
| `description`   | Text        | Optional                        | Product details                      | Provides clarity on what the product is (e.g., "Cotton, size M"); enhances UX.   |
| `price`         | Real        | Not Null                        | Price of the product                 | Core financial data; uses Real for SQLite compatibility.                         |
| `stock_quantity`| Integer     | Not Null, Default 0             | Current stock available              | Tracks inventory levels; prevents overselling; 0 means out of stock.             |

### 22. Payments Table
Tracks payments.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `payment_id`    | Integer     | Primary Key, Autoincrement      | Unique identifier for each payment   | Unique ID for tracking individual payments and auditing.                         |
| `membership_id` | Integer     | Foreign Key (Memberships), Optional | Links to the `Memberships` table     | Ties payment to a membership; optional if payment is for another type.           |
| `session_id`    | Integer     | Foreign Key (Sessions), Optional   | Links to the `Sessions` table        | Ties payment to a session; optional if sessions are billed separately.           |
| `class_id`      | Integer     | Foreign Key (Classes), Optional    | Links to the `Classes` table         | Ties payment to a class; optional if classes are billed separately.              |
| `product_id`    | Integer     | Foreign Key (Products), Optional   | Links to the `Products` table        | Ties payment to a product purchase; optional if not a merchandise sale.          |
| `amount`        | Real        | Not Null                        | Payment amount                       | Core financial data; uses Real for SQLite compatibility.                         |
| `payment_date`  | DateTime    | Not Null                        | Date of the payment                  | Tracks when payment was made; critical for revenue tracking and status updates.  |
| `payment_method`| String      | Optional                        | Method of payment (e.g., card, cash) | Tracks how payment was made; useful for accounting and user preferences.         |
| `payment_type`  | String      | Not Null ('membership', 'session', 'class', 'product', 'other') | Type of payment            | Categorizes payment; ensures correct reference (e.g., product vs. membership).   |
| `status`        | String      | Optional ('pending', 'completed', 'refunded') | Payment status                 | Tracks payment lifecycle; enables refunds and partial payment handling.          |
|                 |             | CHECK ((payment_type = 'membership' AND membership_id IS NOT NULL) OR (payment_type = 'session' AND session_id IS NOT NULL) OR (payment_type = 'class' AND class_id IS NOT NULL) OR (payment_type = 'product' AND product_id IS NOT NULL) OR (payment_type = 'other')) | | Ensures payment_type matches a valid reference or is 'other'.                   |

### 23. Trainer_Availability Table
Tracks availability.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `availability_id`| Integer    | Primary Key, Autoincrement      | Unique identifier for each entry     | Unique ID for tracking availability records.                                     |
| `trainer_id`    | Integer     | Foreign Key (Trainers)          | Links to the `Trainers` table        | Ties availability to a specific trainer; core relational link.                   |
| `day_of_week`   | String      | Not Null (e.g., 'Monday')       | Day of the week                      | Specifies recurring availability; simplifies weekly scheduling.                  |
| `start_time`    | Text        | Not Null                        | Start time of availability (HH:MM)   | SQLite lacks Time type; stored as text, parsed in app.                           |
| `end_time`      | Text        | Not Null                        | End time of availability (HH:MM)     | SQLite lacks Time type; stored as text, parsed in app.                           |
|                 |             | Unique (trainer_id, day_of_week, start_time, end_time) |             | Prevents duplicate availability slots; ensures no scheduling overlaps.           |

### 24. Notifications Table
Manages notifications.

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `notification_id`| Integer    | Primary Key, Autoincrement      | Unique identifier for each notification | Unique ID for tracking individual notifications.                                |
| `user_id`       | Integer     | Foreign Key (Users)             | Links to the `Users` table           | Ties notification to a specific user (member, trainer, admin); core link.        |
| `message`       | Text        | Not Null                        | Notification content                 | Content of the notification (e.g., "Session tomorrow at 10 AM"); core data.      |
| `sent_at`       | DateTime    | Not Null                        | Date and time sent                   | Tracks when notification was sent; useful for auditing and timing.               |
| `status`        | String      | Optional ('sent', 'read')       | Status of the notification           | Tracks if user has seen it; enhances UX by marking unread notifications.         |

### 25. Posts Table (Retained from LuxReplit)
Manages content (e.g., announcements).

| Field           | Type        | Constraints                     | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|----------------------------------|--------------------------------------|----------------------------------------------------------------------------------|
| `post_id`       | Integer     | Primary Key, Autoincrement      | Unique identifier for each post      | Unique ID for tracking content entries; retained from LuxReplit.                 |
| `user_id`       | Integer     | Foreign Key (Users)             | Links to the `Users` table           | Ties post to its creator (e.g., admin); preserves LuxReplit functionality.       |
| `title`         | String      | Not Null                        | Title of the post                    | Human-readable identifier for posts; core content field.                         |
| `content`       | Text        | Not Null                        | Content of the post                  | Main body of the post (e.g., gym announcements); core content field.             |
| `created_at`    | DateTime    | Not Null                        | Date/time of creation                | Tracks when the post was made; useful for sorting and auditing.                  |

---

## Views

### Scheduled_Blocks View
Checks for scheduling conflicts.

| Field           | Type        | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|--------------------------------------|----------------------------------------------------------------------------------|
| `trainer_id`    | Integer     | Trainer identifier                   | Identifies the trainer involved in the block.                                    |
| `date`          | DateTime    | Date of the block                    | Specifies when the block occurs; aligns with `Sessions`/`Classes`.               |
| `start_time`    | Text        | Start time of the block              | Defines the start of the scheduled block; from `time` field.                     |
| `end_time`      | DateTime    | End time of the block                | Calculated as `start_time + duration`; ensures accurate overlap detection.       |
| `type`          | String      | Type of block ('session', 'class')   | Distinguishes between session and class blocks; aids conflict logic.             |
| `id`            | Integer     | ID of the session or class           | References the specific session/class; useful for debugging or updates.          |

- **Definition**: Combines non-canceled `Sessions` and `Classes`.
- **Sample SQL**:
  ```sql
  CREATE VIEW Scheduled_Blocks AS
  SELECT trainer_id, date, time AS start_time,
         DATETIME(date, '+' || duration || ' minutes') AS end_time,
         'session' AS type, session_id AS id
  FROM Sessions WHERE status != 'canceled' AND deleted_at IS NULL
  UNION ALL
  SELECT trainer_id, date, time AS start_time,
         DATETIME(date, '+' || duration || ' minutes') AS end_time,
         'class' AS type, class_id AS id
  FROM Classes WHERE status != 'canceled';