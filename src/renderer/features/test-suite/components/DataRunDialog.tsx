import { useState } from 'react';

import { FileSpreadsheet } from 'lucide-react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

import { useExecuteDataRun, useParseDataFile } from '../api/useDataRun';

interface DataRunDialogProps {
  scriptId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataRunDialog({ scriptId, open, onOpenChange }: DataRunDialogProps) {
  const [filePath, setFilePath] = useState('');
  const parseFile = useParseDataFile();
  const executeRun = useExecuteDataRun();

  const handleParse = () => {
    if (!filePath.trim()) return;
    parseFile.mutate(filePath.trim());
  };

  const handleExecute = () => {
    executeRun.mutate(
      { scriptId, dataFilePath: filePath.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const parsed = parseFile.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Data-Driven Run
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Data File (CSV or JSON)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="/path/to/data.csv"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
              <Button variant="outline" onClick={handleParse}>
                Parse
              </Button>
            </div>
          </div>

          {parsed ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{parsed.rowCount} rows</Badge>
                <Badge variant="secondary">{parsed.headers.length} columns</Badge>
              </div>

              <div className="max-h-48 overflow-auto rounded border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      {parsed.headers.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={`row-${String(i)}`}>
                        <TableCell className="text-text-muted">{i + 1}</TableCell>
                        {parsed.headers.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {parsed.rowCount > 5 ? (
                      <TableRow>
                        <TableCell
                          className="text-center text-text-muted"
                          colSpan={parsed.headers.length + 1}
                        >
                          ... and {parsed.rowCount - 5} more rows
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-text-muted">
                Use {'{{columnName}}'} in fill step values to substitute data from each row.
                Test will run once per row.
              </p>

              <Button
                className="w-full"
                disabled={executeRun.isPending}
                onClick={handleExecute}
              >
                Run {parsed.rowCount} Iterations
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
