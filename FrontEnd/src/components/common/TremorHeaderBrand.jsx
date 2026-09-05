/**
 * Universal Header Component
 *
 * @param {string} title - The view title (e.g. "Live Kinematics", "Medication Analytics", "Log Medication Dose")
 * @param {string} subtitle - Optional secondary badge / caption
 * @param {string} className - Additional container styling classes
 */
export default function TremorHeaderBrand({
  title = "Live Kinematics",
  subtitle = null,
  className = "",
}) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[#00e599] animate-pulse" />
        <h2 className="font-display text-base font-bold text-[#ededed] tracking-tight">
          {title}
        </h2>
      </div>

      {subtitle && (
        <span className="hidden sm:inline-block rounded-md border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-2 py-0.5 font-mono-tech text-[9px] uppercase tracking-wider text-[#8a9992]">
          {subtitle}
        </span>
      )}
    </div>
  );
}
