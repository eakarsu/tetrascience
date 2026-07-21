# Instrument ingestion contract

Instrument adapters authenticate as an `INSTRUMENT_SERVICE` user within one tenant and call `POST /api/assay-workflow/ingestions`. The requested `sourceSystem` must match the registered instrument binding.

```json
{
  "sourceSystem": "lims-gateway",
  "sourceRecordId": "immutable-source-event-123",
  "instrumentKey": "reader-01",
  "sourceTimestamp": "2026-07-20T12:00:00Z",
  "payload": {
    "externalRunKey": "RUN-2026-001",
    "capturedAt": "2026-07-20T11:59:00Z",
    "protocol": {
      "id": "POTENCY-001",
      "version": "3.1",
      "assayType": "POTENCY",
      "requiredAnalyte": "IL-6",
      "resultUnit": "PERCENT",
      "minimumReplicates": 2,
      "lowerBound": 80,
      "upperBound": 120
    },
    "measurements": [
      { "sampleCode": "SAMPLE-001", "analyte": "IL-6", "value": 99.2, "unit": "PERCENT", "replicate": 1, "qualifier": "NONE" }
    ]
  }
}
```

Allowed assays are `POTENCY`, `PURITY`, `BINDING`, and `CELL_VIABILITY`. Allowed result units are `RFU`, `PERCENT`, `NM`, and `MG_PER_ML`; conversion is never implicit. Qualifiers are `NONE`, `LT`, and `GT`. A packet contains at most 5,000 measurements.

`tenant + sourceSystem + sourceRecordId` is the idempotency identity. Retry 503 responses with the same identity and exponential backoff. Exact completed or rejected retries return the prior event. Different content under an existing identity returns `DUPLICATE_EVENT_CONFLICT`; use a new source record ID for a genuine correction. A correction includes `revisionOfRunId` and can target only a quarantined run.

Unknown samples, duplicate replicates, unauthorized source bindings, and malformed packets are rejected without a run. Unit/analyte/replicate/calibration failures persist a quarantined run and findings for investigation. Never invent new IDs merely to bypass a rejection.
