/**
 * Jenista Chits - Keyboard Shortcuts Engine & Reference Registry
 * 
 * DESIGNATED REFERENCE LOCATION:
 * This file serves as the single source of truth for all keyboard shortcuts,
 * categorization, description, keybindings, and accessibility bindings across
 * the Jenista Chits Web Application.
 */

export type ShortcutCategory = 
  | 'Group Management'
  | 'Customer Management'
  | 'Payments'
  | 'Overdue & Reports'
  | 'Navigation & Forms';

export interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  keys: string[]; // Standard display keys, e.g. ['Alt', 'G']
  macKeys?: string[]; // macOS display keys, e.g. ['⌥', 'G']
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  key: string; // The primary key (case-insensitive match)
  route?: string;
  actionId?: string;
  global: boolean; // Accessible globally across all pages
  allowInInput?: boolean; // Allowed while typing in an input field (e.g. Save form, Escape)
}

export const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  // 1. Group Management
  {
    id: 'create-group',
    name: 'Create New Chit Group',
    description: 'Open the chit group creation dialog to register a new auction or fixed chit group',
    category: 'Group Management',
    keys: ['Alt', 'G'],
    macKeys: ['⌥', 'G'],
    altKey: true,
    key: 'g',
    route: '/admin/chit-groups?action=create',
    actionId: 'CREATE_GROUP',
    global: true,
    allowInInput: false
  },

  // 2. Customer Management
  {
    id: 'register-customer',
    name: 'Register Customer',
    description: 'Open customer onboarding and registration screen to add a new client',
    category: 'Customer Management',
    keys: ['Alt', 'C'],
    macKeys: ['⌥', 'C'],
    altKey: true,
    key: 'c',
    route: '/admin/customers/add',
    actionId: 'REGISTER_CUSTOMER',
    global: true,
    allowInInput: false
  },
  {
    id: 'add-member',
    name: 'Add Member / Chit Enrollment',
    description: 'Open member enrollment interface to attach customers to chit groups',
    category: 'Customer Management',
    keys: ['Alt', 'M'],
    macKeys: ['⌥', 'M'],
    altKey: true,
    key: 'm',
    route: '/admin/customers/approvals',
    actionId: 'ADD_MEMBER',
    global: true,
    allowInInput: false
  },

  // 3. Payments
  {
    id: 'add-payment',
    name: 'Add / Record Payment',
    description: 'Open the receipt entry desk to record cash, UPI, or bank collections',
    category: 'Payments',
    keys: ['Alt', 'P'],
    macKeys: ['⌥', 'P'],
    altKey: true,
    key: 'p',
    route: '/admin/receipts',
    actionId: 'ADD_PAYMENT',
    global: true,
    allowInInput: false
  },

  // 4. Overdue & Reports
  {
    id: 'view-overdue',
    name: 'View Overdue Accounts',
    description: 'Open the non-payers audit report to review outstanding balances and pending installments',
    category: 'Overdue & Reports',
    keys: ['Alt', 'O'],
    macKeys: ['⌥', 'O'],
    altKey: true,
    key: 'o',
    route: '/admin/reports/non-payers',
    actionId: 'VIEW_OVERDUE',
    global: true,
    allowInInput: false
  },
  {
    id: 'today-collections',
    name: "View Today's Collections",
    description: "View day ledger summary and total collections recorded today",
    category: 'Overdue & Reports',
    keys: ['Alt', 'T'],
    macKeys: ['⌥', 'T'],
    altKey: true,
    key: 't',
    route: '/admin/ledger?filter=today',
    actionId: 'TODAY_COLLECTIONS',
    global: true,
    allowInInput: false
  },
  {
    id: 'open-reports',
    name: 'Open Reports Center',
    description: 'Navigate to analytical reports, financial summaries, and collection audits',
    category: 'Overdue & Reports',
    keys: ['Alt', 'R'],
    macKeys: ['⌥', 'R'],
    altKey: true,
    key: 'r',
    route: '/admin/reports/non-payers',
    actionId: 'OPEN_REPORTS',
    global: true,
    allowInInput: false
  },

  // 5. Navigation & Forms
  {
    id: 'global-search',
    name: 'Global Search & Quick Actions',
    description: 'Open the global search palette to jump to members, groups, receipts, or quick actions',
    category: 'Navigation & Forms',
    keys: ['Ctrl', 'K'],
    macKeys: ['⌘', 'K'],
    ctrlKey: true,
    key: 'k',
    actionId: 'GLOBAL_SEARCH',
    global: true,
    allowInInput: true
  },
  {
    id: 'save-form',
    name: 'Save Active Form',
    description: 'Save or submit the currently active data-entry form without using the mouse',
    category: 'Navigation & Forms',
    keys: ['Ctrl', 'S'],
    macKeys: ['⌘', 'S'],
    ctrlKey: true,
    key: 's',
    actionId: 'SAVE_FORM',
    global: true,
    allowInInput: true
  },
  {
    id: 'close-modal',
    name: 'Close Modal / Cancel',
    description: 'Dismiss active dialogs, drop-down menus, search results, or quick action palettes',
    category: 'Navigation & Forms',
    keys: ['Escape'],
    macKeys: ['esc'],
    key: 'escape',
    actionId: 'CLOSE_MODAL',
    global: true,
    allowInInput: true
  },
  {
    id: 'shortcut-guide',
    name: 'Keyboard Shortcut Guide',
    description: 'Show clean reference sheet of all available shortcuts across the application',
    category: 'Navigation & Forms',
    keys: ['Shift', '?'],
    macKeys: ['⇧', '?'],
    shiftKey: true,
    key: '?',
    actionId: 'SHOW_GUIDE',
    global: true,
    allowInInput: false
  },
  {
    id: 'smart-enter-next',
    name: 'Smart Enter Next Field',
    description: 'Move focus to the next available input field, skipping disabled or hidden elements',
    category: 'Navigation & Forms',
    keys: ['Enter'],
    macKeys: ['⏎'],
    key: 'enter',
    actionId: 'SMART_ENTER_NEXT',
    global: false,
    allowInInput: true
  },
  {
    id: 'smart-enter-prev',
    name: 'Smart Enter Previous Field',
    description: 'Move focus back to the previous input field',
    category: 'Navigation & Forms',
    keys: ['Shift', 'Enter'],
    macKeys: ['⇧', '⏎'],
    shiftKey: true,
    key: 'enter',
    actionId: 'SMART_ENTER_PREV',
    global: false,
    allowInInput: true
  }
];

/**
 * Check if the user is running on macOS
 */
export const isMacPlatform = (): boolean => {
  if (typeof window === 'undefined' || !window.navigator) return false;
  return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform || '');
};

/**
 * Returns whether an event target is an active editable field
 */
export const isTypingInInputElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  return target.isContentEditable || target.getAttribute('contenteditable') === 'true';
};

/**
 * Match a keyboard event against a ShortcutItem
 */
export const matchesKeyboardShortcut = (e: KeyboardEvent, item: ShortcutItem): boolean => {
  const isMac = isMacPlatform();
  const eventKey = e.key.toLowerCase();
  const targetKey = item.key.toLowerCase();

  // Primary key check (handles special keys like Escape, ?, etc.)
  if (targetKey === '?' && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
    // matched question mark
  } else if (eventKey !== targetKey) {
    return false;
  }

  // Alt check
  if (item.altKey && !e.altKey) return false;
  if (!item.altKey && e.altKey) return false;

  // Ctrl / Cmd check
  const hasModifier = isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;
  if (item.ctrlKey && !hasModifier) return false;
  if (!item.ctrlKey && hasModifier && item.key !== 'enter' && item.key !== '?') return false;

  // Shift check
  if (item.shiftKey && !e.shiftKey) return false;
  if (!item.shiftKey && e.shiftKey && item.key !== '?') return false;

  return true;
};

