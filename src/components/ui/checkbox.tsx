"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <div className="relative flex items-center">
        <input
            type="checkbox"
            ref={ref}
            className={cn(
                "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:text-primary-foreground",
                className
            )}
            {...props}
        />
        <Check className="absolute top-0 left-0 h-4 w-4 hidden peer-checked:block text-white pointer-events-none" />
    </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
