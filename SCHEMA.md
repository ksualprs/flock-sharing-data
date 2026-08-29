# Dataset schema

`manifest.json` is the stable machine-readable entry point.

- `schemaVersion`: currently `1`.
- `reports`: a non-empty array of report records.
- `reports[].id`: globally unique lowercase kebab-case identifier.
- `reports[].agencyName`: canonical display name for the reporting agency.
- `reports[].aliases`: globally unique alternate names, excluding the canonical name.
- `reports[].reportDate`: ISO `YYYY-MM-DD`, or `null` when the source does not establish a defensible date.
- `reports[].csvPath`: unique relative path to a CSV below `reports/`.
- `reports[].provenance.description`: factual note describing where the normalized report came from.

Every CSV must contain exactly these headers, in this order:

```text
Organization Name,Networks Shared With Me,Networks I'm Sharing
```

All CSVs below `reports/` must appear exactly once in the manifest. Run `npm run validate` to enforce the complete contract.

