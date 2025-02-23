# LuxReplit Database Schema

This document provides the database schema for the LuxReplit gym management app, aligned with the current state in `https://github.com/mschwartz-tech/LuxReplit` and enhanced with AI-generated meal plans and workouts.

---

## Table of Contents
1. [Users](#users)  
2. [Members](#members)  
3. [Trainers](#trainers)  
4. [Classes](#classes)  
5. [Class Signups](#class-signups)  
6. [Payments](#payments)  
7. [Meal Plans](#meal-plans)  
8. [Workouts](#workouts)  

---

### Users
Stores basic information for all users (members, trainers, admins).

| Field          | Type         | Description                                    |
|----------------|--------------|------------------------------------------------|
| `id`           | INT          | Primary Key (PK)                               |
| `name`         | VARCHAR(100) | Full name of the user                          |
| `email`        | VARCHAR(100) | Email address (unique)                         |
| `password_hash`| VARCHAR(255) | Hashed password for authentication             |
| `role`         | ENUM         | User role: 'admin', 'trainer', 'member'        |

- **Indexes:** `email` (unique)
- **Notes:** Assumed as the base user table for your CRUD operations.

---

### Members
Stores member-specific information, linked to `Users`. Enhanced for AI plans.

| Field                  | Type         | Description                                    |
|------------------------|--------------|------------------------------------------------|
| `user_id`              | INT          | FK to `Users.id` (PK)                          |
| `fitness_goals`        | TEXT         | Member's fitness goals (e.g., weight loss)     |
| `membership_status`    | ENUM         | Status: 'active', 'expired'                    |
| `height`               | DECIMAL(5,2) | Height in cm (optional, for AI plans)          |
| `weight`               | DECIMAL(5,2) | Weight in kg (optional, for AI plans)          |
| `dietary_restrictions` | TEXT         | Dietary preferences (e.g., vegan, for AI plans)|

- **Primary Key:** `user_id`
- **Foreign Key:** `user_id` → `Users.id`
- **Notes:** 
  - Matches your "basic CRUD" for members.
  - Added `height`, `weight`, and `dietary_restrictions` for AI meal/workout generation.

---

### Trainers
Stores trainer-specific information, linked to `Users`.

| Field            | Type         | Description                                    |
|------------------|--------------|------------------------------------------------|
| `user_id`        | INT          | FK to `Users.id` (PK)                          |
| `specialties`    | TEXT         | Trainer's specialties (e.g., yoga, for AI workouts) |

- **Primary Key:** `user_id`
- **Foreign Key:** `user_id` → `Users.id`
- **Notes:** 
  - Simplified from your "trainer assignments" feature.
  - `specialties` supports AI workout generation.

---

### Classes
Stores information about classes offered.

| Field         | Type         | Description                                    |
|---------------|--------------|------------------------------------------------|
| `id`          | INT          | PK                                             |
| `name`        | VARCHAR(100) | Name of the class (e.g., Yoga)                 |
| `capacity`    | INT          | Maximum number of participants                 |
| `trainer_id`  | INT          | FK to `Trainers.user_id`                       |

- **Foreign Key:** `trainer_id` → `Trainers.user_id`
- **Notes:** 
  - Matches your "basic class creation" and "trainer assignments."
  - Simplified from previous schema (no recurrence yet, as not mentioned in your repo).

---

### Class Signups
Tracks member signups for classes.

| Field         | Type         | Description                                    |
|---------------|--------------|------------------------------------------------|
| `id`          | INT          | PK                                             |
| `class_id`    | INT          | FK to `Classes.id`                             |
| `member_id`   | INT          | FK to `Members.user_id`                        |

- **Foreign Keys:** `class_id` → `Classes.id`, `member_id` → `Members.user_id`
- **Notes:** Matches your "basic system for signing up members."

---

### Payments
Records payment transactions made by members.

| Field            | Type          | Description                                    |
|------------------|---------------|------------------------------------------------|
| `id`             | INT           | PK                                             |
| `member_id`      | INT           | FK to `Members.user_id`                        |
| `amount`         | DECIMAL(10,2) | Payment amount                                 |
| `payment_date`   | DATETIME      | Date and time of payment                       |
| `status`         | ENUM          | Status: 'completed', 'pending'                 |
| `payment_type`   | ENUM          | Type: 'membership', 'class', 'meal_plan', 'workout' |

- **Foreign Key:** `member_id` → `Members.user_id`
- **Notes:** 
  - Aligns with your "early stages" payment processing.
  - Added `meal_plan` and `workout` types for AI features.

---

### Meal Plans
Stores AI-generated meal plans tailored to members.

| Field               | Type         | Description                                    |
|---------------------|--------------|------------------------------------------------|
| `id`                | INT          | PK                                             |
| `member_id`         | INT          | FK to `Members.user_id`                        |
| `generated_at`      | DATETIME     | Date and time of generation                    |
| `duration_days`     | INT          | Duration (e.g., 7 for weekly)                  |
| `fitness_goal`      | TEXT         | Goal used for generation (from `Members`)      |
| `dietary_restrictions`| TEXT       | Restrictions used (from `Members`)             |
| `plan_content`      | JSON         | AI-generated meal plan (e.g., daily meals)     |
| `status`            | ENUM         | Status: 'active', 'expired'                    |

- **Foreign Key:** `member_id` → `Members.user_id`
- **Notes:** 
  - New feature for AI meal plans.
  - Uses `fitness_goals`, `dietary_restrictions`, `height`, `weight` from `Members`.

---

### Workouts
Stores AI-generated workout plans tailored to members.

| Field               | Type         | Description                                    |
|---------------------|--------------|------------------------------------------------|
| `id`                | INT          | PK                                             |
| `member_id`         | INT          | FK to `Members.user_id`                        |
| `trainer_id`        | INT          | FK to `Trainers.user_id` (nullable)            |
| `generated_at`      | DATETIME     | Date and time of generation                    |
| `duration_days`     | INT          | Duration (e.g., 7 for weekly)                  |
| `fitness_goal`      | TEXT         | Goal used for generation (from `Members`)      |
| `trainer_specialties`| TEXT        | Specialties used (from `Trainers`, if applicable) |
| `plan_content`      | JSON         | AI-generated workout plan (e.g., exercises)    |
| `status`            | ENUM         | Status: 'active', 'expired'                    |

- **Foreign Keys:** `member_id` → `Members.user_id`, `trainer_id` → `Trainers.user_id`
- **Notes:** 
  - New feature for AI workouts.
  - Uses `fitness_goals`, `height`, `weight` from `Members`, and optionally `specialties` from `Trainers`.

---

## Additional Notes
- **Alignment with Repo:**
  - Simplified to match your "basic" implementations (e.g., no recurring classes or analytics yet).
  - Assumes you’re using a relational database (e.g., SQLite, MySQL) based on CRUD operations.

- **AI-Generated Meal Plans:**
  - Generated using `Members.fitness_goals`, `dietary_restrictions`, `height`, and `weight`.
  - Stored as JSON in `plan_content` (e.g., `{ "day_1": { "breakfast": "Oatmeal (300 cal)" } }`).

- **AI-Generated Workouts:**
  - Generated using `Members.fitness_goals`, `height`, `weight`, and optionally `Trainers.specialties`.
  - Stored as JSON in `plan_content` (e.g., `{ "day_1": { "exercise_1": "Squats (3x10)" } }`).

- **Scalability:** JSON fields allow flexible plan structures without schema changes.
- **Future Expansion:** Add tables like `Membership Tiers`, `Class Instances`, or `Analytics` as you progress beyond the basics.

---