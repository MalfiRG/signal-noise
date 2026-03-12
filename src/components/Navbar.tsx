import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut, Plus, Terminal, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { howIDoItPages } from "@/features/how-i-do-it/data";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const links = [
    { to: "/", label: "HOME" },
    { to: "/projects", label: "PROJECTS" },
    { to: "/skills", label: "SKILLS" },
    { to: "/blog", label: "BLOG" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `text-sm tracking-widest transition-colors hover:text-primary ${
      isActive(path) ? "text-primary text-glow" : "text-muted-foreground"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-lg font-bold text-foreground text-glow tracking-wider">
          <Terminal className="inline-block mr-2 h-5 w-5" />
          SDET_PORTFOLIO
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={navLinkClass(link.to)}>
              {link.label}
            </Link>
          ))}

          {/* How I Do It dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1 text-sm tracking-widest transition-colors hover:text-primary ${
                isActive("/how-i-do-it") ? "text-primary text-glow" : "text-muted-foreground"
              }`}
            >
              HOW I DO IT
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem
                onClick={() => navigate("/how-i-do-it")}
                className="text-foreground hover:text-primary cursor-pointer text-xs tracking-wider"
              >
                Overview
              </DropdownMenuItem>
              {howIDoItPages.map((page) => (
                <DropdownMenuItem
                  key={page.slug}
                  onClick={() => navigate(`/how-i-do-it/${page.slug}`)}
                  className="text-foreground hover:text-primary cursor-pointer text-xs tracking-wider"
                >
                  {page.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs tracking-wider border-primary/30 hover:border-primary hover:text-primary">
                  ADMIN
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => navigate("/admin/project")} className="text-foreground hover:text-primary cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/blog")} className="text-foreground hover:text-primary cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" /> New Blog Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs tracking-wider border-primary/30 hover:border-primary hover:text-primary">
                LOGIN
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-border w-64">
              <SheetHeader>
                <SheetTitle className="font-display text-foreground text-glow tracking-wider text-left">
                  NAVIGATION
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(link.to)}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="border-t border-border pt-4">
                  <p className="text-xs tracking-[0.2em] text-muted-foreground mb-3">HOW I DO IT</p>
                  <div className="flex flex-col gap-2 pl-2">
                    <Link
                      to="/how-i-do-it"
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass("/how-i-do-it")}
                    >
                      Overview
                    </Link>
                    {howIDoItPages.map((page) => (
                      <Link
                        key={page.slug}
                        to={`/how-i-do-it/${page.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="text-sm tracking-wider text-muted-foreground hover:text-primary transition-colors"
                      >
                        {page.title}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {user ? (
                    <>
                      <Link
                        to="/admin/project"
                        onClick={() => setMobileOpen(false)}
                        className="block text-sm tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2"
                      >
                        New Project
                      </Link>
                      <Link
                        to="/admin/blog"
                        onClick={() => setMobileOpen(false)}
                        className="block text-sm tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2"
                      >
                        New Blog Post
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setMobileOpen(false); }}
                        className="text-sm tracking-wider text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm tracking-wider text-muted-foreground hover:text-primary transition-colors"
                    >
                      LOGIN
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
