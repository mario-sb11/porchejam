import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GameButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(30,215,96,0.25)]",
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

GameButton.displayName = "GameButton";

export default GameButton;
