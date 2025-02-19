import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md", className, ...props }: LogoProps) {
  const dimensions = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("relative", className)} {...props}>
      {/* If no logo is uploaded, show a text placeholder */}
      <div className="flex items-center gap-2">
        <img
          src="/assets/branding/logo.png"
          alt="Company Logo"
          className={cn(dimensions[size], "object-contain")}
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
