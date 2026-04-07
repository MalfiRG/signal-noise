import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const THEMES = [
  { id: "matrix", label: "Matrix", color: "hsl(120 100% 50%)" },
  { id: "violet", label: "Violet", color: "hsl(270 100% 60%)" },
  { id: "amber", label: "Amber", color: "hsl(38 85% 50%)" },
] as const;

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Theme selector">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`w-5 h-5 rounded-full border-2 p-2.5 box-content transition-all duration-200 ${
              theme === t.id
                ? "border-foreground scale-110"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            style={{ backgroundColor: t.color }}
            role="radio"
            aria-checked={theme === t.id}
            aria-label={`Switch to ${t.label} theme`}
          />
        ))}
      </div>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="w-5 h-5 rounded-full border-2 border-foreground"
          style={{
            backgroundColor: THEMES.find((t) => t.id === theme)?.color ?? THEMES[0].color,
          }}
          aria-label="Open theme selector"
        />
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-8">
        <SheetTitle className="text-sm text-muted-foreground tracking-wider mb-4">
          THEME
        </SheetTitle>
        <div className="flex flex-col gap-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 px-4 min-h-[48px] rounded transition-colors ${
                theme === t.id
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ThemeSelector;
