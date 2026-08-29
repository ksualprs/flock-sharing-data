import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateDataset } from '../lib/validate.mjs';

const VALID_REPORT = {
	id: 'example-ga-pd-2026-01-02',
	agencyName: 'Example GA PD',
	aliases: ['Example Police'],
	reportDate: '2026-01-02',
	csvPath: 'reports/example-ga-pd/2026-01-02.csv',
	provenance: { description: 'Test fixture.' },
};

const VALID_CSV = `Organization Name,Networks Shared With Me,Networks I'm Sharing\nNeighbor GA PD,Neighbor GA PD,Example GA PD\n`;

async function makeDataset(mutator = () => {}) {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'flock-sharing-data-'));
	const manifest = { schemaVersion: 1, reports: [structuredClone(VALID_REPORT)] };
	await fs.mkdir(path.join(root, 'reports/example-ga-pd'), { recursive: true });
	await fs.writeFile(path.join(root, VALID_REPORT.csvPath), VALID_CSV);
	await mutator({ root, manifest });
	await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
	return root;
}

test('validates a well-formed dataset', async () => {
	const root = await makeDataset();
	await assert.doesNotReject(validateDataset(root));
});

test('rejects invalid dates and unsafe paths', async () => {
	const invalidDateRoot = await makeDataset(({ manifest }) => {
		manifest.reports[0].reportDate = '2026-02-30';
	});
	await assert.rejects(validateDataset(invalidDateRoot), /real YYYY-MM-DD/);

	const unsafePathRoot = await makeDataset(({ manifest }) => {
		manifest.reports[0].csvPath = '../outside.csv';
	});
	await assert.rejects(validateDataset(unsafePathRoot), /normalized POSIX path|under reports/);
});

test('rejects duplicate aliases across reports', async () => {
	const root = await makeDataset(async ({ root, manifest }) => {
		const duplicate = structuredClone(VALID_REPORT);
		duplicate.id = 'another-ga-pd-2026-01-03';
		duplicate.agencyName = 'Another GA PD';
		duplicate.reportDate = '2026-01-03';
		duplicate.csvPath = 'reports/another-ga-pd/2026-01-03.csv';
		await fs.mkdir(path.join(root, 'reports/another-ga-pd'), { recursive: true });
		await fs.writeFile(path.join(root, duplicate.csvPath), VALID_CSV);
		manifest.reports.push(duplicate);
	});
	await assert.rejects(validateDataset(root), /Duplicate agency name or alias/);
});

test('rejects malformed headers, blank organizations, and orphaned CSV files', async () => {
	const badHeaderRoot = await makeDataset(async ({ root }) => {
		await fs.writeFile(path.join(root, VALID_REPORT.csvPath), 'Wrong,Headers,Here\nvalue,value,value\n');
	});
	await assert.rejects(validateDataset(badHeaderRoot), /exactly these headers/);

	const blankOrgRoot = await makeDataset(async ({ root }) => {
		await fs.writeFile(path.join(root, VALID_REPORT.csvPath), `Organization Name,Networks Shared With Me,Networks I'm Sharing\n,Neighbor,Example\n`);
	});
	await assert.rejects(validateDataset(blankOrgRoot), /blank Organization Name/);

	const orphanRoot = await makeDataset(async ({ root }) => {
		await fs.writeFile(path.join(root, 'reports/example-ga-pd/orphan.csv'), VALID_CSV);
	});
	await assert.rejects(validateDataset(orphanRoot), /referenced exactly once/);
});

