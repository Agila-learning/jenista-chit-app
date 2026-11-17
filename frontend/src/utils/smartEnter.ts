/**
 * Jenista Chits - Smart Enter Navigation Engine
 * 
 * Capabilities:
 * - Enter advances focus sequentially to the next editable field (input, select, textarea).
 * - Shift + Enter navigates backward to the previous field.
 * - Skips disabled, hidden, readonly, and offscreen elements.
 * - Automatically selects input contents for rapid data entry.
 * - Handles dropdowns (<select>) and autocomplete comboboxes cleanly.
 * - Preserves native multiline newline insertion inside <textarea>.
 * - Prevents inadvertent premature form submissions on intermediate inputs.
 * - Submits or triggers primary action when the final field is reached.
 * - Universal scope resolution: works seamlessly across forms, modal popups, and tabbed dialogs.
 */

import { useEffect } from 'react';

export const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  '[contenteditable="true"]'
].join(', ');

/**
 * Checks whether an element is visible and interactive in the DOM
 */
export const isElementVisibleAndInteractive = (el: HTMLElement): boolean => {
  if (!el || !el.isConnected) return false;
  if (el.getAttribute('aria-hidden') === 'true' || el.getAttribute('tabindex') === '-1') return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  return true;
};

/**
 * Core smart enter keydown handler for forms and modal containers
 */
export const handleSmartEnterKeyDown = (
  e: KeyboardEvent | React.KeyboardEvent,
  containerElement?: HTMLElement | null
): void => {
  if (e.key !== 'Enter') return;

  const target = e.target as HTMLElement;
  if (!target) return;

  // 1. Preserve native multiline text behavior in textarea
  if (target.tagName === 'TEXTAREA') {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const form = target.closest('form');
      if (form) {
        if (form.checkValidity()) {
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          if (submitBtn) submitBtn.click();
          else if (form.requestSubmit) form.requestSubmit();
        } else {
          form.reportValidity();
        }
      }
    }
    return;
  }

  // 2. If user intentionally pressed Enter on a button or link, let native click execute
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    return;
  }

  // 3. Determine scoping container (prefer closest form, modal dialog, smart container, or body)
  const container = 
    containerElement || 
    target.closest('form') || 
    target.closest('[role="dialog"]') || 
    target.closest('[data-smart-enter="true"]') ||
    target.closest('.modal-container') || 
    target.closest('.fixed') || 
    document.body;

  // 4. Query all eligible focusable interactive elements within this container
  const allCandidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const focusables = allCandidates.filter(isElementVisibleAndInteractive);

  const currentIndex = focusables.indexOf(target);
  if (currentIndex === -1) return;

  // Intercept default enter behavior
  e.preventDefault();

  // Shift + Enter: Move backward
  if (e.shiftKey) {
    if (currentIndex > 0) {
      const prevElement = focusables[currentIndex - 1];
      prevElement.focus();
      if (prevElement instanceof HTMLInputElement) {
        prevElement.select?.();
      }
      prevElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    return;
  }

  // Regular Enter: Move forward to next interactive element
  if (currentIndex < focusables.length - 1) {
    const nextElement = focusables[currentIndex + 1];
    nextElement.focus();
    if (nextElement instanceof HTMLInputElement) {
      nextElement.select?.();
    }
    nextElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return;
  }

  // Reached the final field: trigger form submit or primary modal action button
  const form = target.closest('form');
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
    // Non-form modal container: find primary action or submit button in the modal
    const actionBtn = container.querySelector(
      'button[type="submit"], button.btn-primary, button[data-primary="true"], button.bg-blue-600, button.bg-emerald-600'
    ) as HTMLElement;
    if (actionBtn && actionBtn !== target) {
      actionBtn.click();
    }
  }
};

/**
 * React hook to enable Smart Enter Navigation globally or on a container
 */
export const useSmartEnterNavigation = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // Allow natural clicks on buttons
      if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
      // Allow multiline enter in textarea unless with modifier
      if (target.tagName === 'TEXTAREA' && !e.ctrlKey && !e.metaKey) return;

      // Handle any input or select
      if (['INPUT', 'SELECT'].includes(target.tagName) || target.getAttribute('contenteditable') === 'true') {
        const container = 
          target.closest('form') || 
          target.closest('[role="dialog"]') || 
          target.closest('[data-smart-enter="true"]') ||
          target.closest('.modal-container') || 
          target.closest('.fixed') || 
          document.body;

        if (container) {
          handleSmartEnterKeyDown(e, container as HTMLElement);
        }
      }
    };

    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, [enabled]);
};

