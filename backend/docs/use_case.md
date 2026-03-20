# Use Cases: Accounts And Employees

This document is derived from current code implementation in:
- accounts API views/serializers/services
- employees API views/serializers/services
- biometrics API views/serializers/services

Only implemented behavior is documented.

## Common Preconditions

- Authenticated endpoints require JWT Bearer token.
- JWT tokens are only issued to ADMIN or MANAGER roles; EMPLOYEE cannot authenticate.
- Role checks are done on `request.user` via:
  - `is_admin()`
  - `is_department_manager()`

## Seed/Test Credentials

- Admin: employee_code `HAC-1001`, password `plain-password`, roles: ADMIN (also staff + superuser).

## Accounts App

## 1. User Login

### Goal
Authenticate (ADMIN or MANAGER only) with employee code and password, receive JWT tokens and minimal user data. Employees cannot log in.

### Endpoint
`POST /api/auth/login/`

### Request Example
```json
{
  "employee_code": "HAC-1001",
  "password": "plain-password"
}
```

### Success Response Example
```json
{
  "refresh": "<refresh-token>",
  "access": "<access-token>",
  "user": {
    "id": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
    "employee_code": "HAC-1001",
    "roles": ["ADMIN"]
  }
}
```

### Failure Response Example
```json
{
  "error": "Invalid employee code or password. Please check your credentials and ensure you have registered.",
  "detail": "No active account found with the given credentials"
}
```

## 2. Admin Creates User

### Goal
Create a new `accounts.User`; optionally create linked `employees.Employee` when role requires employee profile.

### Endpoint
`POST /api/accounts/users/`

### Permission
Authenticated + Admin

### Request Example
Content type: `multipart/form-data`

Form fields example:
- `full_name`: `Jane Doe`
- `phone_number`: `+250700000000`
- `roles`: `2`
- `department`: `2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a`
- `face_image`: `<uploaded image file>`

### Success Response Example
```json
{
  "id": "c6b8a5b2-0be8-4ef4-92ed-0ab0b5f7404f",
  "employee_code": "HAC-1002",
  "full_name": "Jane Doe",
  "phone_number": "+250700000000",
  "is_active": true,
  "is_staff": false,
  "roles": [
    {
      "id": 2,
      "name": "MANAGER"
    }
  ],
  "created_at": "2026-03-20T10:00:00Z",
  "updated_at": "2026-03-20T10:00:00Z"
}
```

### Truth Notes
- `employee_code` and `password` are read-only in create serializer input.
- Backend generates both values using service functions.
- If assigned role includes `EMPLOYEE` or `MANAGER`, service creates linked `employees.Employee`.
- If assigned role includes `EMPLOYEE` or `MANAGER`, `face_image` is required and biometric face enrollment is executed during the same user creation transaction.
- Enrollment is attached to the newly generated employee code (user is fetched by generated `employee_code` before enrollment call).

## 2.1 Manager Creates Employee User (Not Manager/Admin)

### Goal
Allow department manager to create employee users only.

### Endpoint
`POST /api/accounts/users/`

### Permission
Authenticated + Manager or Admin

### Truth Notes
- Manager can create users only when all requested roles are exactly `EMPLOYEE`.
- Manager cannot create `MANAGER` or `ADMIN` users.
- Manager-created employee is forced into manager's own department.
- Enrollment remains creation-only, so manager must provide `face_image` for employee creation.

## 3. Manager/Admin List Users

### Goal
Get users visible to caller scope.

### Endpoint
`GET /api/accounts/users/`

### Permission
Authenticated + Manager or Admin

### Success Response Example
```json
{
  "users": [
    {
      "id": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
      "employee_code": "HAC-1001",
      "full_name": "Admin User",
      "phone_number": "+250700000001",
      "is_active": true,
      "is_staff": true,
      "roles": [
        {
          "id": 1,
          "name": "ADMIN"
        }
      ],
      "created_at": "2026-03-20T09:00:00Z",
      "updated_at": "2026-03-20T09:00:00Z"
    }
  ]
}
```

### Truth Notes
- Admin gets all users.
- Manager gets users where `employee.department == request.user.employee.department`.
- Response is custom wrapped under `users`.

## 4. Authenticated User Reads Own Profile

### Endpoint
`GET /api/accounts/users/me/`

### Permission
Authenticated

### Success Response Example
```json
{
  "id": "8ef42c03-90e2-4ea2-9a0f-f2e89f7547f8",
  "employee_code": "HAC-1010",
  "full_name": "Employee User",
  "phone_number": "+250700000010",
  "is_active": true,
  "is_staff": false,
  "roles": [
    {
      "id": 3,
      "name": "EMPLOYEE"
    }
  ],
  "created_at": "2026-03-20T11:00:00Z",
  "updated_at": "2026-03-20T11:00:00Z"
}
```

## 5. Authenticated User Changes Own Password

### Endpoints
- `PATCH /api/accounts/users/change_password/`
- `PUT /api/accounts/users/change_password/`

### Permission
Authenticated

### Request Example
```json
{
  "current_password": "old-pass",
  "new_password": "new-pass-123",
  "password_confirmation": "new-pass-123"
}
```

### Success Response
```json
{
  "message": "Password changed successfully."
}
```

### Failure Response Examples
```json
{
  "error": "Current password is required."
}
```
```json
{
  "error": "Current password is incorrect."
}
```
```json
{
  "error": "New password and confirmation do not match."
}
```

## 6. Admin Resets Password By Employee Code

### Endpoints
- `PATCH /api/accounts/users/reset_password/`
- `PUT /api/accounts/users/reset_password/`

### Permission
Authenticated + Admin

### Request Example
```json
{
  "employee_code": "HAC-1010"
}
```

### Success Response Example
```json
{
  "message": "Password reset successfully.",
  "new_password": "X6$L...generated"
}
```

### Failure Response Example
```json
{
  "error": "User with the provided employee code does not exist."
}
```

## 7. Admin Deletes User By Employee Code

### Endpoint
`DELETE /api/accounts/users/delete_user/`

### Permission
Authenticated + Admin

### Request Example
```json
{
  "employee_code": "HAC-1010"
}
```

### Success Response
```json
{
  "message": "User deleted successfully."
}
```

### Failure Response
```json
{
  "error": "User with the provided employee code does not exist."
}
```

## Employees App

## 1. Manager/Admin List Employees

### Endpoint
`GET /api/employees/employees/`

### Permission
Authenticated + Manager or Admin

### Query Parameters
- `search`: searches by `user__employee_code` and `user__full_name`
- `ordering`: supports `user__full_name`, `user__employee_code`, `created_at`

### Success Response Example
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "0bb13d9f-ff9d-4a50-bc7d-c8e5b4f58ac3",
      "user": {
        "id": "8ef42c03-90e2-4ea2-9a0f-f2e89f7547f8",
        "employee_code": "HAC-1010",
        "full_name": "Employee User",
        "phone_number": "+250700000010",
        "is_active": true,
        "is_staff": false,
        "roles": [
          {
            "id": 3,
            "name": "EMPLOYEE"
          }
        ],
        "created_at": "2026-03-20T11:00:00Z",
        "updated_at": "2026-03-20T11:00:00Z"
      },
      "department": {
        "id": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a",
        "name": "Engineering",
        "code": "ENG01",
        "manager": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
        "is_active": true
      },
      "photo": null,
      "is_active": true,
      "created_at": "2026-03-20T11:00:00Z"
    }
  ]
}
```

### Truth Notes
- Admin gets all employees.
- Manager gets employees filtered by `department == request.user.employee.department`.
- List is paginated by default DRF page pagination.

## 2. Admin Updates Employee

### Endpoints
- `PATCH /api/employees/employees/{employee_id}/`
- `PUT /api/employees/employees/{employee_id}/`

### Permission
Authenticated + Admin

### Request Example
```json
{
  "department": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a",
  "is_active": true
}
```

### Success Response Example
```json
{
  "department": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a",
  "photo": null,
  "is_active": true
}
```

### Truth Notes
- Writable fields: `department`, `photo`, `is_active`.
- `POST /api/employees/employees/` is not allowed (`http_method_names` excludes post).

## Attendance App

### 1. Manager/Admin runs attendance session (check-in → checkout)

- Start session: `POST /api/attendance-sessions/` with `shift_id` during shift window on a valid shift day (overnight shifts handled by rolling end to next day).
- Check-in captures: `POST /api/attendance-check-in/` with `image` (multipart) uses latest active `CHECK_IN` session; duplicate employee returns 400.
- Sleep (end check-in window): `POST /api/attendance-sessions/{id}/sleep/` optionally with `leave_employee_codes`; marks ON_LEAVE for leave codes/active leave windows, marks ABSENT for non-recognized shift employees, and keeps PRESENT/LATE for recognized ones.
- Activate checkout: `POST /api/attendance-sessions/{id}/activate-checkout/` reopens session for checkout captures.
- Checkout captures: `POST /api/attendance-check-out/` with `image` (multipart) uses latest active `CHECK_OUT` session; duplicate checkout returns 400.
- Close: `DELETE /api/attendance-sessions/{id}/` (optional `leave_employee_codes`) finalizes statuses (EARLY_LEAVE if checkout before end minus 15m, LATE if check-in after grace, ABSENT if missing timestamps, ON_LEAVE preserved) and deactivates session.

### 2. Attendance records visibility and correction

- List: `GET /api/attendance/` — Admin sees all; Manager sees department employees; Employee can scope to self with `mine=true`. Filters: `date__gte`, `date__lte`, `employee_id`, `shift_id`.
- Retrieve: `GET /api/attendance/{id}/` with same scoping rules.
- Correct: `PATCH/PUT /api/attendance/{id}/` allowed for Admin or department Manager; updates status/timestamps and sets `taken_by` to caller.

### 3. Shifts and assignments

- Manage shifts: `GET/POST /api/shifts/`, `PATCH/PUT/DELETE /api/shifts/{id}/` for Admin/Manager.
- Assign/remove employee shift: `GET/POST /api/employee-shifts/`, `DELETE /api/employee-shifts/{id}/` for Admin/Manager (policy enforced). Business rule: max 2 applicable shifts per employee per day; overnight shifts allowed.

### 4. Leave windows

- CRUD leave: `GET/POST /api/employee-leaves/`, `GET/PUT/PATCH/DELETE /api/employee-leaves/{id}/` — Admin global, Manager limited to own department employees.
- Leave applied automatically during sleep/close to set `status=ON_LEAVE` and clear timestamps for the session date.

### 5. Status evaluation (implemented logic)

- Check-in grace: 15 minutes after shift start → PRESENT else LATE.
- Final status priority: ON_LEAVE > missing check-in/out → ABSENT > checkout before shift end minus 15m → EARLY_LEAVE > late check-in → LATE > otherwise PRESENT.

## 3. Manager/Admin List Departments

### Endpoint
`GET /api/employees/departments/`

### Permission
Authenticated + Manager or Admin

### Success Response Example
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a",
      "name": "Engineering",
      "code": "ENG01",
      "manager": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
      "is_active": true
    }
  ]
}
```

### Truth Notes
- Department serializer marks `id` and `code` as read-only.

## 4. Admin Updates/Deletes Department

### Endpoints
- `PATCH /api/employees/departments/{department_id}/`
- `PUT /api/employees/departments/{department_id}/`
- `DELETE /api/employees/departments/{department_id}/`

### Permission
Authenticated + Admin

### Update Request Example
```json
{
  "name": "Engineering Core",
  "manager": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
  "is_active": true
}
```

### Update Response Example
```json
{
  "id": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a",
  "name": "Engineering Core",
  "code": "ENG01",
  "manager": "f4ad3f96-5e8d-4d0c-a6fb-c5fd6b6d2fcb",
  "is_active": true
}
```

## Biometrics App

## 1. Face Enrollment Happens Only At User Creation

### Truth Notes
- Dedicated enrollment endpoint was removed.
- Face enrollment is executed only during `POST /api/accounts/users/` for employee/manager-role creation.
- Face template update after creation is handled through biometric profile update endpoint.

## 2. Admin/Manager Lists Biometric Profiles

### Endpoint
`GET /api/biometrics/profiles/`

### Permission
Authenticated + Manager or Admin

### Success Response Example
```json
[
  {
    "id": 12,
    "employee_code": "HAC-1010",
    "employee_full_name": "Employee User",
    "biometric_type": "FACE",
    "is_active": true,
    "created_at": "2026-03-20T12:00:00Z",
    "updated_at": "2026-03-20T12:00:00Z",
    "last_used": "2026-03-20T12:00:00Z"
  }
]
```

### Truth Notes
- Admin sees all biometric profiles.
- Manager sees only profiles in manager department scope.

## 3. Admin/Manager Updates Biometric Profile (Including Face Re-enrollment)

### Endpoint
`PUT /api/biometrics/profiles/{profile_id}/`

### Permission
Authenticated + Manager or Admin (with policy scope check)

### Request Example
Content type: `multipart/form-data` or `application/json`

Example with metadata update only:
```json
{
  "is_active": false
}
```

Example with face re-enrollment:
- `image`: `<uploaded image file>`
- `is_active`: `true` (optional)

### Success Response Example
```json
{
  "id": 12,
  "employee_code": "HAC-1010",
  "employee_full_name": "Employee User",
  "biometric_type": "FACE",
  "is_active": false,
  "created_at": "2026-03-20T12:00:00Z",
  "updated_at": "2026-03-20T12:30:00Z",
  "last_used": "2026-03-20T12:00:00Z"
}
```

### Failure Response Examples
```json
{
  "detail": "Not allowed"
}
```
```json
{
  "detail": "Provide at least one of `image` or `is_active`."
}
```
```json
{
  "detail": "No face detected"
}
```

## Attendance App

### 1. Start Session (Check-in phase)

- **Goal:** Manager/Admin starts a single session per shift/day to capture check-ins. Session remains in `CHECK_IN` phase until put to sleep.
- **Endpoint:** `POST /api/attendance-sessions/`
- **Permission:** Authenticated + Manager/Admin
- **Preconditions:**
  - Shift applies to today.
  - Current time is within shift window (start/end); overnight shifts are allowed when end < start.

### 2. Capture Check-in (facial)

- **Goal:** Record first recognition per employee for the check-in window.
- **Endpoint:** `POST /api/attendance-check-in/` with `image` file.
- **Permission:** Authenticated (typically kiosk/terminal); relies on presence of an active session.
- **Behavior:**
  - Uses latest active session.
  - Stores `AttendanceSessionEntry.recognized_at` for matched employee; duplicate attempts return "already recorded".
  - Returns friendly errors for no session, no face detected, or no match.

### 3. Put Session to Sleep (transition to checkout window)

- **Goal:** Stop check-ins, process check-in attendance, and prepare for checkout.
- **Endpoint:** `POST /api/attendance-sessions/{session_id}/sleep/`
- **Permission:** Authenticated + Manager/Admin
- **Payload:** `{ "leave_employee_codes": ["EMP001", "EMP002"] }` (optional)
- **Processing:**
  - Marks session `is_active=false`, `phase=CHECK_OUT`, captures `check_in_processed_at`.
  - Processes check-in attendance:
    - Employees supplied via leave codes are marked `ON_LEAVE` for the session date.
    - Employees in active long-term leave windows are marked `ON_LEAVE`.
    - Employees with check-in entries get `check_in_time` and status `PRESENT` or `LATE` (15 min grace).
    - All other shift employees are marked `ABSENT` with missing check-in.

### 4. Activate Checkout Window

- **Goal:** Re-open the same session to collect checkout faces.
- **Endpoint:** `POST /api/attendance-sessions/{session_id}/activate-checkout/`
- **Permission:** Authenticated + Manager/Admin
- **Behavior:** sets `is_active=true`, keeps `phase=CHECK_OUT`.

### 5. Capture Checkout (facial)

- **Goal:** Record first checkout recognition per employee for the checkout window.
- **Endpoint:** `POST /api/attendance-check-out/` with `image` file.
- **Permission:** Authenticated + Manager/Admin
- **Behavior:** Stores `AttendanceSessionEntry.checkout_recognized_at` for matched employee during checkout phase; duplicates are rejected.

### 6. Close Session

- **Goal:** Finish checkout window, finalize attendance, and lock the session.
- **Endpoint:** `DELETE /api/attendance-sessions/{session_id}/`
- **Permission:** Authenticated + Manager/Admin
- **Payload:** `{ "leave_employee_codes": ["EMP001", "EMP002"] }` (optional)
- **Behavior:**
  - Marks session inactive and closed.
  - Checkout processing applies:
    - Per-session leave codes and long-term leave → status `ON_LEAVE`, clears times.
    - Sets `check_out_time` from checkout captures when present.
    - Computes final status via `evaluate_final_status`:
      - `ON_LEAVE` if already set.
      - Missing check-in or checkout → `ABSENT`.
      - Checkout < shift end minus 15 minutes → `EARLY_LEAVE`.
      - Check-in > shift start plus 15 minutes → `LATE`.
      - Otherwise `PRESENT`.
  - Session entries remain for audit; `AttendanceRecord` stores final status and times.

### 7. Long-term Leave Windows

- **Model:** `EmployeeLeave` (`employee`, `start_date`, `end_date`, `reason`, `created_by`).
- **Usage:** During check-in or checkout processing, any date within the window sets `status=ON_LEAVE` and clears in/out times. After `end_date`, normal absence rules apply (becomes `ABSENT` if not present).
- **API:** CRUD endpoints not yet exposed; manage via admin/seed until added.

### 8. Per-session On-Leave Codes

- **Input:** Manager/Admin can provide employee codes when putting the session to sleep or closing.
- **Effect:** Those employees are treated as `ON_LEAVE` for the session date (both check-in/out cleared, status `ON_LEAVE`).
