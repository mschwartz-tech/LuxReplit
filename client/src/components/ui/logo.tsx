import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  type?: "banner" | "icon";
}

export function Logo({ size = "md", type = "banner", className, ...props }: LogoProps) {
  const dimensions = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const bannerDimensions = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12"
  };

  if (type === "icon") {
    return (
      <div className={cn("relative", className)} {...props}>
        <img
          src="/assets/branding/icon.png"
          alt="Company Icon"
          className={cn(dimensions[size], "object-contain")}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden text-xl font-bold">
          F
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} {...props}>
      <div className="flex items-center gap-2">
        <img
          src="/assets/branding/logo.png"
          alt="Company Logo"
          className={cn(bannerDimensions[size], "object-contain")}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden text-xl font-bold">
          FitStudio
        </div>
      </div>
    </div>
  );
}