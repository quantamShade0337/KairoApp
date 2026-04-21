import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-[#4F46E5] border border-black hover:border-[#4F46E5]",
  secondary: "bg-white text-black border border-[#eaeaea] hover:border-black",
  ghost: "bg-transparent text-[#666] hover:text-black border border-transparent",
  accent: "bg-[#4F46E5] text-white border border-[#4F46E5] hover:bg-black hover:border-black",
};

export default function Button({ variant = "primary", children, className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
