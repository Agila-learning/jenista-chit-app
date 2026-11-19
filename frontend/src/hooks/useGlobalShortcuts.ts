import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isTypingInInputElement, isMacPlatform } from '../utils/keyboardShortcuts';

interface GlobalShortcutsOptions {
  onOpenQuickActions: () => void;
  onOpenShortcutGuide: () => void;
  onCloseModals: () => void;
  onOpenCustomer360?: () => void;
}

export const useGlobalShortcuts = ({
  onOpenQuickActions,
  onOpenShortcutGuide,
  onCloseModals,
  onOpenCustomer360
}: GlobalShortcutsOptions) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSaveActiveForm = useCallback(() => {
    // 1. Search for active form or form in modal or topmost form on page
    const activeElement = document.activeElement;
    const form = 
      activeElement?.closest('form') || 
      document.querySelector('[role="dialog"] form') || 
      document.querySelector('form');

    if (form) {
      if (form.checkValidity()) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        if (submitBtn) {
          submitBtn.click();
        } else if (form.requestSubmit) {
          form.requestSubmit();
        }
      } else {
        form.reportValidity();
      }
    } else {
      // Look for a custom primary save button on the page (e.g. in ReceiptEntry or action bar)
      const saveBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return (text.includes('save & record') || text.includes('save') || text.includes('submit')) && !btn.disabled;
      });
      if (saveBtn) {
        saveBtn.click();
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = isMacPlatform();
      const hasModifier = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement;
      const isTyping = isTypingInInputElement(target);

      // 1. Escape: Close open modals, search dropdowns, quick actions, guide
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModals();
        return;
      }

      // 2. Ctrl + K / Cmd + K: Open Global Search & Quick Actions palette
      if (hasModifier && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenQuickActions();
        return;
      }

      // 3. Ctrl + S / Cmd + S: Save active form
      if (hasModifier && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveActiveForm();
        return;
      }

      // 4. Shift + ?: Open Shortcut Reference Guide (only when NOT actively typing in a text field)
      if (e.shiftKey && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
        if (!isTyping) {
          e.preventDefault();
          onOpenShortcutGuide();
          return;
        }
      }

      // 5. FUNCTION KEYS (F2 - F9): 100% Reliable Single-Key Accelerators (Never blocked by Alt menus)
      const fKey = e.key.toUpperCase();
      if (fKey === 'F2') {
        e.preventDefault();
        navigate('/admin/customers/add');
        return;
      }
      if (fKey === 'F3') {
        e.preventDefault();
        navigate('/admin/chit-groups?action=create');
        return;
      }
      if (fKey === 'F4') {
        e.preventDefault();
        navigate('/admin/receipts');
        return;
      }
      if (fKey === 'F6') {
        e.preventDefault();
        navigate('/admin/customers/approvals');
        return;
      }
      if (fKey === 'F7') {
        e.preventDefault();
        navigate('/admin/ledger?filter=today');
        return;
      }
      if (fKey === 'F8') {
        e.preventDefault();
        navigate('/admin/reports/non-payers');
        return;
      }
      if (fKey === 'F9') {
        e.preventDefault();
        if (onOpenCustomer360) {
          onOpenCustomer360();
        } else {
          window.dispatchEvent(new CustomEvent('open-customer-360'));
        }
        return;
      }

      // 6. Ctrl + Shift + <Key> / Cmd + Shift + <Key> (Web Standard Accelerators)
      if (hasModifier && e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'c') {
          e.preventDefault();
          navigate('/admin/customers/add');
          return;
        }
        if (k === 'g') {
          e.preventDefault();
          navigate('/admin/chit-groups?action=create');
          return;
        }
        if (k === 'p') {
          e.preventDefault();
          navigate('/admin/receipts');
          return;
        }
        if (k === 'm') {
          e.preventDefault();
          navigate('/admin/customers/approvals');
          return;
        }
        if (k === 'l' || k === 't') {
          e.preventDefault();
          navigate('/admin/ledger?filter=today');
          return;
        }
        if (k === 'o') {
          e.preventDefault();
          navigate('/admin/reports/non-payers');
          return;
        }
        if (k === 'f') {
          e.preventDefault();
          if (onOpenCustomer360) {
            onOpenCustomer360();
          } else {
            window.dispatchEvent(new CustomEvent('open-customer-360'));
          }
          return;
        }
      }

      // 7. Alt + <Key> Navigation Shortcuts (Kept as secondary backwards-compatible keys)
      if (e.altKey && !hasModifier) {
        const key = e.key.toLowerCase();

        // If user is actively typing text inside an input or textarea, protect their text input
        if (isTyping) {
          return;
        }

        switch (key) {
          case 'g': // Alt + G: Create new chit group
            e.preventDefault();
            navigate('/admin/chit-groups?action=create');
            break;

          case 'c': // Alt + C: Register customer
            e.preventDefault();
            navigate('/admin/customers/add');
            break;

          case 'm': // Alt + M: Add member / Chit enrollment
            e.preventDefault();
            navigate('/admin/customers/approvals');
            break;

          case 'p': // Alt + P: Add payment / Receipt Entry
            e.preventDefault();
            navigate('/admin/receipts');
            break;

          case 'o': // Alt + O: View overdue accounts
            e.preventDefault();
            navigate('/admin/reports/non-payers');
            break;

          case 't': // Alt + T: View today's collections
            e.preventDefault();
            navigate('/admin/ledger?filter=today');
            break;

          case 'r': // Alt + R: Open reports
            e.preventDefault();
            navigate('/admin/reports/non-payers');
            break;

          case 'f': // Alt + F: Customer 360 Lookup
            e.preventDefault();
            if (onOpenCustomer360) onOpenCustomer360();
            else window.dispatchEvent(new CustomEvent('open-customer-360'));
            break;

          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, onOpenQuickActions, onOpenShortcutGuide, onCloseModals, onOpenCustomer360, handleSaveActiveForm]);
};
