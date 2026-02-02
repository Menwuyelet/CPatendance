# Backend Issues to Fix

## Issue 1: Duplicate Face Matching Call
**File:** `backend/apps/attendance/services/attendance_session_service.py`
**Line:** 50

**Problem:**
```python
employee_id = BiometricMatchingService.match_face(embedding, self.session.shift)

employee_id = BiometricMatchingService.match_face(embedding, self.session.shift)  # DUPLICATE LINE

if not employee_id:
```

**Fix:**
Remove the duplicate line (line 50). The function `match_face()` is called twice which wastes resources and may cause issues.

---

## Issue 2: Wrong Log Message on Success
**File:** `backend/apps/attendance/services/attendance_session_service.py`
**Lines:** 74-78

**Problem:**
```python
logger.warning(
    "SESSION_DUPLICATE_ENTRY | session_id=%s | employee_id=%s",  # WRONG MESSAGE
    self.session.id,
    employee_id,
)
return "STOP_SUCCESS"
```

**Fix:**
Change the log to show "SESSION_ENTRY_CREATED" instead of "SESSION_DUPLICATE_ENTRY", and use `logger.info()` instead of `logger.warning()`.

---

## Issue 3: Wrong Field Name in Save
**File:** `backend/apps/attendance/services/attendance_service.py`
**Line:** 133

**Problem:**
```python
if not created and record.status is None:
    record.status = "ABSENT"
    record.save(update_fields=["status", "marked_at"])  # 'marked_at' DOES NOT EXIST
```

**Fix:**
Remove `marked_at` from update_fields since it doesn't exist in the AttendanceRecord model:
```python
record.save(update_fields=["status"])
```

---

## Issue 4: Missing Date Range Filter Support
**File:** `backend/apps/attendance/api/views.py`
**Lines:** 287-290

**Problem:**
The backend only supports single date filtering, not date range:
```python
date = request.query_params.get("date")
if date:
    qs = qs.filter(date=date)
```

**Fix:**
Add support for `date__gte` and `date__lte` parameters for date range filtering:
```python
date_gte = request.query_params.get("date__gte")
if date_gte:
    qs = qs.filter(date__gte=date_gte)

date_lte = request.query_params.get("date__lte")
if date_lte:
    qs = qs.filter(date__lte=date_lte)
```

---

## Issue 5: Missing Employee Filter for Mine Requests
**File:** `backend/apps/attendance/api/views.py`
**Lines:** 280-285

**Problem:**
The backend doesn't support a `mine` parameter to filter records for the current user.

**Fix:**
Add support for `mine` parameter:
```python
mine = request.query_params.get("mine")
if mine and mine.lower() == 'true':
    if hasattr(request.user, 'employee'):
        qs = qs.filter(employee=request.user.employee)
    else:
        qs = qs.none()
```

---

## Summary of Required Fixes:

1. Remove duplicate `BiometricMatchingService.match_face()` call
2. Fix log message from "SESSION_DUPLICATE_ENTRY" to "SESSION_ENTRY_CREATED"
3. Remove `marked_at` from `update_fields` (field doesn't exist)
4. Add date range filter support (`date__gte`, `date__lte`)
5. Add `mine` parameter support for filtering current user's attendance
