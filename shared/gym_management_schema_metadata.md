# Gym Management Schema Metadata

This document contains metadata for the gym management database schema, including relationships, views, migration steps, and additional notes for AI-driven development. It complements the main schema definition and is tailored for integration with the LuxReplit app (https://github.com/mschwartz-tech/LuxReplit) while preserving original functionality.

**Current Date**: February 21, 2025

---

## Relationships

- **Locations ↔ Trainers/Members/Membership_Types/Memberships/Sessions/Classes/Member_Location_Access/Products**: One-to-many relationships tie entities to specific locations.
- **Users ↔ Admins/Trainers/Members/User_Roles/Posts**: One-to-one (default) or one-to-many (with `User_Roles`, `Posts`) relationships link users to roles and content.
- **Trainers ↔ Sessions/Classes/Trainer_Availability/Trainer_Members/Workout_Templates/Meal_Plans**: One trainer can have many sessions, classes, availability slots, assigned members, workout templates, and meal plans.
- **Members ↔ Memberships/Sessions/Class_Registrations/Class_Waitlist/Progress/Member_Location_Access/Trainer_Members/Member_Workouts/Member_Meal_Plans**: One member can have many memberships, sessions, class registrations, waitlist entries, progress records, location access entries, trainer assignments, workouts, and meal plans.
- **Membership_Types ↔ Memberships**: One membership type can apply to many memberships.
- **Payments ↔ Memberships/Sessions/Classes/Products**: Payments can link to any of these entities, determined by `payment_type`.
- **Progress ↔ Strength_Metrics**: One progress entry can have many strength metrics.
- **Workout_Templates ↔ Member_Workouts**: One workout template can be assigned to many member workouts.
- **Meal_Plans ↔ Member_Meal_Plans**: One meal plan can be assigned to many member meal plans.

---

## Views

### Scheduled_Blocks View
Checks for trainer scheduling conflicts across sessions and classes.

| Field           | Type        | Description                          | Logic Explanation                                                                 |
|-----------------|-------------|--------------------------------------|----------------------------------------------------------------------------------|
| `trainer_id`    | Integer     | Trainer identifier                   | Identifies the trainer involved in the block.                                    |
| `date`          | DateTime    | Date of the block                    | Specifies when the block occurs; aligns with `Sessions`/`Classes`.               |
| `start_time`    | Text        | Start time of the block              | Defines the start of the scheduled block; from `time` field.                     |
| `end_time`      | DateTime    | End time of the block                | Calculated as `start_time + duration`; ensures accurate overlap detection.       |
| `type`          | String      | Type of block ('session', 'class')   | Distinguishes between session and class blocks; aids conflict logic.             |
| `id`            | Integer     | ID of the session or class           | References the specific session/class; useful for debugging or updates.          |

- **Definition**: Combines non-canceled `Sessions` and `Classes` to show trainer time blocks.
- **Purpose**: Used in app logic to prevent overlapping schedules.
- **Sample SQL** (SQLite-compatible):
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