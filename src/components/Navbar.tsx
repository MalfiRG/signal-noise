import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Terminal, Menu, ChevronDown, Github, Linkedin } from "lucide-react";
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

const SOCIAL_ICON_CLASS =
  "w-5 h-5 rounded-full border-2 p-2.5 box-content transition-all duration-200 border-transparent opacity-50 hover:opacity-80 inline-flex items-center justify-center text-foreground";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    `text-sm tracking-widest transition-colors hover:text-primary nav-link-motion glitch-hover ${
      isActive(path) ? "text-primary text-glow" : "text-muted-foreground"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-lg font-bold text-foreground text-glow tracking-wider">
          <Terminal className="inline-block mr-2 h-5 w-5" />
          SIGNAL_NOISE
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={navLinkClass(link.to)}
              data-text={link.label}
              {...(isActive(link.to) ? { "aria-current": "page" as const } : {})}
            >
              {link.label}
            </Link>
          ))}

          {/* How I Do It dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1 text-sm tracking-widest transition-colors hover:text-primary nav-link-motion glitch-hover ${
                isActive("/how-i-do-it") ? "text-primary text-glow" : "text-muted-foreground"
              }`}
              data-text="HOW I DO IT"
              {...(isActive("/how-i-do-it") ? { "aria-current": "page" as const } : {})}
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

          <div className="flex items-center gap-1.5">
            <a
              href="https://github.com/MalfiRG"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={SOCIAL_ICON_CLASS}
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://www.linkedin.com/in/piotrtarach/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className={SOCIAL_ICON_CLASS}
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Mobile: hamburger only */}
        <div className="md:hidden flex items-center">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground min-h-[44px] min-w-[44px]" aria-label="Open navigation menu" data-testid="hamburger-menu">
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
