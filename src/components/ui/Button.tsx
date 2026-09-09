import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          {
            "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md": variant === "default",
            "bg-red-500 text-white shadow-sm hover:bg-red-600": variant === "destructive",
            "border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900": variant === "outline",
            "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "secondary",
            "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",
            "text-slate-900 underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-12 px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
