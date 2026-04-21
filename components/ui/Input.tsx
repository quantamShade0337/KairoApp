import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = "", ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-black">{label}</label>
      )}
      <input
        className={`w-full border border-[#eaeaea] rounded-md px-3 py-2 text-sm text-black placeholder:text-[#666] outline-none focus:border-black transition-colors duration-150 ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
