export function Button({ children, disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`w-full py-3 mt-4 rounded-lg font-bold text-white text-base transition-colors ${
        disabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-[#4CAF4F] hover:bg-[#439c46]"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
