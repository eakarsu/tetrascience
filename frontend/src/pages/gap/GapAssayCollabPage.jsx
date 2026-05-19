// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapAssayCollabPage() {
  return (
    <GapFeaturePage
      title="Assay Result Collaboration"
      description="Assay Result Collaboration"
      slug="assay-collab"
      aiResultKey="comment"
      fields={[
  {
    "name": "assayId",
    "label": "Assay ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "user",
    "label": "User",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "comment",
    "label": "Comment",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
