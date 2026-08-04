// Collapses away entirely below `lg` rather than a hamburger — this page is read top-to-bottom
// fine on mobile without it, and no other page in this app has an off-canvas nav pattern to
// conform to. Sticky rather than fixed so it scrolls out of view naturally once the (short) page
// ends, instead of floating over the footer.
export interface ApiDocsNavItem {
  id: string;
  label: string;
}

export function ApiDocsNav({ items }: { items: ApiDocsNavItem[] }) {
  return (
    <nav
      aria-label="API documentation sections"
      className="sticky top-6 hidden max-h-[calc(100vh-3rem)] shrink-0 flex-col gap-1 overflow-y-auto lg:flex lg:w-48"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-lg px-2.5 py-1.5 text-sm text-[var(--foreground-muted)] transition-colors hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
