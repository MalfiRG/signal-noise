import Skills from "@/features/skills/Skills";
import Seo from "@/components/Seo";

const SkillsPage = () => (
  <>
    <Seo title="Skills - Tech Radar" description="Technical skills and proficiency levels - test automation, AI, DevOps" path="/skills" />
    <Skills />
  </>
);

export default SkillsPage;
