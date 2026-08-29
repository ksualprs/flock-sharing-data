import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';

export const EXPECTED_HEADERS = [
	'Organization Name',
	'Networks Shared With Me',
	"Networks I'm Sharing",
];

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalize(value) {
	return value.trim().toLowerCase();
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function isRealIsoDate(value) {
	if (!DATE_PATTERN.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function listCsvFiles(directory, root = directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...await listCsvFiles(fullPath, root));
		} else if (entry.isFile() && entry.name.endsWith('.csv')) {
			files.push(path.relative(root, fullPath).split(path.sep).join('/'));
		}
	}

	return files.sort();
}

export async function validateDataset(datasetRoot) {
	const manifestPath = path.join(datasetRoot, 'manifest.json');
	const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

	assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest.json must contain an object.');
	assert(manifest.schemaVersion === 1, 'manifest.schemaVersion must equal 1.');
	assert(Array.isArray(manifest.reports) && manifest.reports.length > 0, 'manifest.reports must be a non-empty array.');

	const ids = new Set();
	const csvPaths = new Set();
	const agencyNames = new Set();
	const searchableNames = new Map();

	for (const [index, report] of manifest.reports.entries()) {
		const label = `reports[${index}]`;
		assert(report && typeof report === 'object' && !Array.isArray(report), `${label} must be an object.`);
		assert(typeof report.id === 'string' && ID_PATTERN.test(report.id), `${label}.id must be a lowercase kebab-case identifier.`);
		assert(!ids.has(report.id), `Duplicate report id: ${report.id}`);
		ids.add(report.id);

		assert(typeof report.agencyName === 'string' && report.agencyName.trim(), `${label}.agencyName must be a non-blank string.`);
		const normalizedAgency = normalize(report.agencyName);
		assert(!agencyNames.has(normalizedAgency), `Duplicate agency name: ${report.agencyName}`);
		agencyNames.add(normalizedAgency);

		assert(Array.isArray(report.aliases), `${label}.aliases must be an array.`);
		for (const name of [report.agencyName, ...report.aliases]) {
			assert(typeof name === 'string' && name.trim(), `${label} contains a blank or non-string searchable name.`);
			const normalizedName = normalize(name);
			const priorOwner = searchableNames.get(normalizedName);
			assert(!priorOwner, `Duplicate agency name or alias "${name}" in ${report.id} and ${priorOwner}.`);
			searchableNames.set(normalizedName, report.id);
		}

		assert(report.reportDate === null || (typeof report.reportDate === 'string' && isRealIsoDate(report.reportDate)), `${label}.reportDate must be a real YYYY-MM-DD date or null.`);
		assert(typeof report.csvPath === 'string' && report.csvPath.length > 0, `${label}.csvPath must be a non-blank string.`);
		assert(report.csvPath === path.posix.normalize(report.csvPath), `${label}.csvPath must be a normalized POSIX path.`);
		assert(report.csvPath.startsWith('reports/') && report.csvPath.endsWith('.csv'), `${label}.csvPath must point to a CSV under reports/.`);
		assert(!path.posix.isAbsolute(report.csvPath) && !report.csvPath.split('/').includes('..'), `${label}.csvPath must not escape the dataset.`);
		assert(!csvPaths.has(report.csvPath), `Duplicate CSV path: ${report.csvPath}`);
		csvPaths.add(report.csvPath);

		assert(report.provenance && typeof report.provenance === 'object' && !Array.isArray(report.provenance), `${label}.provenance must be an object.`);
		assert(typeof report.provenance.description === 'string' && report.provenance.description.trim(), `${label}.provenance.description must be a non-blank string.`);

		const csvText = await fs.readFile(path.join(datasetRoot, report.csvPath), 'utf8');
		const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
		assert(parsed.errors.length === 0, `${report.csvPath} contains CSV parse errors: ${parsed.errors.map((error) => error.message).join('; ')}`);
		assert(JSON.stringify(parsed.meta.fields) === JSON.stringify(EXPECTED_HEADERS), `${report.csvPath} must contain exactly these headers in order: ${EXPECTED_HEADERS.join(', ')}`);
		assert(parsed.data.length > 0, `${report.csvPath} must contain at least one data row.`);

		for (const [rowIndex, row] of parsed.data.entries()) {
			for (const header of EXPECTED_HEADERS) {
				assert(typeof row[header] === 'string', `${report.csvPath} row ${rowIndex + 2} has a non-string ${header} value.`);
			}
			assert(row['Organization Name'].trim(), `${report.csvPath} row ${rowIndex + 2} has a blank Organization Name.`);
		}
	}

	const actualCsvPaths = (await listCsvFiles(path.join(datasetRoot, 'reports'))).map((file) => `reports/${file}`);
	const referencedCsvPaths = [...csvPaths].sort();
	assert(JSON.stringify(actualCsvPaths) === JSON.stringify(referencedCsvPaths), `CSV files must be referenced exactly once by manifest.json. Expected ${referencedCsvPaths.length}; found ${actualCsvPaths.length}.`);

	return manifest;
}

