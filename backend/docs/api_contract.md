# API Contract: Accounts And Employees

This contract documents currently implemented endpoints under:
- `/api/auth/*`
- `/api/accounts/*`
- `/api/employees/*`
- `/api/biometrics/*`

Base behavior:
- Authentication: JWT (`Authorization: Bearer <token>`) issued **only to ADMIN or MANAGER roles**. Employees cannot obtain tokens.
- Default permission: authenticated user (therefore effectively ADMIN/MANAGER unless otherwise noted).
- Endpoint-specific permission overrides are listed below.

## Auth Endpoints

## POST /api/auth/login/

### Purpose
Issue access/refresh tokens from `employee_code` + password.

### Request Body
```json
{
  "employee_code": "string",
  "password": "string"
}
```

### Success Response (200)
```json
{
  "refresh": "string",
  "access": "string",
  "user": {
    "id": "uuid",
    "employee_code": "string",
    "roles": ["ADMIN"]
  }
}
```

### Error Response (400)
```json
{
  "error": "Invalid employee code or password. Please check your credentials and ensure you have registered.",
  "detail": "string"
}
```

### Permission
Restricted: Only users with role ADMIN or MANAGER may receive tokens. Other roles receive 400 with role error.

## POST /api/auth/refresh/

### Purpose
Issue new access token from refresh token.

### Request Body
```json
{
  "refresh": "string"
}
```

### Success Response (200)
```json
{
  "access": "string"
}
```

### Permission
Public (token refresh endpoint).

## Accounts Endpoints

## GET /api/accounts/users/

### Permission
Authenticated + Manager or Admin

### Request Body
None

### Success Response (200)
```json
{
  "users": [
    {
      "id": "uuid",
      "employee_code": "string",
      "full_name": "string",
      "phone_number": "string",
      "is_active": true,
      "is_staff": false,
      "roles": [
        {
          "id": 1,
          "name": "ADMIN"
        }
      ],
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

## POST /api/accounts/users/

### Permission
Authenticated + Manager or Admin

### Request Body
Content type: `multipart/form-data`

Fields:
- `full_name`: string
- `phone_number`: string
- `roles`: array of role ids
- `department`: uuid (optional)
- `face_image`: image file (required when role includes EMPLOYEE or MANAGER)

### Notes
- `employee_code` and `password` are read-only in serializer input.
- Server generates `employee_code` and random password.
- If roles include `EMPLOYEE` or `MANAGER`, linked `employees.Employee` is created.
- If roles include `EMPLOYEE` or `MANAGER`, face enrollment is executed during the same user creation transaction.
- Enrollment binds to the newly generated employee code by loading the created user with that generated code.
- Manager can create users only with `EMPLOYEE` role.
- Manager cannot create `MANAGER` or `ADMIN` users.
- Manager-created employee is assigned to manager's department.

### Success Response (201)
`UserSerializer` payload:
```json
{
  "id": "uuid",
  "employee_code": "string",
  "full_name": "string",
  "phone_number": "string",
  "is_active": true,
  "is_staff": false,
  "roles": [
    {
      "id": 2,
      "name": "MANAGER"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## GET /api/accounts/users/{id}/

### Permission
Authenticated + Manager or Admin

### Request Body
None

### Success Response (200)
`UserSerializer` payload.

## PUT/PATCH /api/accounts/users/{id}/

### Permission
Authenticated + Admin

### Request Body
`UserUpdateSerializer` writable fields:
```json
{
  "is_active": true,
  "roles": [1, 2]
}
```

### Success Response (200)
```json
{
  "employee_code": "string",
  "is_active": true,
  "roles": [1, 2]
}
```

### Notes
- `employee_code` is read-only.

## DELETE /api/accounts/users/{id}/

### Permission
Authenticated + Admin

### Request Body
None

### Success Response (204)
No response body.

## GET /api/accounts/users/me/

### Permission
Authenticated

### Request Body
None

### Success Response (200)
`UserSerializer` payload for `request.user`.

## PATCH/PUT /api/accounts/users/change_password/

### Permission
Authenticated

### Request Body
```json
{
  "current_password": "string",
  "new_password": "string",
  "password_confirmation": "string"
}
```

### Success Response (200)
```json
{
  "message": "Password changed successfully."
}
```

### Error Responses (400)
```json
{ "error": "Current password is required." }
```
```json
{ "error": "New password is required." }
```
```json
{ "error": "Password confirmation is required." }
```
```json
{ "error": "Current password is incorrect." }
```
```json
{ "error": "New password and confirmation do not match." }
```

## PATCH/PUT /api/accounts/users/reset_password/

### Permission
Authenticated + Admin

### Request Body
```json
{
  "employee_code": "string"
}
```

### Success Response (200)
```json
{
  "message": "Password reset successfully.",
  "new_password": "string"
}
```

### Error Responses
- `400` when employee code missing.
- `404` when user with employee code does not exist.

## DELETE /api/accounts/users/delete_user/

### Permission
Authenticated + Admin

### Request Body
```json
{
  "employee_code": "string"
}
```

### Success Response (200)
```json
{
  "message": "User deleted successfully."
}
```

### Error Response (404)
```json
{
  "error": "User with the provided employee code does not exist."
}
```

## Employees Endpoints

## GET /api/employees/employees/

### Permission
Authenticated + Manager or Admin

### Query Parameters
- `search`: applies to `user__employee_code`, `user__full_name`
- `ordering`: one of `user__full_name`, `user__employee_code`, `created_at`

### Request Body
None

### Success Response (200)
Paginated `EmployeeSerializer` response:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "employee_code": "string",
        "full_name": "string",
        "phone_number": "string",
        "is_active": true,
        "is_staff": false,
        "roles": [
          {
            "id": 3,
            "name": "EMPLOYEE"
          }
        ],
        "created_at": "datetime",
        "updated_at": "datetime"
      },
      "department": {
        "id": "uuid",
        "name": "string",
        "code": "string",
        "manager": "uuid",
        "is_active": true
      },
      "photo": "string-or-null",
      "is_active": true,
      "created_at": "datetime"
    }
  ]
}
```

### Scope Rules
- Admin: all employees.
- Manager: employees in manager's department.

## GET /api/employees/employees/{id}/

### Permission
Authenticated + Manager or Admin

### Request Body
None

### Success Response (200)
`EmployeeSerializer` payload.

## PUT/PATCH /api/employees/employees/{id}/

### Permission
Authenticated + Admin

### Request Body
`EmployeeUpdateSerializer` fields:
```json
{
  "department": "uuid",
  "photo": "file-or-null",
  "is_active": true
}
```

### Success Response (200)
`EmployeeUpdateSerializer` payload:
```json
{
  "department": "uuid",
  "photo": "string-or-null",
  "is_active": true
}
```

## DELETE /api/employees/employees/{id}/

### Permission
Authenticated + Admin

### Request Body
None

### Success Response (204)
No response body.

## POST /api/employees/employees/

### Status
Not allowed.

### Reason
`EmployeeViewSet.http_method_names` excludes `post`.

## GET /api/employees/departments/

### Permission
Authenticated + Manager or Admin

### Request Body
None

### Success Response (200)
Paginated `DepartmentSerializer` response:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "code": "string",
      "manager": "uuid-or-null",
      "is_active": true
    }
  ]
}
```

## POST /api/employees/departments/

### Permission
Authenticated + Manager or Admin

### Request Body
```json
{
  "name": "string",
  "manager": "uuid-or-null",
  "is_active": true
}
```

### Success Response (201)
`DepartmentSerializer` payload.

### Notes
- `code` is read-only in serializer, so it cannot be set from API input.

## GET /api/employees/departments/{id}/

### Permission
Authenticated + Manager or Admin

### Success Response (200)
`DepartmentSerializer` payload.

## PUT/PATCH /api/employees/departments/{id}/

### Permission
Authenticated + Admin

### Request Body
```json
{
  "name": "string",
  "manager": "uuid-or-null",
  "is_active": true
}
```

### Success Response (200)
`DepartmentSerializer` payload.

## DELETE /api/employees/departments/{id}/

### Permission
Authenticated + Admin

### Success Response (204)
No response body.

## Biometrics Endpoints

## Enrollment Lifecycle

- Dedicated `POST /api/biometrics/face/enroll/` endpoint is removed.
- Face enrollment is performed only during `POST /api/accounts/users/` when role includes `EMPLOYEE` or `MANAGER`.

## GET /api/biometrics/profiles/

### Permission
Authenticated + Manager or Admin

### Request Body
None

### Success Response (200)
Array of `BiometricProfileSerializer` entries:
```json
[
  {
    "id": 12,
    "employee_code": "string",
    "employee_full_name": "string",
    "biometric_type": "FACE",
    "is_active": true,
    "created_at": "datetime",
    "updated_at": "datetime",
    "last_used": "datetime-or-null"
  }
]
```

### Scope Rules
- Admin: all profiles.
- Manager: profiles for users in manager's department.

## PATCH /api/biometrics/profiles/{id}/

### Permission
Authenticated + Manager or Admin, plus biometric policy check on target profile

### Request Body
```json
{
  "is_active": true
}
```

### Success Response (200)
`BiometricProfileSerializer` payload.

### Error Responses
- `403` when policy check fails.
- `400` when `is_active` is missing.

## PUT /api/biometrics/profiles/{id}/

### Permission
Authenticated + Manager or Admin, plus biometric policy check on target profile

### Request Body
Content type: `multipart/form-data` or `application/json`

Supported fields:
- `image`: image file (optional, re-enrolls face template)
- `is_active`: boolean (optional)

At least one of `image` or `is_active` must be provided.

### Success Response (200)
`BiometricProfileSerializer` payload.

### Error Responses
- `403` when policy check fails.
- `400` when both `image` and `is_active` are missing.
- `400` when face is not detected in provided image.

## Attendance Endpoints

### Status and Phases (applies to all attendance responses)
- `AttendanceRecord.status` values: `PRESENT`, `LATE`, `ABSENT`, `ON_LEAVE`, `EARLY_LEAVE`.
- Session phases: `CHECK_IN`, `CHECK_OUT`, `CLOSED` (one session per shift/day intended).

### POST /api/attendance-sessions/

**Purpose** Start a session for a shift (check-in phase).

**Permission** Authenticated + Manager/Admin.

**Request Body**
```json
{ "shift_id": 123 }
```

**Validation**
- Shift must apply to today.
- Current time must be inside shift window (overnight handled when end < start).

**Success Response (201)**
```json
{ "session_id": 10, "detail": "Attendance session started" }
```

**Notes** Creates `phase=CHECK_IN`, `is_active=true`. Uniqueness per shift/day not enforced.

### POST /api/attendance-sessions/{id}/sleep/

**Purpose** Transition a session from check-in to checkout window and process check-in attendance.

**Permission** Authenticated + Manager/Admin.

**Request Body (optional)**
```json
{ "leave_employee_codes": ["EMP001", "EMP002"] }
```

**Response (200)** `{ "detail": "Session moved to checkout phase" }`

### POST /api/attendance-sessions/{id}/activate-checkout/

**Purpose** Reactivate a sleeping session for checkout captures.

**Permission** Authenticated + Manager/Admin.

**Response (200)** `{ "detail": "Session activated for checkout" }`

### DELETE /api/attendance-sessions/{id}/

**Purpose** Close a session (end of checkout window) and finalize attendance.

**Permission** Authenticated + Manager/Admin.

**Request Body (optional)**
```json
{ "leave_employee_codes": ["EMP001", "EMP002"] }
```

**Behavior**
- If already closed → 400.
- Processes checkout window (including leave codes/long-term leave) and finalizes statuses.

**Success Response (200)**
```json
{ "session_id": 10, "entries_count": 5, "status": "closed" }
```

### GET /api/attendance-manage-sessions/

**Purpose** List sessions with optional filters.

**Permission**
- Admin: all sessions.
- Manager: sessions where `shift.department == manager.department`.

**Query Params**
- `active=true|false` (optional)
- `shift_id=<id>` (optional)

**Response (200)** Paginated `AttendanceSessionSerializer` list.

### GET /api/attendance-manage-sessions/{id}/

**Purpose** Retrieve one session.

**Permission** Admin, or department Manager when `session.shift.department` matches manager's department.

### PATCH /api/attendance-manage-sessions/{id}/

**Purpose** Partial update (primarily to flip active state).

**Permission** Admin or department Manager (department-scoped via session shift).

### POST /api/attendance-check-in/

**Purpose** Upload a face image to record attendance for the current active session.

**Permission** Authenticated + Manager/Admin.

**Request** `multipart/form-data` with `image` file.

**Responses**
- `201` `{ "detail": "Attendance recorded successfully" }`
- `400` with details: "No active attendance session", "Face not clear. Please try again.", "No face detected", or "Attendance already recorded".

**Behavior** Uses the latest active session in `CHECK_IN` phase. Stores `recognized_at` on the session entry.

### POST /api/attendance-check-out/

**Purpose** Upload a face image to record checkout for the current active session in checkout phase.

**Permission** Authenticated + Manager/Admin.

**Request** `multipart/form-data` with `image` file.

**Responses**
- `201` `{ "detail": "Checkout recorded successfully" }`
- `400` with details: "No active attendance session for checkout", "Face not clear. Please try again.", "No face detected", or "Attendance already recorded".

**Behavior** Uses the latest active session in `CHECK_OUT` phase. Stores `checkout_recognized_at` on the session entry.

### GET /api/attendance/

**Purpose** List attendance records.

**Permission**
- Admin: all.
- Manager: employees in manager's department (if department present); otherwise none.
- Employee: only own records when `mine=true`.

**Query Params**
- `date__gte`, `date__lte`
- `mine=true`
- `employee_id`
- `shift_id`

**Response (200)** Paginated `AttendanceSerializer` list.

### GET /api/attendance/{id}/

**Purpose** Retrieve an attendance record.

**Permission** Admin; Manager scoped to department; employee can access own record.

### PATCH/PUT /api/attendance/{id}/

**Purpose** Manual correction.

**Permission** Admin or department Manager (department-scoped via employee department).

### GET /api/shifts/

**Purpose** List shifts.

**Permission** Admin/Manager.

### POST /api/shifts/

**Purpose** Create shift.

**Permission** Admin/Manager.

### GET /api/employee-shifts/

**Purpose** List employee-to-shift assignments.

**Permission** Admin/Manager with `CanManageEmployeeShift` policy.

### POST /api/employee-shifts/

**Purpose** Assign employee to shift.

**Permission** Admin/Manager with policy check.

### DELETE /api/employee-shifts/{id}/

**Purpose** Remove an employee-to-shift assignment.

**Permission** Admin/Manager with policy check.

### GET /api/employee-leaves/

**Purpose** List long-term leave windows.

**Permission** Admin; department Manager limited to own department employees.

### POST /api/employee-leaves/

**Purpose** Create leave window.

**Permission** Admin; department Manager scoped to own department employees.

**Request Body**
```json
{ "employee": "uuid", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "reason": "string" }
```

### GET /api/employee-leaves/{id}/

**Purpose** Retrieve leave window.

**Permission** Admin; department Manager scoped to own department employees.

### PUT/PATCH /api/employee-leaves/{id}/

**Purpose** Update leave window.

**Permission** Admin; department Manager scoped to own department employees.

### DELETE /api/employee-leaves/{id}/

**Purpose** Delete leave window.

**Permission** Admin; department Manager scoped to own department employees.

### Notes on Leave Handling
- Long-term leave model `EmployeeLeave` exists and is consumed during attendance processing to set `status=ON_LEAVE` and clear check-in/out times when date falls inside the leave window.
- Per-session leave codes can be supplied when processing check-in/checkout to force `ON_LEAVE` for that session date (via `leave_employee_codes` on sleep/close endpoints).
