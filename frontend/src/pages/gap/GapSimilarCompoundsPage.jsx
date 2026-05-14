// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapSimilarCompoundsPage() {
  return (
    <GapFeaturePage
      title="Similar Compound Drug-Discovery Finder"
      description="Similar Compound Drug-Discovery Finder"
      slug="similar-compounds"
      aiResultKey="compounds"
      fields={[
  {
    "name": "smiles",
    "label": "SMILES",
    "required": true,
    "placeholder": ""
  }
]}
    />
  )
}
