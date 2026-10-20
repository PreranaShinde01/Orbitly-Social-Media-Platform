/**
 * Modal Manager Component
 */

let activeModal = null;

export function openModal({ title, bodyHtml, footerHtml = '', onRender = null }) {
  closeModal();

  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;

  container.appendChild(overlay);
  activeModal = overlay;

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Close handlers
  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) closeBtn.onclick = closeModal;

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  if (onRender) {
    onRender(overlay);
  }

  return overlay;
}

export function closeModal() {
  if (activeModal && activeModal.parentNode) {
    activeModal.classList.remove('active');
    setTimeout(() => {
      if (activeModal && activeModal.parentNode) {
        activeModal.parentNode.removeChild(activeModal);
      }
      activeModal = null;
    }, 200);
  }
}

export function confirmModal({ title = 'Confirm Action', message, confirmText = 'Confirm', isDanger = true, onConfirm }) {
  const footerHtml = `
    <button class="btn btn-outline btn-modal-cancel">Cancel</button>
    <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-modal-confirm">${confirmText}</button>
  `;

  openModal({
    title,
    bodyHtml: `<p style="font-size: 1rem; color: var(--text-main);">${message}</p>`,
    footerHtml,
    onRender: (modalEl) => {
      modalEl.querySelector('.btn-modal-cancel').onclick = closeModal;
      modalEl.querySelector('.btn-modal-confirm').onclick = async () => {
        closeModal();
        if (onConfirm) await onConfirm();
      };
    }
  });
}
