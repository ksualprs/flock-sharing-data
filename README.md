# Flock sharing data

Normalized Flock Safety network-sharing reports published by KSUALPRS. This repository is the source dataset used by [ksualprs.com](https://ksualprs.com/sharing).

Each manifest entry identifies the reporting agency, its known aliases, the report date when one can be established, the normalized CSV path, and a provenance note. The CSVs preserve the three columns exported by Flock:

- `Organization Name`
- `Networks Shared With Me`
- `Networks I'm Sharing`

## Validate locally

```sh
npm ci
npm test
npm run validate
```

See [SCHEMA.md](SCHEMA.md) for the manifest contract and [CONTRIBUTING.md](CONTRIBUTING.md) before adding or updating reports.

## License

To the extent KSUALPRS holds copyright or database rights in this normalized dataset, it is dedicated to the public domain under [CC0 1.0 Universal](LICENSE). Source records may remain subject to rights held by their original creators, and the provenance notes do not assert otherwise.

