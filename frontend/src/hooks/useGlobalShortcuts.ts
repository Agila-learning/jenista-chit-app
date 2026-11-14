import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isTypingInInputElement, isMacPlatform } from '../utils/keyboardShortcuts';

interface GlobalShortcutsOptions {
  onOpenQuickActions: () => void;
  onOpenShortcutGuide: () => void;
  onCloseModals: () => void;
}

export const useGlobalShortcuts = ({
  onOpenQuickActions,
  onOpenShortcutGuide,
  onCloseModals
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

      // 5. Alt + ... Navigation Shortcuts (Prevent triggering when typing in inputs/textareas)
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

          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, onOpenQuickActions, onOpenShortcutGuide, onCloseModals, handleSaveActiveForm]);
};
