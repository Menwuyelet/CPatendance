# Functional Specification Document (FSE)

## CP Attendance Management System (CPAMS)

**Version:** 1.0  
**Date:** February 2025  
**Document Type:** Functional Specification

---

## 1. Introduction

### 1.1 Purpose
The CP Attendance Management System (CPAMS) is a web-based attendance tracking solution that uses facial recognition technology to automate employee check-in/check-out processes. This document describes the functional requirements and system behavior at a high level.

### 1.2 Scope
CPAMS provides the following core capabilities:
- Employee attendance tracking via facial recognition
- Biometric enrollment and management
- Shift scheduling and management
- Role-based access control (Admin, HR, Manager, Employee)
- Attendance reporting and analytics
- Session-based attendance collection

### 1.3 Definitions, Acronyms, and Abbreviations
| Term | Definition |
|------|------------|
| CPAMS | CP Attendance Management System |
| API | Application Programming Interface |
| JWT | JSON Web Token |
| Face Engine | Facial recognition embedding extraction service |
| Session | Active attendance collection period for a shift |

---

## 2. System Overview

### 2.1 System Architecture
The system follows a client-server architecture:
- **Frontend:** React-based SPA with Material-UI components
- **Backend:** Django REST Framework API
- **Database:** PostgreSQL
- **Authentication:** JWT-based with refresh tokens
- **Biometrics:** InsightFace for facial recognition

### 2.2 User Roles
| Role | Description |
|------|-------------|
| **Admin** | Full system access, user management, configuration |
| **HR** | Employee management, reports, biometrics management |
| **Manager** | Team attendance monitoring, session management |
| **Employee** | View own attendance, biometric enrollment, self-service |

---

## 3. Functional Modules

### 3.1 Authentication & Authorization

#### 3.1.1 User Login
- Users authenticate using email and password
- System enforces account lockout after 5 failed attempts (15-minute lockout)
- JWT tokens issued with 1-hour access token and 7-day refresh token validity
- Session management with concurrent session tracking

#### 3.1.2 Role-Based Access Control
- Each endpoint enforces role-based permissions
- Permission checks:
  - Admin: Full access to all endpoints
  - HR: Access to employee data, biometrics, reports
  - Manager: Team-specific data access
  - Employee: Self-service only

### 3.2 Attendance Management

#### 3.2.1 Attendance Sessions
- HR/Manager creates a session for a specific shift
- Session tracks: start time, end time, active status, processed status
- Session entries capture: employee ID, recognition timestamp
- Session closure triggers:
  - Automatic marking of absent employees
  - Processing of session entries into attendance records

#### 3.2.2 Face-Based Check-In
- Employee captures face image via camera
- System extracts embedding and matches against enrolled profiles
- Match threshold: 0.6 cosine similarity
- Duplicate detection prevents multiple check-ins per session

#### 3.2.3 Attendance Status Evaluation
| Status | Condition |
|--------|-----------|
| **PRESENT** | Check-in within shift start time tolerance |
| **LATE** | Check-in after shift start time tolerance |
| **ABSENT** | No check-in recorded after session closure |
| **ON_LEAVE** | Manual assignment by HR |

### 3.3 Biometric Management

#### 3.3.1 Face Enrollment
- Employee captures face image
- System extracts 512-dimensional embedding
- Embedding encrypted before storage
- One active enrollment per employee

#### 3.3.2 Face Matching
- Captured embedding compared against all enrolled embeddings
- Uses cosine similarity for matching
- Best match above threshold returned as recognized employee

### 3.4 Shift Management

#### 3.4.1 Shift Definition
- Shift includes: name, start time, end time, description
- Weekly schedule configuration (Mon-Sun)
- Time-based attendance rules

#### 3.4.2 Employee-Shift Assignment
- Maximum 2 shifts per employee per applicable day
- Assignment tracked via EmployeeShift model
- Cascade deletion protected

### 3.5 Reporting

#### 3.5.1 Report Generation
- Date range filtering (7, 14, 30, 90 days)
- Department-based filtering
- Metrics calculated:
  - Total employees
  - Present/Absent/Leave counts
  - Attendance rate percentage

#### 3.5.2 CSV Export
- Employee-wise attendance data
- Downloadable report format
- Filename: `attendance_report_{start_date}_to_{end_date}.csv`

---

## 4. User Interfaces

### 4.1 Login Page
- Email/password fields
- Password visibility toggle
- Remember me option
- Lockout countdown display
- Error messages with attempt counter

### 4.2 Dashboard Views

#### 4.2.1 Employee Dashboard
- Current date/time display
- Today's attendance status
- Check-in/out times
- Hours worked calculation
- Quick action buttons

#### 4.2.2 Manager Dashboard
- Team statistics (total, present, attendance rate)
- Attendance sessions table
- Quick actions (Team, Reports, Biometrics)
- Session filtering (date, status, search)

#### 4.2.3 HR Dashboard
- Employee management
- Department management
- Biometrics portal
- Report generation

### 4.3 Biometrics Portal
- Tabbed interface:
  - Attendance capture (HR/Manager)
  - Face enrollment (Employee)
  - Enrolled profiles list (HR/Admin)

### 4.4 Settings Page
- Profile information
- Notification preferences
- Active sessions management
- Password change
- Theme selection (light/dark/sepia)

---

## 5. Data Flow

### 5.1 Attendance Check-In Flow
```
1. User captures face image
2. Image sent to backend
3. FaceEngine extracts embedding
4. BiometricMatchingService searches enrolled embeddings
5. If match found → create AttendanceSessionEntry
6. Session closure → mark absent employees
7. Process entries → create AttendanceRecord
```

### 5.2 Session Management Flow
```
1. HR/Manager creates session for shift
2. Session marked as active
3. Employees check in via facial recognition
4. HR/Manager closes session
5. System marks absent employees
6. Session marked as processed
```

---

## 6. Security Considerations

### 6.1 Authentication Security
- Password hashing (bcrypt)
- JWT token rotation
- Session timeout enforcement
- Brute force protection

### 6.2 Data Protection
- Biometric template encryption
- HTTPS required
- CORS policy enforcement
- Input validation

### 6.3 API Security
- Token authentication required
- Role-based endpoint protection
- Rate limiting on auth endpoints
- Input sanitization

---

## 7. Non-Functional Requirements Reference

For detailed non-functional requirements (performance, scalability, availability, security compliance), see the SRS document.

---

## 8. Appendices

### Appendix A: API Endpoints Summary
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login/` | POST | User authentication |
| `/api/auth/refresh/` | POST | Token refresh |
| `/api/accounts/users/me/` | GET | Current user profile |
| `/api/attendance/attendance/` | GET/POST | Attendance records |
| `/api/attendance/attendance-sessions/` | GET/POST | Session management |
| `/api/attendance/shifts/` | GET/POST/PATCH/DELETE | Shift CRUD |
| `/api/attendance/attendance-check-in/` | POST | Face check-in |
| `/api/biometrics/face/enroll/` | POST | Face enrollment |
| `/api/employees/employees/` | GET/POST | Employee management |

### Appendix B: Status Codes
| Status Code | Meaning |
|-------------|---------|
| PRESENT | Employee present on time |
| LATE | Employee present but late |
| ABSENT | Employee absent |
| ON_LEAVE | Employee on approved leave |

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Author:** CPAMS Development Team
