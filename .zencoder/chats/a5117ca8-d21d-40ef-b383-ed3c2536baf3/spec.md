# Technical Specification: Employee Shift Assignment

## Technical Context
- **Backend**: Django REST Framework (DRF)
- **Frontend**: React with Material UI (MUI)
- **Data Models**: `Shift`, `EmployeeShift`, `AttendanceSession`
- **Primary Dependencies**: `rest_framework`, `@mui/material`

## Technical Implementation Brief
The feature involves linking employees to specific shifts via the `EmployeeShift` model. While the backend has basic structures, the frontend needs to implement the logic to assign and manage these links.

### Key Decisions:
1. **API Refinement**: Enhance `EmployeeShiftViewSet` to support standard CRUD operations.
2. **UI Integration**: Add shift assignment capabilities within the `UserManagement` component.
3. **Data Flow**: Frontend fetches available shifts and current employee assignments, allowing HR/Managers to create or update links.

## Source Code Structure
- `backend/apps/attendance/api/views.py`: `EmployeeShiftViewSet` updates.
- `backend/apps/attendance/services/employee_shift_service.py`: Service layer logic for assignments.
- `frontend/src/pages/UserManagement.jsx`: UI for managing shift assignments.
- `frontend/src/services/api.service.js`: API call methods.

## Contracts
### API Endpoints:
- `GET /api/employee-shifts/`: List assignments (filter by employee).
- `POST /api/employee-shifts/`: Create assignment.
- `DELETE /api/employee-shifts/{id}/`: Remove assignment.

### Data Models:
**EmployeeShift**:
- `id` (UUID)
- `employee` (FK to Employee)
- `shift` (FK to Shift)

## Delivery Phases
1. **Phase 1: Backend CRUD**: Complete the `EmployeeShiftViewSet` implementation.
2. **Phase 2: Frontend API Integration**: Implement service calls for employee-shifts.
3. **Phase 3: Shift Assignment UI**: Build the UI section in `UserManagement` for assigning shifts.

## Verification Strategy
- **Backend**: Use `curl` or Postman to verify API endpoints.
- **Frontend**: Manual verification of UI components and successful API integration.
- **Helper Scripts**: A simple Python script to seed test data for shifts and employees.
