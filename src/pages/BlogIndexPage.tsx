import BlogIndex from "@/features/blog/BlogIndex";
import Seo from "@/components/Seo";

const BlogIndexPage = () => (
  <>
    <Seo title="Blog" description="Technical blog posts about AI workflows, test automation, and DevOps" path="/blog" />
    <BlogIndex />
  </>
);

export default BlogIndexPage;
