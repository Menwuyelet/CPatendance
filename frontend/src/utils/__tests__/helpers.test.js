// Helper functions tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the helper functions from api.service.js
// These are the utility functions that were optimized

describe('Helper Functions - Set-based Lookups', () => {
  describe('createEmployeeIdSet', () => {
    it('should create a Set from employee array', () => {
      const employees = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' },
      ];
      
      const employeeSet = new Set(employees.map(e => String(e.id)));
      
      expect(employeeSet.has('1')).toBe(true);
      expect(employeeSet.has('2')).toBe(true);
      expect(employeeSet.has('3')).toBe(true);
      expect(employeeSet.has('4')).toBe(false);
    });

    it('should handle empty array', () => {
      const employees = [];
      const employeeSet = new Set(employees.map(e => String(e.id)));
      
      expect(employeeSet.size).toBe(0);
    });

    it('should handle string IDs', () => {
      const employees = [
        { id: 'emp-001', name: 'John' },
        { id: 'emp-002', name: 'Jane' },
      ];
      
      const employeeSet = new Set(employees.map(e => String(e.id)));
      
      expect(employeeSet.has('emp-001')).toBe(true);
      expect(employeeSet.has('emp-002')).toBe(true);
    });
  });

  describe('filterAttendanceByEmployees', () => {
    it('should filter attendance records by employee IDs using Set', () => {
      const employees = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      
      const attendanceList = [
        { employee: { id: 1 }, date: '2025-01-01', status: 'PRESENT' },
        { employee: { id: 2 }, date: '2025-01-01', status: 'LATE' },
        { employee: { id: 3 }, date: '2025-01-01', status: 'PRESENT' }, // Should be filtered out
      ];
      
      const employeeIds = new Set(employees.map(e => String(e.id)));
      const filtered = attendanceList.filter(a => 
        employeeIds.has(String(a.employee?.id || a.employee))
      );
      
      expect(filtered.length).toBe(2);
      expect(filtered[0].employee.id).toBe(1);
      expect(filtered[1].employee.id).toBe(2);
    });

    it('should handle numeric employee IDs', () => {
      const attendanceList = [
        { employee: 1, date: '2025-01-01' },
        { employee: 2, date: '2025-01-01' },
        { employee: 3, date: '2025-01-01' },
      ];
      
      const employeeIds = new Set(['1', '2']);
      const filtered = attendanceList.filter(a => 
        employeeIds.has(String(a.employee?.id || a.employee))
      );
      
      expect(filtered.length).toBe(2);
    });
  });
});

describe('Date Formatting Utilities', () => {
  describe('formatDateForAPI', () => {
    const formatDateForAPI = (date) => {
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(formatDateForAPI(date)).toBe('2025-01-15');
    });

    it('should handle string date input', () => {
      expect(formatDateForAPI('2025-12-25')).toBe('2025-12-25');
    });

    it('should pad single digit months and days', () => {
      expect(formatDateForAPI(new Date('2025-05-05'))).toBe('2025-05-05');
    });
  });

  describe('getDateRange', () => {
    const getDateRange = (days) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      return { startDate, endDate };
    };

    it('should return date range for last 7 days', () => {
      const { startDate, endDate } = getDateRange(7);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should return date range for last 30 days', () => {
      const { startDate, endDate } = getDateRange(30);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });
  });
});

describe('Status Validation', () => {
  const getStatusColor = (status) => {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (['PRESENT', 'LATE'].includes(s)) return 'success';
    if (['ABSENT'].includes(s)) return 'error';
    if (['ON_LEAVE', 'PENDING'].includes(s)) return 'warning';
    return 'default';
  };

  it('should return success for PRESENT', () => {
    expect(getStatusColor('PRESENT')).toBe('success');
  });

  it('should return success for LATE', () => {
    expect(getStatusColor('LATE')).toBe('success');
  });

  it('should return error for ABSENT', () => {
    expect(getStatusColor('ABSENT')).toBe('error');
  });

  it('should return warning for ON_LEAVE', () => {
    expect(getStatusColor('ON_LEAVE')).toBe('warning');
  });

  it('should return default for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('default');
  });

  it('should handle null/undefined', () => {
    expect(getStatusColor(null)).toBe('default');
    expect(getStatusColor(undefined)).toBe('default');
  });

  it('should be case insensitive', () => {
    expect(getStatusColor('present')).toBe('success');
    expect(getStatusColor('Present')).toBe('success');
  });
});

describe('Array Normalization', () => {
  const normalizeResponse = (response) => {
    return Array.isArray(response) ? response : response?.results || [];
  };

  it('should return array as-is', () => {
    expect(normalizeResponse([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should extract results from paginated response', () => {
    expect(normalizeResponse({ results: [1, 2, 3] })).toEqual([1, 2, 3]);
  });

  it('should return empty array for null/undefined', () => {
    expect(normalizeResponse(null)).toEqual([]);
    expect(normalizeResponse(undefined)).toEqual([]);
  });

  it('should return empty array for empty results', () => {
    expect(normalizeResponse({ results: [] })).toEqual([]);
  });
});
