import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "banner" | "icon";
}

export function Logo({ size = "md", variant = "banner", className, ...props }: LogoProps) {
  const dimensions = {
    sm: variant === "banner" ? "h-6" : "h-6 w-6",
    md: variant === "banner" ? "h-8" : "h-8 w-8",
    lg: variant === "banner" ? "h-12" : "h-12 w-12"
  };

  return (
    <div className={cn("relative", className)} {...props}>
      <div className="flex items-center gap-2">
        <img
          src={`/public/luxeWorks Logo ${variant === "banner" ? "long" : "short"}.png`}
          alt="LuxeWorks Logo"
          className={cn(
            dimensions[size], 
            "object-contain",
            variant === "banner" ? "w-auto" : undefined
          )}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden text-xl font-bold">
          LuxeWorks
        </div>
      </div>
    </div>
  );
}