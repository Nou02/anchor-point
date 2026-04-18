# AnchorPoint Database Design

The AnchorPoint application currently uses a hybrid data storage approach.

## 1. Current Storage (Excel)
The primary data for vessel logs and reports is stored in an Excel file:
- **File**: `backend/vessels_log.xlsx`
- **Structure**: Each sheet represents a year (e.g., "2024", "2025").
- **Columns**: 
  - Date
  - Vessel
  - Voyage Number
  - Service (Purpose)
  - Control Number
  - Vessel Type
  - Time
  - Time Finished

## 2. Planned Schema (SQLAlchemy Models)
The project includes a predefined schema in `backend/models.py` for future migration to a relational database (SQLite/PostgreSQL/MySQL).

### Tables:

#### **Users**
| Column | Type | Description |
|--------|------|-------------|
| id | String(36) | Primary Key (UUID) |
| email | String(120) | Unique email, indexed |
| password_hash | String(255) | Hashed password |
| display_name | String(100) | User's display name |
| role | String(50) | 'user', 'admin', etc. |
| is_active | Boolean | Account status |
| created_at | DateTime | Timestamp |

#### **Ships**
| Column | Type | Description |
|--------|------|-------------|
| id | String(36) | Primary Key (UUID) |
| name | String(200) | Vessel name |
| status | String(50) | docked, in_transit, scheduled |
| arrival | DateTime | Arrival time |
| departure | DateTime | Departure time |
| dock | String(100) | Pier location |

#### **CrewMembers**
| Column | Type | Description |
|--------|------|-------------|
| id | String(36) | Primary Key (UUID) |
| name | String(200) | Name of crew member |
| position | String(100) | Job title |
| ship_id | String(36) | Foreign Key to Ships |
| status | String(50) | on_duty, off_duty |

#### **Reports**
| Column | Type | Description |
|--------|------|-------------|
| id | String(36) | Primary Key (UUID) |
| date | String(20) | Format: MM-DD-YYYY |
| port_location | String(200) | Port name |
| voyage_no | String(100) | Voyage number |
| vessel_name | String(200) | Vessel name |
| purpose_of_call | Text | Reason for call |
| work_activities | JSON | List of activities |
| updated_by | String(200) | Last editor |
