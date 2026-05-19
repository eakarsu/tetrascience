// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapLiteratureMiningPage() {
  return (
    <GapFeaturePage
      title="Literature Mining (PubMed/bioRxiv)"
      description="Literature Mining (PubMed/bioRxiv)"
      slug="literature-mining"
      aiResultKey="papers"
      fields={[
  {
    "name": "topic",
    "label": "Topic",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "keywords",
    "label": "Keywords",
    "type": "array"
  }
]}
    />
  )
}
