import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6575FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090D] disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px]",
  {
    variants: {
      variant: {
        primary: "bg-[#E94B78] text-white hover:bg-[#d83e6a] active:bg-[#c6355f]",
        secondary:
          "border border-[#252A35] bg-[#101218] text-white hover:bg-[#1B202B] active:bg-[#151821]",
        ghost: "bg-transparent text-[#9CA3AF] hover:bg-[#1B202B] hover:text-white",
        destructive:
          "border border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5] hover:bg-[#EF4444] hover:text-white",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const isDisabled = Boolean(disabled || loading);

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          aria-busy={loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
