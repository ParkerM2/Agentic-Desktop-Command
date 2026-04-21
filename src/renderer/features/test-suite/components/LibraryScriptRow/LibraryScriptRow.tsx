import {
  Calendar,
  Eye,
  EyeOff,
  FileSpreadsheet,
  MoreHorizontal,
  Play,
} from 'lucide-react';

import type { QaScriptSchema } from '@shared/ipc/test-suite';

import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  TableCell,
  TableRow,
  Text,
} from '@ui';

import type { z } from 'zod';

type QaScript = z.infer<typeof QaScriptSchema>;

interface LibraryScriptRowProps {
  formatDate: (dateStr: string) => string;
  isFlaky: boolean;
  isSelected: boolean;
  isWatched: boolean;
  script: QaScript;
  sparkline: React.ReactNode;
  onDataRun: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRun: () => void;
  onSchedule: () => void;
  onToggleSelect: () => void;
  onToggleWatch: () => void;
}

export function LibraryScriptRow({
  formatDate,
  isFlaky,
  isSelected,
  isWatched,
  script,
  sparkline,
  onDataRun,
  onDelete,
  onEdit,
  onRun,
  onSchedule,
  onToggleSelect,
  onToggleWatch,
}: LibraryScriptRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell className="font-medium">
        {script.name}
        {isFlaky ? (
          <Badge className="ml-2" variant="secondary">
            flaky
          </Badge>
        ) : null}
        {script.description ? (
          <Text className="ml-2" variant="muted">
            {script.description}
          </Text>
        ) : null}
        {script.tags.map((t) => (
          <Badge key={t} className="ml-1 text-[10px]" variant="secondary">
            {t}
          </Badge>
        ))}
      </TableCell>
      <TableCell className="text-center">
        <Badge size="sm" variant="secondary">
          {script.steps.length}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-text-muted">
        {formatDate(script.createdAt)}
      </TableCell>
      <TableCell className="text-sm text-text-muted">
        {formatDate(script.updatedAt)}
      </TableCell>
      <TableCell>{sparkline}</TableCell>
      <TableCell>
        <Flex align="center" gap="sm">
          <Button
            size="icon"
            title="Run"
            variant="ghost"
            onClick={onRun}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            title={isWatched ? 'Stop watching' : 'Watch for changes'}
            variant="ghost"
            onClick={onToggleWatch}
          >
            {isWatched ? (
              <Eye className="h-4 w-4 text-green-500" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onSchedule}>
                <Calendar className="mr-2 h-4 w-4" /> Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDataRun}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Data-Driven Run
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Flex>
      </TableCell>
    </TableRow>
  );
}
