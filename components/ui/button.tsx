import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-pink-500 via-violet-500 to-blue-600 hover:from-pink-400 hover:via-violet-400 hover:to-blue-500 text-white shadow-lg shadow-pink-500/25 border border-transparent",
        outline:
          "border border-white/20 bg-transparent text-white hover:border-pink-500/60 hover:bg-pink-500/10 hover:text-pink-200",
        secondary:
          "bg-gradient-to-r from-[#00ff88] to-[#2d6fff] text-black font-semibold hover:opacity-90",
        ghost:
          "bg-transparent text-white/70 hover:bg-white/5 hover:text-white border border-transparent",
        destructive:
          "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-400 hover:to-pink-500 shadow-lg shadow-red-500/25 border border-transparent",
        link:
          "text-[#2d6fff] underline-offset-4 hover:underline hover:text-[#ff2d9b] bg-transparent border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs:      "h-6 px-2 text-xs rounded-md",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-6 text-base",
        icon:    "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-6 rounded-md",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
