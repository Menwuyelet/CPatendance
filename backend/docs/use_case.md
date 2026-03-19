# Use Cases: Accounts And Employees

This document is derived from current code implementation in:
- accounts API views/serializers/services
- employees API views/serializers/services

Only implemented behavior is documented.

## Common Preconditions

- Authenticated endpoints require JWT Bearer token.
- Role checks are done on `request.user` via:
  - `is_admin()`
  - `is_department_manager()`

## Accounts App

## 1. User Login

### Goal
Authenticate with employee code and password, receive JWT tokens and minimal user data.

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
```json
{
  "full_name": "Jane Doe",
  "phone_number": "+250700000000",
  "roles": [2],
  "department": "2e39f5f8-a3a5-4f48-b84d-8e8cddccde9a"
}
```

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
