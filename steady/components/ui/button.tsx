import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary hover:opacity-90",
        outline: "border border-border bg-surface hover:bg-sunk",
        ghost: "border border-transparent text-muted-foreground hover:bg-surface hover:border-border hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline p-0 h-auto",
        destructive: "bg-bad text-white hover:opacity-90",
      },
      size: {
        default: "h-[38px] px-4",
        sm: "h-8 px-3",
        icon: "size-8 rounded-[7px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
