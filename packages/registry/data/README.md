# registry data

Versioned, reproducible artifacts behind every docfonts verdict. Three layers, kept separate
(provenance vs proof vs public verdict), produced by `scripts/import-research.ts`. Schemas: `../src/types.ts`.

```
data/
  corpus/        <source>-<date>.json   CorpusManifest: open candidate files + provenance + parsed facts
  measurements/  <id>.json              MeasurementResult[]: the proof (analytic / browser / live_layout / face_aggregate)
  registry/
    records.json   EvidenceRecord[]: the PUBLIC verdicts (derived status; point at proof by ID)
    schema.json    JSON Schema for records.json (generated from ../src/schema.ts; keep in sync)
```

## Traceability

Every public claim is traceable down to a license file and a measurement method:

```
EvidenceRecord (records.json)
  -> measurementRefs[]  -> MeasurementResult (measurements/) : the numbers + raw layout detail + method + date + oracle env
  -> candidate.fileSha256 -> CorpusFace (corpus/)            : the exact open file
       -> CorpusFamily.licenseTextSha256                     : the exact license file that accompanied the source
       -> CorpusFace.metadata (FontFaceMetadata)             : parsed facts
```

## Rules

- Durable identity is by stable ID + `fileSha256`, never by path.
- No proprietary font binaries or raw proprietary metric tables are stored. Measurements record the
  oracle environment as a label and reproduce against the user's own licensed fonts.
- The public `EvidenceRecord` carries derived gate status only (`pass` / `not_run` / `fail`); raw
  page counts and break arrays live in a `live_layout` measurement, not on the record.
