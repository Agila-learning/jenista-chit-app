/**
 * Jenista Chits - Smart Enter Navigation Engine
 * 
 * Capabilities:
 * - Enter advances focus sequentially to the next editable field.
 * - Shift + Enter navigates backward to the previous field.
 * - Skips disabled, hidden, readonly, and offscreen elements.
 * - Handles dropdowns (<select>) and autocomplete comboboxes cleanly.
 * - Preserves native multiline newline insertion inside <textarea>.
 * - Prevents unexpected premature form submissions.
 * - Submits only when the final field is reached and form passes validation.
 * - Supports modal dialogs, tab containers, and full data-entry forms.
 */

import { useEffect } from 'react';

export const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  '[contenteditable="true"]',
  'button[type="submit"]:not([disabled])'
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
    // Normal Enter creates newline
    // Ctrl+Enter or Cmd+Enter allows quick form submission
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

  // 2. If user intentionally pressed Enter on a submit button or action button, let default behavior execute
  if (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit') {
    return;
  }

  // 3. Determine scoping container (active modal dialog, enclosing form, or provided container)
  const container = 
    containerElement || 
    target.closest('[role="dialog"]') || 
    target.closest('.modal-container') || 
    target.closest('form') || 
    document.body;

  // 4. Query all eligible focusable interactive elements
  const allCandidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const focusables = allCandidates.filter(isElementVisibleAndInteractive);

  const currentIndex = focusables.indexOf(target);
  if (currentIndex === -1) return;

  // Intercept default enter behavior to prevent inadvertent form submission
  e.preventDefault();

  // Shift + Enter: Move backward
  if (e.shiftKey) {
    if (currentIndex > 0) {
      const prevElement = focusables[currentIndex - 1];
      prevElement.focus();
      if (prevElement instanceof HTMLInputElement && (prevElement.type === 'text' || prevElement.type === 'number')) {
        prevElement.select();
      }
    }
    return;
  }

  // Regular Enter: Move forward
  const isLastField = currentIndex === focusables.length - 1;
  const isBeforeSubmitButton = 
    currentIndex === focusables.length - 2 && 
    (focusables[focusables.length - 1].getAttribute('type') === 'submit' || focusables[focusables.length - 1].tagName === 'BUTTON');

  if (!isLastField && !isBeforeSubmitButton) {
    const nextElement = focusables[currentIndex + 1];
    nextElement.focus();
    if (nextElement instanceof HTMLInputElement && (nextElement.type === 'text' || nextElement.type === 'number')) {
      nextElement.select();
    }
  } else {
    // We are at the final field or right before the submit button
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
      // Non-form modal container: focus the primary action button if available
      const actionBtn = container.querySelector('button.btn-primary, button[data-primary="true"]') as HTMLElement;
      if (actionBtn) {
        actionBtn.click();
      }
    }
  }
};

/**
 * React hook to enable Smart Enter Navigation on a container or form ref
 */
export const useSmartEnterNavigation = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Only handle if inside a form, dialog, or container marked with data-smart-enter
      const isSmartContainer = 
        target.closest('[data-smart-enter="true"]') || 
        target.closest('form') || 
        target.closest('[role="dialog"]');

      if (isSmartContainer) {
        handleSmartEnterKeyDown(e, isSmartContainer as HTMLElement);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
};
