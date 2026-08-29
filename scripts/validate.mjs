#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from '../lib/validate.mjs';

const datasetRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = await validateDataset(datasetRoot);
console.log(`Validated ${manifest.reports.length} sharing reports.`);

