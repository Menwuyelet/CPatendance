# Feature Specification: Employee Shift Assignment

## User Stories

### User Story 1 - HR/Manager Assigns Shift to Employee

**Acceptance Scenarios**:

1. **Given** an HR or Manager user is on the Employee Directory page, **When** they select an employee and choose a shift to assign, **Then** the assignment is saved and visible in the system.
2. **Given** an employee has an existing shift assignment, **When** an HR or Manager updates the assignment to a different shift, **Then** the old assignment is replaced or updated accordingly.

### User Story 2 - Employee Views Their Assigned Shift

**Acceptance Scenarios**:

1. **Given** an employee is logged in, **When** they view their dashboard or attendance page, **Then** they can see their currently assigned shift(s).

---

## Requirements

### Backend Requirements

1. **Complete EmployeeShift API**: Ensure `EmployeeShiftViewSet` supports `create`, `list`, `update`, and `delete` operations.
2. **Shift Resolution**: The system should use these assignments to validate clock-ins (already partially implemented in `ShiftResolutionService`).
3. **Validation**: Prevent assigning multiple overlapping shifts or more than 2 shifts per day (as per `ShiftResolutionService` constraints).

### Frontend Requirements

1. **Shift Assignment UI**: Add a "Shifts" tab or section to the User Management / Employee Directory page to manage assignments for each employee.
2. **Shift Selection**: Provide a dropdown or modal to select from existing defined shifts.
3. **Display**: Show currently assigned shifts in the employee list or detail view.

---

## Success Criteria

1. HR/Managers can successfully assign a shift to an employee via the UI.
2. The assignment is persisted in the database (`EmployeeShift` model).
3. The assigned shift is reflected in the employee's attendance view.
4. API calls for `employee-shifts` are correctly implemented in both frontend and backend.
