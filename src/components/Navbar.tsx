import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut, Plus, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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
    { to: "/blog", label: "BLOG" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-lg font-bold text-foreground text-glow tracking-wider">
          <Terminal className="inline-block mr-2 h-5 w-5" />
          SDET_PORTFOLIO
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm tracking-widest transition-colors hover:text-primary ${
                location.pathname === link.to
                  ? "text-primary text-glow"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

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
      </div>
    </nav>
  );
};

export default Navbar;
