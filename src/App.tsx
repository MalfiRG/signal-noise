import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import ProjectsPage from "./pages/ProjectsPage";
import BlogLayoutPage from "./pages/BlogLayoutPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogSlugPage from "./pages/BlogSlugPage";
import SkillsPage from "./pages/SkillsPage";
import HowIDoItIndexPage from "./pages/HowIDoItIndexPage";
import HowIDoItSlugPage from "./pages/HowIDoItSlugPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/how-i-do-it" element={<HowIDoItIndexPage />} />
          <Route path="/how-i-do-it/:slug" element={<HowIDoItSlugPage />} />
          <Route path="/blog" element={<BlogLayoutPage />}>
            <Route index element={<BlogIndexPage />} />
            <Route path=":slug" element={<BlogSlugPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
