# Gym Management Schema Metadata

This document contains metadata for the gym management database schema, including relationships, views, migration steps, and additional notes for AI-driven development. It complements the main schema definition and is tailored for integration with the LuxReplit app while preserving original functionality.

**Current Date**: February 22, 2025

---

## Relationships

### Core Authentication & User Management
- **Users ↔ Roles**: One-to-many relationship between users and roles (admin, trainer, member)
- **Users ↔ Sessions**: One-to-many relationship for user session management
- **Users ↔ Auth_Tokens**: One-to-many relationship for 2FA and social login tokens (planned)

### Facility Management
- **Locations ↔ Trainers/Members/Membership_Types/Memberships/Sessions/Classes/Member_Location_Access/Products**: One-to-many relationships tie entities to specific locations
- **Equipment ↔ Locations**: One-to-many relationship for equipment inventory tracking (planned)
- **Maintenance_Logs ↔ Equipment**: One-to-many relationship for equipment maintenance history (planned)

### Training & Progress Tracking
- **Trainers ↔ Sessions/Classes/Trainer_Availability/Trainer_Members/Workout_Templates/Meal_Plans**: One trainer can have many sessions, classes, availability slots, assigned members, workout templates, and meal plans
- **Members ↔ Memberships/Sessions/Class_Registrations/Class_Waitlist/Progress/Member_Location_Access/Trainer_Members/Member_Workouts/Member_Meal_Plans**: One member can have many memberships, sessions, class registrations, waitlist entries, progress records, location access entries, trainer assignments, workouts, and meal plans
- **AI_Recommendations ↔ Members**: One-to-many relationship for personalized AI-driven workout and nutrition recommendations (planned)

### Financial Management
- **Membership_Types ↔ Memberships**: One membership type can apply to many memberships
- **Payments ↔ Memberships/Sessions/Classes/Products**: Payments can link to any of these entities, determined by `payment_type`
- **Invoices ↔ Members**: One-to-many relationship for billing history
- **Subscriptions ↔ Members**: One-to-many relationship for recurring payment management

### Progress & Analytics
- **Progress ↔ Strength_Metrics**: One progress entry can have many strength metrics
- **Analytics_Data ↔ Members/Classes/Trainers**: One-to-many relationships for performance tracking (planned)
- **AI_Insights ↔ Progress**: One-to-many relationship for AI-driven progress analysis (planned)

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
  ```

### Member_Analytics View (Planned)
Will provide aggregated member performance metrics:

```sql
CREATE VIEW Member_Analytics AS
SELECT 
  m.id,
  m.name,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT c.id) as total_classes,
  AVG(p.performance_score) as avg_performance,
  MAX(p.updated_at) as last_activity
FROM members m
LEFT JOIN sessions s ON m.id = s.member_id
LEFT JOIN class_registrations cr ON m.id = cr.member_id
LEFT JOIN classes c ON cr.class_id = c.id
LEFT JOIN progress p ON m.id = p.member_id
GROUP BY m.id, m.name;
```

### AI_Recommendations View (Planned)
Will provide personalized workout and nutrition recommendations:

```sql
CREATE VIEW AI_Recommendations AS
SELECT 
  m.id as member_id,
  m.name,
  p.fitness_goals,
  p.current_level,
  ai.workout_recommendation,
  ai.nutrition_plan,
  ai.updated_at
FROM members m
JOIN progress p ON m.id = p.member_id
JOIN ai_insights ai ON m.id = ai.member_id
WHERE ai.status = 'active';
```

## Security Implementations

1. ✅ Session Management
   - Secure session handling with Redis/PostgreSQL store
   - Session encryption and proper cleanup
   - Token-based authentication

2. 🔄 Access Control
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API rate limiting

3. 🔜 Enhanced Security (Planned)
   - Two-factor authentication (2FA)
   - OAuth2 social login integration
   - Advanced audit logging

## Performance Optimizations

1. Current Implementations:
   - Indexed queries for common operations
   - Efficient join strategies
   - Query result caching

2. Planned Optimizations:
   - Redis caching layer
   - Background job processing
   - Real-time data synchronization
   - Horizontal scaling support

## AI Integration Points (Planned)

1. Workout Recommendations:
   - Personal training plan generation
   - Exercise form analysis
   - Progress prediction models

2. Nutrition Planning:
   - Meal plan optimization
   - Dietary requirement analysis
   - Supplement recommendations

3. Business Analytics:
   - Member retention prediction
   - Resource utilization optimization
   - Revenue forecasting

## Backup and Recovery

1. Current Implementation:
   - Daily database backups
   - Point-in-time recovery
   - Transaction logs

2. Planned Enhancements:
   - Real-time replication
   - Automated failover
   - Cross-region backup storage