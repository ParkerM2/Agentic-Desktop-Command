/**
 * useNotificationRules — Logic hook for NotificationRules
 */

import { useState } from 'react';

import { useIntegrationsStore } from '../../store';

export function useNotificationRules() {
  const { notificationRules, addNotificationRule, removeNotificationRule, toggleNotificationRule } =
    useIntegrationsStore();

  const [newPattern, setNewPattern] = useState('');
  const [newService, setNewService] = useState<'slack' | 'discord'>('slack');

  function handleAdd(): void {
    const trimmed = newPattern.trim();
    if (trimmed.length === 0) return;
    addNotificationRule({ service: newService, pattern: trimmed, enabled: true });
    setNewPattern('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }

  return {
    notificationRules,
    removeNotificationRule,
    toggleNotificationRule,
    newPattern,
    setNewPattern,
    newService,
    setNewService,
    handleAdd,
    handleKeyDown,
  };
}
