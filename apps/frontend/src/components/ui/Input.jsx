import { forwardRef } from "react";

export const Input = forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="mb-5 w-full text-left">
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-800">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/50 transition-colors ${
          error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"
        }`}
        {...props}
      />
      {error && (
        <span className="block mt-1.5 text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

Input.displayName = "Input";
