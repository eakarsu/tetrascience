import AdvisoryWorkspace from '../components/runtime-ai/AdvisoryWorkspace';

export default function AIStudio() {
  return <AdvisoryWorkspace
    title="Assay operations advisory"
    description="Use deidentified administrative summaries. AI never approves, releases, rejects, diagnoses or changes assay evidence; qualified humans retain every regulated decision."
    endpoint="/api/runtime-ai/assay-readiness"
    field="workflowSummary"
    fieldLabel="Deidentified administrative workflow summary"
    maxLength={2000}
    minLength={1}
    examples={[{"label": "Fill all \u00b7 Operating review", "value": "Example review scope: prepare administrative readiness checks for an assay workflow. Actual instrument calibration, sample identity, protocol versions, measurements and signed review evidence are not supplied. Identify missing evidence and escalation questions without approving, releasing, rejecting or modifying assay results."}, {"label": "Fill all \u00b7 Risk review", "value": "Example review scope: assess administrative gaps in instrument packet provenance, source freshness and independent quality review. No actual assay or patient data is supplied. Identify evidence to verify and qualified reviewer questions; leave every scientific and regulated decision to authorized humans."}, {"label": "Fill all \u00b7 Action plan", "value": "Example review scope: prepare an administrative checklist from instrument packet intake through scientist submission and independent quality review. Actual records and signatures are not provided. Outline verification steps and responsible roles without inventing assay evidence or authorizing a release."}]}
    tokenStorage="token"
  />;
}
