import { lazy, Suspense } from "react";
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
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const BlogLayoutPage = lazy(() => import("./pages/BlogLayoutPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogSlugPage = lazy(() => import("./pages/BlogSlugPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const HowIDoItIndexPage = lazy(() => import("./pages/HowIDoItIndexPage"));
const HowIDoItSlugPage = lazy(() => import("./pages/HowIDoItSlugPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// [§Task 1.0c — C10/C11/H2] Design-companion is dev-only. The ternary collapses to
// `null` at build time (Vite substitutes `import.meta.env.DEV` → `false`), and Rollup's
// DCE removes the dynamic-import branch entirely — no design-companion chunk lands in
// dist/, satisfying the sentinel sweep. Top-level await is permitted because
// tsconfig.app.json sets module:ESNext + target:ES2020.
// Gate on DEV AND opt-in flag — VITE_DESIGN_COMPANION=1 enables the editor in dev.
// Routine `npm run dev` runs without the editor; `npm run dev:design` enables it.
const DESIGN_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DESIGN_COMPANION === '1';
const DesignCompanion = DESIGN_ENABLED
  ? (await import("./design-companion/core/DesignCompanion")).DesignCompanion
  : null;
const DesignToggle = DESIGN_ENABLED
  ? (await import("./design-companion/core/DesignToggle")).DesignToggle
  : null;

const queryClient = new QueryClient();

export const AppContent = () => {
  const location = useLocation();
  const isReadingMode = /^\/(blog|how-i-do-it)\/[^/]+/.test(location.pathname);
  const isTextSection = /^\/(blog|how-i-do-it)(\/|$)/.test(location.pathname);
  useScrollRestoration();

  return (
    <>
      <Navbar />
      {!isTextSection && <div className="scanline-overlay scan-sweep" />}
      <div className={isReadingMode ? "theme-reading min-h-screen bg-background" : ""}>
        {/* Single <main> landmark per WCAG 2.4.1 — Bypass Blocks. Was
            previously absent on /, /projects, /skills, /how-i-do-it,
            and only present on blog pages via BlogLayout's nested <main>.
            Centralizing here means every route gets exactly one main, and
            BlogLayout's main was downgraded to <div> to avoid duplicates. */}
        <main id="main-content">
          <Suspense fallback={null}>
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
                {DesignCompanion && (
                  <Route path="/__design" element={<DesignCompanion />}>
                    <Route index element={<Index />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="skills" element={<SkillsPage />} />
                    <Route path="how-i-do-it" element={<HowIDoItIndexPage />} />
                    <Route path="how-i-do-it/:slug" element={<HowIDoItSlugPage />} />
                    <Route path="blog" element={<BlogLayoutPage />}>
                      <Route index element={<BlogIndexPage />} />
                      <Route path=":slug" element={<BlogSlugPage />} />
                    </Route>
                  </Route>
                )}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </main>
      </div>
      {DesignToggle && <DesignToggle />}
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
