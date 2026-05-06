import ProjectsList from "@/features/projects/ProjectsList";
import Seo from "@/components/Seo";

const ProjectsPage = () => (
  <>
    <Seo title="Projects" description="Open source and personal projects by Piotr Tarach" path="/projects" />
    <ProjectsList />
  </>
);

export default ProjectsPage;
