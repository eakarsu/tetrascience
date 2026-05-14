// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCollaborationSuggesterPage() {
  return (
    <GapFeaturePage
      title="Researcher Collaboration Suggester"
      description="Researcher Collaboration Suggester"
      slug="collaboration-suggester"
      aiResultKey="collaborators"
      fields={[
  {
    "name": "researcherId",
    "label": "Researcher ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "interests",
    "label": "Interests",
    "type": "array"
  }
]}
    />
  )
}
