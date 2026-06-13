export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" }[size];
  return (
    <span
      className={`${s} rounded-full border-2 border-white/10 border-t-teal-400 animate-spin inline-block`}
      role="status"
    />
  );
}
