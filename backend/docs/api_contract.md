# API Contract: Accounts And Employees

This contract documents currently implemented endpoints under:
- `/api/auth/*`
- `/api/accounts/*`
- `/api/employees/*`
- `/api/biometrics/*`

Base behavior:
- Authentication: JWT (`Authorization: Bearer <token>`)
- Default permission: authenticated user
- Endpoint-specific permission overrides are listed below

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
Public (login endpoint).

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
