#!/usr/bin/env node
// Wipe a channel's userData directory so the next launch starts fresh.
// Usage: node scripts/reset-channel.mjs local
//        node scripts/reset-channel.mjs dev
//        node scripts/reset-channel.mjs release    # DANGER: deletes real user data

import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const CHANNEL_DIR = {
  release: 'ADC',
  local: 'ADC-Local',
  dev: 'ADC-Dev',
};

async function confirm(message) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${message} (yes/no) `);
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

async function main() {
  const channel = process.argv[2];
  if (!channel || !(channel in CHANNEL_DIR)) {
    console.error(`Usage: node scripts/reset-channel.mjs <release|local|dev>`);
    process.exit(1);
  }

  const appData = process.env.APPDATA;
  if (!appData) {
    console.error('APPDATA env var not set — this script is Windows-only.');
    process.exit(1);
  }

  const target = join(appData, CHANNEL_DIR[channel]);
  if (!existsSync(target)) {
    console.log(`Nothing to do — ${target} does not exist.`);
    return;
  }

  if (channel === 'release') {
    const ok = await confirm(`About to delete ${target} — this is your REAL installed-app data.`);
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  console.log(`Removing ${target} ...`);
  await rm(target, { recursive: true, force: true });
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
