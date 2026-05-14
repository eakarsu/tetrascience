// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapBulkImportPage() {
  return (
    <GapFeaturePage
      title="CSV/SDF Bulk Import"
      description="CSV/SDF Bulk Import"
      slug="bulk-import"
      aiResultKey="job"
      fields={[
  {
    "name": "format",
    "label": "Format",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "file",
    "label": "File",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
