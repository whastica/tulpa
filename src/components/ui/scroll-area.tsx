"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        className="flex w-2.5 touch-none select-none p-0.5"
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="relative flex-1 rounded-full bg-border"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  )
}

export { ScrollArea }