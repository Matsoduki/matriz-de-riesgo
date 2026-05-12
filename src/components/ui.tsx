import React, { useEffect } from "react";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-2xl border border-slate-200/60 bg-white text-slate-950 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50", className)} {...props} />
  )
)
Card.displayName = "Card"

export const PremiumCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { gradient?: boolean }>(
  ({ className, gradient, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-3xl border border-white/20 bg-white/80 backdrop-blur-xl text-slate-950 shadow-2xl shadow-slate-200/40 relative overflow-hidden group",
        gradient && "bg-gradient-to-br from-white to-slate-50/50",
        className
      )} 
      {...props} 
    />
  )
)
PremiumCard.displayName = "PremiumCard"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-2 p-8", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-bold leading-none tracking-tight text-slate-900", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs font-medium text-slate-400 uppercase tracking-widest", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-8 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'ghost'|'premium'|'danger', size?: 'default'|'sm'|'lg'|'xl' }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-slate-900 text-slate-50 hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95",
      outline: "border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-sm active:scale-95",
      ghost: "hover:bg-slate-100 hover:text-slate-900 active:scale-95",
      premium: "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200 ring-4 ring-brand-50 active:scale-95",
      danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200 active:scale-95",
    };
    const sizes = {
      default: "h-11 px-6 py-2 rounded-xl text-sm font-semibold",
      sm: "h-9 rounded-lg px-4 text-xs font-bold uppercase tracking-wider",
      lg: "h-14 rounded-2xl px-10 text-base font-bold",
      xl: "h-16 rounded-[2rem] px-12 text-lg font-black",
    };
    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow hover:border-slate-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow hover:border-slate-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all"
        role="dialog"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-200 text-slate-500 transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
}
