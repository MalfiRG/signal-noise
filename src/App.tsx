import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import ProjectsPage from "./pages/ProjectsPage";
import BlogLayoutPage from "./pages/BlogLayoutPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogSlugPage from "./pages/BlogSlugPage";
import SkillsPage from "./pages/SkillsPage";
import HowIDoItIndexPage from "./pages/HowIDoItIndexPage";
import HowIDoItSlugPage from "./pages/HowIDoItSlugPage";
import NotFound from "./pages/NotFound";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isReadingMode = /^\/(blog|how-i-do-it)\/[^/]+/.test(location.pathname);
  const isTextSection = /^\/(blog|how-i-do-it)(\/|$)/.test(location.pathname);
  useScrollRestoration();

  return (
    <>
      <Navbar />
      {!isTextSection && <div className="scanline-overlay scan-sweep" />}
      <div className={isReadingMode ? "theme-reading min-h-screen bg-background" : ""}>
        <PageTransition>
          <Routes location={location}>
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
        </PageTransition>
      </div>
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider
      themes={["cyberpunk-gold"]}
      attribute="class"
      value={{ "cyberpunk-gold": "theme-cyberpunk-gold" }}
      defaultTheme="cyberpunk-gold"
      storageKey="theme-profile"
      enableSystem={false}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
          <Analytics />
          <SpeedInsights />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
