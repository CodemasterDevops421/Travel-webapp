"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"

// Simple range slider implementation
const Slider = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        type="range"
        className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary",
            className
        )}
        ref={ref}
        {...props}
    />
))
Slider.displayName = "Slider"

export { Slider }
