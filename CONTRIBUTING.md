# Contributing

1. Add a normalized CSV at `reports/<agency-slug>/<YYYY-MM-DD>.csv`. Use `undated.csv` only when the source does not establish a defensible report date.
2. Add one corresponding record to `manifest.json`. Do not guess dates or provenance.
3. Keep the original Flock column meanings and values; normalization is limited to CSV structure and file naming.
4. Run `npm ci`, `npm test`, and `npm run validate`.
5. Open a pull request describing the source and any transformation used to create the CSV.

Do not publish records containing personal information, credentials, or material that was unintentionally left unredacted.

