// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapElnAuthoringPage() {
  return (
    <GapFeaturePage
      title="Electronic Lab Notebook"
      description="Electronic Lab Notebook"
      slug="eln-authoring"
      aiResultKey="entry"
      fields={[
  {
    "name": "experimentId",
    "label": "Experiment ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "content",
    "label": "Content",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
