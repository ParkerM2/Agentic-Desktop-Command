import { FileSpreadsheet } from 'lucide-react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  Input,
  Label,
  ScrollArea,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@ui';

import { useDataRunDialog } from './useDataRunDialog';

interface DataRunDialogProps {
  scriptId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataRunDialog({ scriptId, open, onOpenChange }: DataRunDialogProps) {
  const vm = useDataRunDialog({ scriptId, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Data-Driven Run
          </DialogTitle>
        </DialogHeader>
        <Stack gap="md">
          <Stack gap="sm">
            <Label>Data File (CSV or JSON)</Label>
            <Flex gap="sm" wrap="nowrap">
              <Input
                placeholder="/path/to/data.csv"
                value={vm.filePath}
                onChange={(e) => vm.setFilePath(e.target.value)}
              />
              <Button variant="outline" onClick={vm.handleParse}>
                Parse
              </Button>
            </Flex>
          </Stack>

          {vm.parsed ? (
            <>
              <Flex align="center" gap="sm">
                <Badge variant="secondary">{vm.parsed.rowCount} rows</Badge>
                <Badge variant="secondary">{vm.parsed.headers.length} columns</Badge>
              </Flex>

              <ScrollArea className="max-h-48 rounded border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      {vm.parsed.headers.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vm.parsed.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={`row-${String(i)}`}>
                        <TableCell className="text-text-muted">{i + 1}</TableCell>
                        {vm.parsed?.headers.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {vm.parsed.rowCount > 5 ? (
                      <TableRow>
                        <TableCell
                          className="text-center text-text-muted"
                          colSpan={vm.parsed.headers.length + 1}
                        >
                          ... and {vm.parsed.rowCount - 5} more rows
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </ScrollArea>

              <Text size="sm" variant="muted">
                Use {'{{columnName}}'} in fill step values to substitute data from each row.
                Test will run once per row.
              </Text>

              <Button
                className="w-full"
                disabled={vm.executing}
                onClick={vm.handleExecute}
              >
                Run {vm.parsed.rowCount} Iterations
              </Button>
            </>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
