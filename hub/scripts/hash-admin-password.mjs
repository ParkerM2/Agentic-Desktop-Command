#!/usr/bin/env node
import { hash, Algorithm } from '@node-rs/argon2';

const pw = process.argv[2];
if (pw === undefined || pw === '') {
  console.error('Usage: node hash-admin-password.mjs <password>');
  process.exit(1);
}
const digest = await hash(pw, {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});
console.log(digest);
