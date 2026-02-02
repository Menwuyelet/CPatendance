# Software Requirements Specification (SRS)

## CP Attendance Management System (CPAMS)

**Version:** 1.0  
**Date:** February 2025  
**Document Type:** Software Requirements Specification

---

## 1. Introduction

### 1.1 Purpose
This document provides a complete specification of requirements for the CP Attendance Management System (CPAMS). It defines functional requirements, non-functional requirements, constraints, and assumptions that guide the development and maintenance of the system.

### 1.2 Scope
CPAMS is a web-based attendance tracking system with the following core features:
- Facial recognition-based employee attendance
- Role-based access control (Admin, HR, Manager, Employee)
- Shift and schedule management
- Real-time attendance monitoring
- Comprehensive reporting and analytics
- Biometric profile management

### 1.3 Intended Audience
- System Architects
- Software Developers
- QA Engineers
- Project Stakeholders
- System Administrators

---

## 2. Functional Requirements

### 2.1 User Authentication (FR-AUTH)

#### FR-AUTH-001: User Login
**Priority:** Critical  
**Description:** Users must be able to authenticate using email and password.  
**Requirements:**
- System validates credentials against stored user records
- On successful authentication, JWT tokens are issued
- Failed login attempts are tracked
- Account locks after 5 failed attempts for 15 minutes

#### FR-AUTH-002: Token Management
**Priority:** Critical  
**Description:** System must manage JWT tokens securely.  
**Requirements:**
- Access token validity: 1 hour
- Refresh token validity: 7 days
- Automatic token refresh on 401 responses
- Session termination on logout

#### FR-AUTH-003: Password Policy
**Priority:** High  
**Description:** System enforces password security.  
**Requirements:**
- Minimum password length: 8 characters
- Password change requires current password confirmation
- Passwords stored using bcrypt hashing

### 2.2 Attendance Management (FR-ATT)

#### FR-ATT-001: Session Creation
**Priority:** Critical  
**Description:** HR/Manager must create attendance sessions for shifts.  
**Requirements:**
- Session linked to specific shift
- Session tracks: created timestamp, creator, active status
- Only one active session per shift allowed

#### FR-ATT-002: Face-Based Check-In
**Priority:** Critical  
**Description:** Employees must check in using facial recognition.  
**Requirements:**
- System captures employee face image
- Extracts 512-dimensional embedding
- Matches against enrolled biometric profiles
- Threshold: 0.6 cosine similarity
- Response within 3 seconds

#### FR-ATT-003: Duplicate Prevention
**Priority:** High  
**Description:** Prevent multiple check-ins per session.  
**Requirements:**
- System tracks recognized employees per session
- Duplicate check-in attempts rejected with appropriate message

#### FR-ATT-004: Absence Detection
**Priority:** High  
**Description:** System marks employees absent when no check-in recorded.  
**Requirements:**
- On session closure, system identifies assigned employees
- Employees without check-in marked ABSENT
- Absent records created with session creator as taken_by

#### FR-ATT-005: Attendance Status Evaluation
**Priority:** High  
**Description:** System determines attendance status based on timing.  
**Requirements:**
- Check-in within tolerance → PRESENT
- Check-in after tolerance → LATE
- No check-in → ABSENT
- Manual assignment → ON_LEAVE

#### FR-ATT-006: Attendance Record Query
**Priority:** Medium  
**Description:** Users query attendance records based on role.  
**Requirements:**
- Admin/HR: All records
- Manager: Department records only
- Employee: Self records only
- Filtering by date, employee, shift

### 2.3 Biometric Management (FR-BIO)

#### FR-BIO-001: Face Enrollment
**Priority:** Critical  
**Description:** Employees must enroll facial biometric data.  
**Requirements:**
- Capture face image
- Extract and store 512-dimensional embedding
- Encrypt embedding before storage
- One active enrollment per employee
- Inactive employees cannot enroll

#### FR-BIO-002: Face Matching
**Priority:** Critical  
**Description:** System matches faces for authentication.  
**Requirements:**
- Compare input embedding against stored embeddings
- Return best match above threshold
- Handle NaN/invalid embeddings gracefully
- Log similarity scores

#### FR-BIO-003: Profile Management
**Priority:** Medium  
**Description:** Admin/HR manage biometric profiles.  
**Requirements:**
- View all enrolled profiles
- Deactivate profiles (soft delete)
- View enrollment timestamps
- Filter by department/status

### 2.4 Shift Management (FR-SHIFT)

#### FR-SHIFT-001: Shift CRUD
**Priority:** High  
**Description:** Admin/HR manage shift definitions.  
**Requirements:**
- Create shift with name, times, description
- Configure weekly schedule (Mon-Sun)
- Update shift details
- Delete shift (cascades to sessions)

#### FR-SHIFT-002: Employee-Shift Assignment
**Priority:** High  
**Description:** Assign employees to shifts.  
**Requirements:**
- Maximum 2 shifts per employee per day
- Prevent overlapping assignments
- View employee shift assignments
- Remove assignments

### 2.5 Reporting (FR-REP)

#### FR-REP-001: Report Generation
**Priority:** Medium  
**Description:** Generate attendance reports.  
**Requirements:**
- Date range filtering (7, 14, 30, 90 days)
- Department filtering
- Calculate metrics: total, present, absent, leave, attendance rate

#### FR-REP-002: CSV Export
**Priority:** Medium  
**Description:** Export report data to CSV.  
**Requirements:**
- Employee-wise attendance breakdown
- Include: name, email, department, totals, rates
- Downloadable file format

### 2.6 User Management (FR-USER)

#### FR-USER-001: User CRUD
**Priority:** High  
**Description:** Admin manages system users.  
**Requirements:**
- Create user with roles
- Update user details and roles
- Deactivate users
- View user list filtered by role

#### FR-USER-002: Role-Based Access
**Priority:** Critical  
**Description:** Enforce role-based permissions.  
**Requirements:**
- Admin: Full access
- HR: Employee, Biometrics, Reports access
- Manager: Team data access
- Employee: Self-service access

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements (NFR-PERF)

| Requirement | Metric | Target |
|-------------|--------|--------|
| **Response Time - Login** | Authentication response | < 2 seconds |
| **Response Time - Check-In** | Face match and check-in | < 3 seconds |
| **Response Time - Reports** | Report generation | < 10 seconds |
| **Response Time - Queries** | List/retrieve operations | < 1 second |
| **Throughput - Concurrent Users** | Simultaneous active users | 100+ users |
| **Throughput - Check-Ins** | Check-ins per minute | 50+ check-ins/min |

### 3.2 Scalability Requirements (NFR-SCALE)

| Requirement | Description |
|-------------|-------------|
| **Horizontal Scaling** | Support multiple API instances behind load balancer |
| **Database Scaling** | Support read replicas for query-heavy loads |
| **Session Storage** | Support Redis for session caching |
| **File Storage** | Support S3-compatible storage for biometric data |

### 3.3 Availability Requirements (NFR-AVAIL)

| Requirement | Target |
|-------------|--------|
| **Uptime** | 99.5% availability |
| **Recovery Time Objective (RTO)** | < 4 hours |
| **Recovery Point Objective (RPO)** | < 1 hour |
| **Planned Maintenance Window** | Off-peak hours (2 AM - 6 AM) |

### 3.4 Security Requirements (NFR-SEC)

| Requirement | Description |
|-------------|-------------|
| **Encryption - Transit** | TLS 1.3 for all HTTP communication |
| **Encryption - At Rest** | AES-256 for biometric data storage |
| **Authentication** | JWT with refresh tokens |
| **Password Policy** | bcrypt with salt rounds ≥ 12 |
| **Session Management** | Secure, HttpOnly, SameSite cookies |
| **CORS** | Whitelist allowed origins |
| **Rate Limiting** | 100 requests/min per IP |
| **Audit Logging** | Log all authentication and data changes |
| **Input Validation** | Sanitize all user inputs |
| **SQL Injection Protection** | Parameterized queries (Django ORM) |
| **XSS Protection** | React automatic escaping, CSP headers |

### 3.5 Reliability Requirements (NFR-RELI)

| Requirement | Description |
|-------------|-------------|
| **Error Handling** | Graceful degradation, meaningful error messages |
| **Retry Logic** | Automatic retry for transient failures |
| **Data Integrity** | ACID compliance for database transactions |
| **Backup** | Daily automated backups with 30-day retention |
| **Monitoring** | Health checks, metrics, alerting |

### 3.6 Maintainability Requirements (NFR-MAIN)

| Requirement | Description |
|-------------|-------------|
| **Code Quality** | Linting, type hints, documentation |
| **Testing** | Unit test coverage ≥ 80% |
| **Logging** | Structured JSON logging |
| **API Documentation** | OpenAPI/Swagger documentation |
| **Version Control** | Git with semantic versioning |

### 3.7 Usability Requirements (NFR-USAB)

| Requirement | Description |
|-------------|-------------|
| **Responsive Design** | Mobile, tablet, desktop support |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Localization** | English (default), extensible |
| **Performance - Load** | First Contentful Paint < 1.5s |
| **Performance - Interaction** | Time to Interactive < 3s |

---

## 4. Constraints

### 4.1 Technical Constraints

| ID | Constraint | Description |
|----|------------|-------------|
| C-TECH-001 | Technology Stack | Must use Django REST Framework, React, PostgreSQL |
| C-TECH-002 | Facial Recognition | Must use InsightFace library |
| C-TECH-003 | Authentication | Must use JWT with refresh tokens |
| C-TECH-004 | Biometric Storage | Must encrypt biometric templates |
| C-TECH-005 | API Style | RESTful API design required |

### 4.2 Business Constraints

| ID | Constraint | Description |
|----|------------|-BUS-001-------------|
| C | User Roles | Four fixed roles: Admin, HR, Manager, Employee |
| C-BUS-002 | Biometric Type | Facial recognition only (no fingerprint) |
| C-BUS-003 | Session Model | Attendance sessions required for check-in |
| C-BUS-004 | Check-in Mode | Face recognition required (no manual check-in) |

### 4.3 Regulatory Constraints

| ID | Constraint | Description |
|----|------------|-------------|
| C-REG-001 | Data Protection | Comply with local data protection laws |
| C-REG-002 | Biometric Data | Handle biometric data per privacy regulations |
| C-REG-003 | Retention | Attendance records retained minimum 3 years |

### 4.4 Resource Constraints

| ID | Constraint | Description |
|----|------------|-------------|
| C-RES-001 | Development Team | Limited to 3-5 developers |
| C-RES-002 | Timeline | MVP delivery within 3 months |
| C-RES-003 | Budget | Cloud hosting only (no on-premise) |

---

## 5. Assumptions

### 5.1 Technical Assumptions

| ID | Assumption | Description |
|----|------------|-------------|
| A-TECH-001 | Network Connectivity | System assumes reliable network connectivity |
| A-TECH-002 | Camera Access | Browsers support camera access for face capture |
| A-TECH-003 | Modern Browsers | Users access via modern browsers with ES6+ support |
| A-TECH-004 | Database Capacity | PostgreSQL sufficient for expected data volume |
| A-TECH-005 | Face Quality | Users will provide clear face images for enrollment |

### 5.2 Business Assumptions

| ID | Assumption | Description |
|----|------------|-------------|
| A-BUS-001 | User Training | Users receive basic training on system usage |
| A-BUS-002 | Enrollment Compliance | All employees will enroll biometric data |
| A-BUS-003 | Session Management | HR/Manager will properly manage sessions |
| A-BUS-004 | Data Accuracy | Managers will verify attendance data periodically |

### 5.3 Environmental Assumptions

| ID | Assumption | Description |
|----|------------|-------------|
| A-ENV-001 | Office Environment | Primary use in controlled office environments |
| A-ENV-002 | Lighting | Adequate lighting for face capture assumed |
| A-ENV-003 | Device Access | Employees have access to devices with cameras |

### 5.4 Operational Assumptions

| ID | Assumption | Description |
|----|------------|-------------|
| A-OPS-001 | System Monitoring | 24/7 monitoring infrastructure available |
| A-OPS-002 | Backup Strategy | Automated daily backups with tested restore |
| A-OPS-003 | Incident Response | Defined incident response procedures in place |
| A-OPS-004 | User Support | Help desk available for user assistance |

---

## 6. Dependencies

### 6.1 External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Django | 4.2+ | Backend framework |
| Django REST Framework | 3.14+ | API framework |
| PostgreSQL | 14+ | Primary database |
| React | 18+ | Frontend framework |
| Material-UI | 5+ | UI component library |
| InsightFace | 0.7.3 | Facial recognition |
| NumPy | 1.24+ | Numerical computing |
| OpenCV | 4.8+ | Image processing |

### 6.2 Internal Dependencies

| Dependency | Description |
|------------|-------------|
| Authentication Service | Depends on User model and JWT library |
| Biometric Service | Depends on Encryption service and Face Engine |
| Attendance Service | Depends on Session, Employee, and Shift models |
| Reporting Service | Depends on Attendance and Employee models |

---

## 7. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| Access Token | JWT token for API authentication (short-lived) |
| Attendance Session | Time-bounded check-in period for a shift |
| Biometric Template | Encrypted facial embedding data |
| Cosine Similarity | Vector similarity measure for face matching |
| Embedding | 512-dimensional vector representing facial features |
| Refresh Token | JWT token for obtaining new access tokens |
| Session Entry | Record of recognized employee in a session |

### Appendix B: Data Models (Simplified)

```
User: id, email, password_hash, roles, is_active, created_at
Employee: id, user_id, full_name, employee_code, department_id, is_active
BiometricProfile: id, employee_id, template_data (encrypted), is_active, created_at
Shift: id, name, start_time, end_time, description, schedule
EmployeeShift: id, employee_id, shift_id, date
AttendanceSession: id, shift_id, started_by_id, started_at, ended_at, is_active, is_processed
AttendanceSessionEntry: id, session_id, employee_id, recognized_at
AttendanceRecord: id, employee_id, employee_shift_id, date, check_in_time, check_out_time, status, taken_by_id
```

### Appendix C: API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2025 | CPAMS Team | Initial release |

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Author:** CPAMS Development Team  
**Approved By:** TBD
