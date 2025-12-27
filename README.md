# Company Attendance Management System (CAMS) Documentation

## 1. System Overview and README

### 1.1. Introduction

The **Company Attendance Management System (CAMS)** is a comprehensive, cloud-based solution designed to streamline and automate the process of tracking, managing, and reporting employee attendance. It replaces traditional, manual methods with a modern, efficient, and accurate digital platform, ensuring compliance with company policies and labor regulations.

### 1.2. Core Objectives

- **Accuracy:** Ensure precise recording of clock-in and clock-out times.
- **Efficiency:** Reduce administrative overhead associated with manual attendance tracking and payroll preparation.
- **Transparency:** Provide clear, real-time visibility into employee attendance status and history for all relevant stakeholders.
- **Compliance:** Facilitate adherence to working hour regulations and company leave policies.

### 1.3. Key Features

The CAMS is built around three main functional pillars: Time Tracking, Leave Management, and Reporting & Analytics.

| Feature Pillar               | Key Functionality                                        | Description                                                                                                                                                                                                                                              |
| :--------------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time Tracking**            | Digital Clock-in/out & Optional Biometric Authentication | Employees can record their attendance via a dedicated terminal, web interface, or mobile application. **Optionally supports Facial Recognition for secure, touchless clock-in/out**, along with geo-fencing or IP restrictions for on-site verification. |
|                              | Shift Management                                         | Define and assign various work shifts (e.g., standard, night, flexible) to different employees or departments.                                                                                                                                           |
| **Leave Management**         | Leave Request Workflow                                   | Employees can submit leave requests (e.g., vacation, sick leave) which are routed for approval based on the organizational hierarchy.                                                                                                                    |
|                              | Leave Balance Tracking                                   | Automatic calculation and tracking of accrued and remaining leave balances for each employee.                                                                                                                                                            |
| **Reporting & Analytics**    | Attendance Reports                                       | Generate detailed reports on daily, weekly, and monthly attendance, including late arrivals and early departures.                                                                                                                                        |
|                              | Payroll Export                                           | Export processed attendance data in a format compatible with standard payroll systems.                                                                                                                                                                   |
| **User & System Management** | User Onboarding                                          | Management of employee and user accounts, including role assignment and profile updates.                                                                                                                                                                 |
|                              | System Configuration                                     | Setting up company-wide rules, holidays, department structures, and approval flows.                                                                                                                                                                      |

---

_Documentation Author: Manus AI_
_Date: December 26, 2025_

## 2. Actors, Roles, and Permissions

The CAMS utilizes a role-based access control (RBAC) model to ensure that users only have access to the functions and data necessary for their responsibilities. This section defines the key actors and their corresponding system roles.

### 2.1. System Actors and Roles

The system is designed to accommodate three primary user roles, each with distinct responsibilities and access levels:

| Actor                          | System Role  | Primary Responsibilities                                                                                                                     |
| :----------------------------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Administrator**       | **Admin**    | Full system configuration, user management across all departments, global policy setting, and oversight of all data.                         |
| **Human Resources**            | **HR**       | Company-wide management of employee data, leave policies, payroll-related attendance data, and compliance reporting.                         |
| **Department Management Head** | **Manager**  | Managing attendance and leave for their assigned department, approving/rejecting leave requests, and generating department-specific reports. |
| **Worker**                     | **Employee** | Personal attendance tracking (clock-in/out), viewing personal attendance history, and submitting/tracking personal leave requests.           |

### 2.2. Permissions Matrix

The following matrix details the permissions (Create, Read, Update, Delete) for each role across the core modules of the CAMS.

| Module                   | Admin (System-wide) | HR (Company-wide)           | Manager (Department-specific)        | Employee (Self-service) |
| :----------------------- | :------------------ | :-------------------------- | :----------------------------------- | :---------------------- |
| **User Accounts**        | C, R, U, D          | R, U (All data)             | R (Department only)                  | R (Self only)           |
| **Time Entries**         | C, R, U, D          | R (All data)                | C, R, U (Department only)            | C, R (Self only)        |
| **Leave Requests**       | C, R, U, D          | R, U (All data)             | R, U (Approve/Reject for Department) | C, R, U (Self only)     |
| **Leave Types/Policies** | C, R, U, D          | C, R, U                     | R                                    | R                       |
| **Shift Schedules**      | C, R, U, D          | R (All data)                | C, R, U (Department only)            | R (Self only)           |
| **System Configuration** | C, R, U, D          | R                           | -                                    | -                       |
| **Reports & Analytics**  | R (All data)        | R (All data, Payroll Focus) | R (Department data)                  | R (Personal data)       |

_Legend: C (Create), R (Read), U (Update), D (Delete), - (No Access)_

## 3. Admin Panels and User Interfaces

The CAMS provides tailored user interfaces for each actor to ensure a focused and efficient user experience. The design emphasizes clarity, ease of navigation, and quick access to critical information and actions.

### 3.1. System Administrator (Admin) Interface

The Admin interface is the central control hub for the entire system, focused on configuration, oversight, and compliance.

| Interface Component  | Description                                           | Key Actions/Data Points                                                                                                                             |
| :------------------- | :---------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Dashboard** | High-level overview of system health and key metrics. | Total Employees, System-wide Attendance Summary (Present/Absent), Pending Leave Requests (Global), System Audit Log.                                |
| **User Management**  | Comprehensive tool for managing all user accounts.    | CRUD operations for all employees, Role assignment, Department assignment, Bulk import/export of user data.                                         |
| **Policy & Config**  | Area for defining company-wide rules.                 | Manage Company Holidays, Define Working Hours and Shifts, Configure Leave Types (e.g., Sick, Vacation, Paternity), Set up Leave Approval Workflows. |
| **Global Reporting** | Tool for generating compliance and payroll reports.   | Generate Payroll Export (CSV/JSON), System-wide Attendance Audit, Non-Compliance Reports (e.g., excessive tardiness).                               |

#### 3.1.1. Admin Panel Feature Checklist

- **User & Access Management**
  - Create, update, disable users
  - Assign roles (Admin, HR, Manager, Employee)
  - Department assignment and manager mapping
  - Bulk import/export users (CSV)
- **Attendance Controls**
  - Company working hours and shift templates
  - Holidays and blackout dates
  - Manual time entry correction with reason and audit trail
- **Leave Policies**
  - Create/edit leave types and accrual rules
  - Carryover and cap settings
  - Multi-level approval workflow configuration
- **Biometric Module (Optional)**
  - Toggle facial recognition per department/location
  - Enrollment approvals and re-enrollment
  - Data retention and purge policies
- **Security & Compliance**
  - Password policy, session timeout, IP allowlist/geo rules
  - Audit log: who changed what, when
  - Data export for compliance (GDPR-like requests)
- **Reporting & Payroll**
  - Standard attendance, overtime, anomalies
  - Payroll period locking and export (CSV/JSON)
  - Custom report filters and saved views

#### 3.1.2. Admin Panel Settings & Integrations

- **Organization Settings**: Company profile, time zone, currency, localization.
- **Integrations**: HRIS/Payroll API keys, webhooks, SFTP export destinations.
- **Notifications**: Email/SMS templates, event triggers (missed clock-in, overtime alerts, pending approvals).
- **Data Management**: Backup schedule, archive strategy, anonymization routines for offboarded users.

### 3.2. Human Resources (HR) Interface

The HR interface is designed for company-wide policy management, compliance, and processing payroll-related attendance data. It focuses on oversight without the full system configuration access of the Admin role.

| Interface Component                | Description                                                      | Key Actions/Data Points                                                                                                                       |
| :--------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **HR Dashboard**                   | Overview of company-wide attendance compliance and leave status. | Total Active Employees, Company-wide Absenteeism Rate, Pending Leave Requests (All Departments), Compliance Alerts (e.g., Overtime Warnings). |
| **Employee Data Management**       | Tool for managing employee profiles and records.                 | View/Update all employee records (excluding sensitive Admin config), Onboard/Offboard employees, Manage employee leave balances.              |
| **Policy & Leave Management**      | Area for defining and managing leave policies.                   | Create/Edit Leave Types and Accrual Rules, Manage Company Holidays, Review and Approve/Reject Leave Requests (Company-wide oversight).        |
| **Payroll & Compliance Reporting** | Generating reports for payroll processing and legal compliance.  | Generate Payroll Export (Finalized Time Entries), Compliance Reports (e.g., Working Hours Audit), Generate Company-wide Attendance Summaries. |

### 3.3. Department Management Head (Manager) Interface

The Manager interface is designed for team management, focusing on departmental attendance and leave approval.

| Interface Component       | Description                                     | Key Actions/Data Points                                                                                                              |
| :------------------------ | :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **Department Dashboard**  | Summary of the manager's direct team.           | Team Attendance Status (Real-time), Quick access to Pending Leave Requests, Team Shift Schedule.                                     |
| **Team Attendance View**  | Detailed view of the team's time entries.       | View daily/weekly time logs, Manual correction of time entries (with mandatory reason and audit trail), Filter by date and employee. |
| **Leave Approval Center** | Centralized area for processing leave requests. | Review request details, Approve/Reject requests, View employee's leave balance history before approval.                              |
| **Department Reports**    | Generating reports specific to the department.  | Export Department Attendance Report, Summary of Overtime Hours, Leave Balance Report.                                                |

### 3.4. Worker (Employee) Interface

The Employee interface is a self-service portal focused on personal attendance tracking and leave management.

| Interface Component    | Description                                  | Key Actions/Data Points                                                                                                     |
| :--------------------- | :------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Personal Dashboard** | Quick access to personal status and actions. | **Clock-In/Clock-Out Button**, Current Shift Information, Remaining Leave Balance (by type).                                |
| **Time Tracking**      | Interface for recording work time.           | Digital Clock-in/out (with optional location/IP capture), View personal daily/weekly time log.                              |
| **Leave Management**   | Tool for submitting and tracking leave.      | Submit New Leave Request (select type, dates, reason), View status of all submitted requests (Pending, Approved, Rejected). |
| **Personal History**   | Access to individual attendance data.        | Download Personal Attendance Report, View past pay period summaries.                                                        |

## 4. System Architecture and Technical Specifications

To ensure scalability, maintainability, and security, the CAMS is proposed to be built on a modern, robust architecture.

### 4.1. Proposed System Architecture

A **Three-Tier Architecture** is recommended for the CAMS, separating the application into distinct layers: Presentation, Application (Logic), and Data. This separation allows for independent development, deployment, and scaling of each component.

| Tier                     | Component                  | Primary Function                                                                | Technology Consideration                                                                          |
| :----------------------- | :------------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **1. Presentation Tier** | Web Application (Frontend) | User interaction, data display, and form submission.                            | React, Vue.js, or Angular (for a single-page application experience).                             |
| **2. Application Tier**  | API/Backend Services       | Business logic, data processing, security, and communication with the database. | Node.js (Express), Python (Django/Flask), or Java (Spring Boot).                                  |
| **3. Data Tier**         | Database                   | Secure and persistent storage of all system data.                               | **MySQL** (as requested, for relational data integrity), with potential use of Redis for caching. |

### 4.2. Technology Stack Recommendations

| Layer          | Recommended Technology                   | Rationale                                                                                                                   |
| :------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | **React with TypeScript**                | Provides a robust, component-based structure for building complex user interfaces and ensures type safety.                  |
| **Backend**    | **Node.js (Express) or Python (Django)** | Offers high performance for API development and a large ecosystem of libraries for tasks like authentication and reporting. |
| **Database**   | **MySQL**                                | Chosen as requested. Known for its wide adoption, robust performance, and strong support for transactional data integrity.  |
| **Deployment** | **Docker and Kubernetes**                | Enables containerization for consistent environments and orchestration for scalable, resilient deployment.                  |

### 4.3. Advanced Company Features

In addition to the core features, the CAMS includes advanced functionalities tailored for a modern corporate environment:

| Feature Category                         | Advanced Functionality               | Benefit to the Company                                                                                                                                                                                      |
| :--------------------------------------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Biometric Security (Optional Module)** | **Facial Recognition Integration**   | Provides an **optional**, fast, secure, and touchless method for attendance recording, minimizing "buddy punching" and ensuring identity verification. This feature can be enabled based on company policy. |
| **Compliance & Audit**                   | **Real-time Compliance Alerts**      | Automatically flags potential labor law violations (e.g., excessive overtime, missed breaks) based on pre-configured rules.                                                                                 |
| **Workforce Planning**                   | **Capacity and Utilization Reports** | Analyzes attendance data to provide insights into departmental capacity, helping management optimize staffing and resource allocation.                                                                      |
| **Integration**                          | **API for HRIS/Payroll Systems**     | A secure RESTful API allows seamless, automated data exchange with existing Human Resources Information Systems (HRIS) and payroll software.                                                                |
| **Mobile Access**                        | **Dedicated Mobile Application**     | Enables employees to clock in/out, check schedules, and manage leave requests from their personal devices, supporting remote or field-based workers.                                                        |

### 4.4. Facial Recognition Architecture

The **optional** facial recognition feature requires a dedicated service and a secure process for enrollment and verification to ensure both accuracy and data privacy. This module is designed to be plug-and-play, allowing the system to function fully without it if the company chooses not to implement biometrics.

| Component                | Function                                                                                    | Technology Consideration                                                                                                              | Privacy/Security Note                                                            |
| :----------------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| **Enrollment Module**    | Captures an employee's face and generates a unique **biometric template (feature vector)**. | Dedicated web/mobile interface with high-quality camera access and a secure API endpoint.                                             | **NEVER** store the raw image. Only the non-reversible feature vector is stored. |
| **Verification Service** | Compares the live-captured feature vector against the stored template during clock-in/out.  | A dedicated, high-performance microservice (e.g., using Python with a computer vision library like OpenCV and a deep learning model). | The service must be highly secure and only accessible via internal APIs.         |
| **Facial Data Storage**  | Securely stores the non-reversible biometric templates.                                     | A dedicated table in the MySQL database, with strong encryption at rest.                                                              | Access to this table must be restricted to the Verification Service only.        |

### 4.5. Core Data Model (Conceptual)

The data model is updated to reflect the use of MySQL and the inclusion of facial recognition data.

| Entity (Table)     | Key Fields                                                                                                                                            | Relationship                        | Purpose                                                                                  |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- | :--------------------------------------------------------------------------------------- |
| **Users**          | `user_id` (PK), `first_name`, `last_name`, `email`, `password_hash`, `role_id` (FK), `department_id` (FK)                                             | One-to-Many with Roles, Departments | Stores all employee and system user information.                                         |
| **UserBiometrics** | `biometric_id` (PK), `user_id` (FK), `feature_vector` (BLOB/VARBINARY), `enrollment_date`                                                             | One-to-One with Users               | **New Table:** Securely stores the non-reversible facial feature vector for recognition. |
| **Roles**          | `role_id` (PK), `role_name` (Admin, Manager, Employee)                                                                                                | One-to-Many with Users              | Defines access levels and permissions.                                                   |
| **Departments**    | `department_id` (PK), `department_name`, `manager_id` (FK to Users)                                                                                   | One-to-Many with Users              | Organizes employees into functional groups.                                              |
| **TimeEntries**    | `entry_id` (PK), `user_id` (FK), `clock_in_time`, `clock_out_time`, `ip_address`, `status`, **`verification_method`** (e.g., 'Face', 'Web', 'Mobile') | One-to-Many with Users              | Records the actual attendance logs, now including the verification method.               |
| **LeaveRequests**  | `request_id` (PK), `user_id` (FK), `leave_type_id` (FK), `start_date`, `end_date`, `reason`, `status`, `manager_id` (FK)                              | One-to-Many with Users, LeaveTypes  | Manages the submission and approval of time-off requests.                                |
| **LeaveTypes**     | `type_id` (PK), `type_name` (Sick, Vacation), `max_days`                                                                                              | One-to-Many with LeaveRequests      | Defines the different categories of leave available.                                     |
