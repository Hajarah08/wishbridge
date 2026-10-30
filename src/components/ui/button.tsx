import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "coral" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-plum-800 text-white hover:bg-plum-700 shadow-soft",
  secondary: "bg-white text-plum-800 ring-1 ring-plum-200 hover:ring-plum-300 hover:bg-plum-50",
  coral: "bg-coral-500 text-white hover:bg-coral-700 shadow-soft",
  ghost: "text-plum-700 hover:bg-plum-50",
  danger: "bg-white text-coral-700 ring-1 ring-coral-300 hover:bg-coral-50",
  success: "bg-sage-700 text-white hover:bg-sage-500",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
