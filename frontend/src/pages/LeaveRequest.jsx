import React, { useState } from 'react';

const LeaveRequest = ({ role, onNotify }) => {
  const isEmployee = role === 'Employee';
  const heading = isEmployee
    ? 'My Leave Requests'
    : role === 'Manager'
    ? 'Department Leave Approval Center'
    : role === 'HR'
    ? 'Company-wide Leave Management'
    : 'System Leave Oversight';

  const [form, setForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [requests, setRequests] = useState([
    {
      id: 1,
      employee: 'John Doe',
      type: 'Vacation',
      dates: '2025-12-28 → 2025-12-30',
      status: 'Pending',
    },
    {
      id: 2,
      employee: 'Jane Smith',
      type: 'Sick',
      dates: '2025-12-20 → 2025-12-21',
      status: 'Approved',
    },
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) {
      alert('Please fill all fields');
      return;
    }

    const newRequest = {
      id: requests.length + 1,
      employee: 'You',
      type: form.type,
      dates: `${form.startDate} → ${form.endDate}`,
      status: 'Pending',
    };

    setRequests((prev) => [newRequest, ...prev]);
    setForm({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
    if (onNotify) {
      onNotify('Leave request submitted (mock).');
    }
  };

  const canApprove = role === 'Manager' || role === 'HR' || role === 'Admin';

  const handleApprove = (id, status) => {
    if (!canApprove) return;
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              status,
            }
          : req
      )
    );
    if (onNotify) {
      onNotify(`Request ${status.toLowerCase()} (mock).`);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">{heading}</h1>
      <p className="page-description">
        This page now includes a basic leave request form (for employees) and a
        simple approval-style table (for managers/HR/Admin). All data is local
        state only.
      </p>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="card-title">Leave Requests</h2>
          <table className="table">
            <thead>
              <tr>
                {!isEmployee && <th>Employee</th>}
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
                {canApprove && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  {!isEmployee && <td>{request.employee}</td>}
                  <td>{request.type}</td>
                  <td>{request.dates}</td>
                  <td>{request.status}</td>
                  {canApprove && (
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '0.25rem' }}
                        onClick={() => handleApprove(request.id, 'Approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleApprove(request.id, 'Rejected')}
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="card-title">
            {isEmployee ? 'Submit New Leave Request' : 'Review &amp; Actions'}
          </h2>
          {isEmployee ? (
            <form className="form" onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="type">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="form-select"
                value={form.type}
                onChange={handleChange}
              >
                <option value="Vacation">Vacation</option>
                <option value="Sick">Sick</option>
                <option value="Paternity">Paternity</option>
                <option value="Other">Other</option>
              </select>

              <label className="form-label" htmlFor="startDate">
                Start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                className="form-select"
                value={form.startDate}
                onChange={handleChange}
              />

              <label className="form-label" htmlFor="endDate">
                End date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                className="form-select"
                value={form.endDate}
                onChange={handleChange}
              />

              <label className="form-label" htmlFor="reason">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="form-select"
                value={form.reason}
                onChange={handleChange}
              />

              <button type="submit" className="btn btn-primary form-submit">
                Submit request
              </button>
            </form>
          ) : (
            <ul className="list">
              <li>Review pending requests in the table.</li>
              <li>Use Approve / Reject buttons to update status.</li>
              <li>Later, this will write back to the backend LeaveRequests API.</li>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default LeaveRequest;
