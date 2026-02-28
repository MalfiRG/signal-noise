import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("ACCESS GRANTED");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card/80 p-8">
        <h1 className="font-display text-2xl font-bold text-foreground text-glow mb-2 text-center">
          {isLogin ? "LOGIN" : "REGISTER"}
        </h1>
        <p className="text-muted-foreground text-xs tracking-wider text-center mb-8">
          {">"} {isLogin ? "AUTHENTICATE TO ACCESS ADMIN" : "CREATE NEW OPERATOR ACCOUNT"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <Input
            type="email"
            placeholder="email@matrix.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
          />
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/80 tracking-widest text-xs"
          >
            {loading ? "PROCESSING..." : isLogin ? "ACCESS" : "REGISTER"}
          </Button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 text-xs text-muted-foreground hover:text-primary tracking-wider w-full text-center transition-colors"
        >
          {isLogin ? "> CREATE ACCOUNT" : "> ALREADY REGISTERED? LOGIN"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
