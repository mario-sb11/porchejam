import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLAttributes<HTMLDivElement>;

const GlassCard = ({ className, children, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-white/10 backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
