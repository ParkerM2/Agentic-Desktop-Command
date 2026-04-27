/**
 * Test Suite Data-Driven Runner
 *
 * Parses CSV/JSON data files and iterates rows as test data. Callers run the
 * test script once per row, substituting {{key}} placeholders in fill-step
 * values with the row's column values.
 */

import fs from 'node:fs';
import path from 'node:path';

export type DataRow = Record<string, string>;

export function parseDataFile(filePath: string): DataRow[] {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');

  if (ext === '.json') {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) throw new Error('JSON data file must be an array of objects');
    return parsed as DataRow[];
  }

  if (ext === '.csv') {
    return parseCsv(content);
  }

  throw new Error(`Unsupported data file format: ${ext}. Use .csv or .json`);
}

function parseCsv(content: string): DataRow[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: DataRow = {};
    for (const [j, header] of headers.entries()) {
      row[header] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

function handleQuoteChar(state: CsvLineState, line: string, index: number): number {
  if (state.inQuotes && line[index + 1] === '"') {
    state.current += '"';
    return index + 1;
  }
  state.inQuotes = !state.inQuotes;
  return index;
}

interface CsvLineState {
  current: string;
  inQuotes: boolean;
  result: string[];
}

function parseCsvLine(line: string): string[] {
  const state: CsvLineState = { current: '', inQuotes: false, result: [] };

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      i = handleQuoteChar(state, line, i);
    } else if (char === ',' && !state.inQuotes) {
      state.result.push(state.current.trim());
      state.current = '';
    } else {
      state.current += char;
    }
  }

  state.result.push(state.current.trim());
  return state.result;
}

type StepLike = { type: string; value?: string } & Record<string, unknown>;

export function substituteDataInSteps(steps: StepLike[], dataRow: DataRow): StepLike[] {
  return steps.map((step) => {
    if (step.type !== 'fill' || !step.value) return step;

    let { value } = step;
    for (const [key, val] of Object.entries(dataRow)) {
      value = value.replaceAll(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }

    return { ...step, value };
  });
}
