const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-2xl",
} as const;

export function Avatar({
  url,
  label,
  size = "sm",
}: {
  url: string | null | undefined;
  label: string;
  size?: keyof typeof sizeClasses;
}) {
  const sizeClass = sizeClasses[size];

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
      <img
        src={url}
        alt={label}
        className={`shrink-0 rounded-full object-cover ${sizeClass}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900 dark:bg-brand-900/40 dark:text-brand-300 ${sizeClass}`}
      aria-hidden
    >
      {label[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
