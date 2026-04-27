/**
 * QuickNote — Floating quick-add note widget
 */

import { Plus, Send, X } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, Input, Textarea } from '@ui';

import { useQuickNote } from './useQuickNote';

// ── Component ────────────────────────────────────────────────

export function QuickNote() {
  const {
    isOpen,
    title,
    content,
    setIsOpen,
    setTitle,
    setContent,
    handleSubmit,
    handleKeyDown,
  } = useQuickNote();

  if (!isOpen) {
    return (
      <Button
        aria-label="Quick add note"
        className="fixed right-6 bottom-6 z-50 rounded-full p-3 shadow-lg"
        size="icon"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed right-6 bottom-6 z-50 w-80 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <span className="text-foreground text-sm font-medium">Quick Note</span>
        <Button
          aria-label="Close quick note"
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <Input
          aria-label="Note title"
          placeholder="Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Textarea
          aria-label="Note content"
          className="h-24 resize-none"
          placeholder="Write a note... (Ctrl+Enter to save)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          className="w-full"
          disabled={title.trim().length === 0}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
          Save Note
        </Button>
      </CardContent>
    </Card>
  );
}
