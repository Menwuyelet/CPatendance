# Backend Documentation

## Overview

This backend is a Django + Django REST Framework API for attendance management.

Current backend capabilities relevant to this documentation:
- Authentication with JWT (`/api/auth/login/`, `/api/auth/refresh/`).
- Account management via the `accounts` app (user CRUD plus self-service password change and admin reset/delete flows).
- Employee and department management via the `employees` app.
- Role-based access control using role membership on `accounts.User` (`ADMIN`, `MANAGER`, `EMPLOYEE`).

Important implementation truths from current code:
- Global API default permission is authenticated access (`IsAuthenticated`) unless overridden.
- Accounts and Employees viewsets explicitly enforce role checks per action.
- Accounts app uses generated `employee_code` and generated password when creating users through API.
- Employee creation is not exposed in employees API (`EmployeeViewSet` disables `POST`).

## Documents

- Use cases and behavior examples: [use_case.md](./use_case.md)
- API contract (accounts + employees): [api_contract.md](./api_contract.md)

## Scope Notes

These docs describe only what is currently implemented in code for:
- `accounts` app endpoints
- `employees` app endpoints
- auth endpoints used by accounts login/refresh

No planned or hypothetical behavior is documented.
