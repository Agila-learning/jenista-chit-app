import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog that works seamlessly on both
 * Native (iOS/Android) via Alert.alert and Web (Expo Web / Browser) via window.confirm.
 */
export const showConfirmDialog = (
  title: string,
  message: string,
  buttons: AlertButton[]
): void => {
  if (Platform.OS === 'web') {
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];

    const displayText = message ? `${title}\n\n${message}` : title;

    if (buttons.length <= 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(displayText);
      }
      actionBtn?.onPress?.();
      return;
    }

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(displayText);
      if (confirmed) {
        actionBtn?.onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
    } else {
      actionBtn?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

/**
 * Cross-platform simple alert that works on both Native and Web.
 */
export const showAlert = (
  title: string,
  message?: string,
  onOk?: () => void
): void => {
  if (Platform.OS === 'web') {
    const displayText = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(displayText);
    }
    onOk?.();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

