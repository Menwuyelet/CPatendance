import React from 'react';

const Modal = ({ open, title, children, onClose, onConfirm, confirmLabel = 'Confirm' }) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={onConfirm}
            style={{ marginLeft: '0.5rem' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
