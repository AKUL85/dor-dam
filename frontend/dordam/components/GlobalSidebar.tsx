import Link from "next/link";

const brands = [
  "Samsung", "Apple", "Xiaomi", "Realme", "Oppo", "OnePlus",
  "Vivo", "Huawei", "Google", "Nothing", "Motorola", "Nokia",
  "Infinix", "Tecno", "Honor", "Sony", "Asus", "Redmi",
];

const latestDevices = [
  { name: "Nothing Phone (4b)", slug: "nothing-phone-4b" },
  { name: "Samsung Galaxy M47", slug: "samsung-galaxy-m47" },
  { name: "Xiaomi Redmi K90 Ultra", slug: "xiaomi-redmi-k90-ultra" },
  { name: "OnePlus N6", slug: "oneplus-n6" },
  { name: "Oppo Reno16 F", slug: "oppo-reno16-f" },
  { name: "Motorola Moto G77", slug: "motorola-moto-g77" },
  { name: "Samsung Galaxy A27", slug: "samsung-galaxy-a27" },
  { name: "Xiaomi 17T Pro", slug: "xiaomi-17t-pro" },
];

const inStoresNow = [
  { name: "Samsung Galaxy M47", slug: "samsung-galaxy-m47" },
  { name: "OnePlus N6", slug: "oneplus-n6" },
  { name: "Samsung Galaxy A27", slug: "samsung-galaxy-a27" },
  { name: "Tecno Pova 8", slug: "tecno-pova-8" },
  { name: "Oppo Reno16 F", slug: "oppo-reno16-f" },
  { name: "Xiaomi 17T Pro", slug: "xiaomi-17t-pro" },
];

const dailyInterest = [
  { name: "Nothing Phone (4b)", slug: "nothing-phone-4b" },
  { name: "Samsung Galaxy M47", slug: "samsung-galaxy-m47" },
  { name: "Samsung Galaxy A57", slug: "samsung-galaxy-a57" },
  { name: "iPhone 18 Pro Max", slug: "iphone-18-pro-max" },
  { name: "Samsung Galaxy S26 Ultra", slug: "samsung-galaxy-s26-ultra" },
  { name: "Samsung Galaxy A27", slug: "samsung-galaxy-a27" },
  { name: "Xiaomi Redmi K90 Ultra", slug: "xiaomi-redmi-k90-ultra" },
  { name: "OnePlus N6", slug: "oneplus-n6" },
  { name: "iPhone 17 Pro Max", slug: "iphone-17-pro-max" },
  { name: "Samsung Galaxy A17", slug: "samsung-galaxy-a17" },
];

const fanFavorites = [
  { name: "Xiaomi 15 Ultra", slug: "xiaomi-15-ultra" },
  { name: "Xiaomi 17 Pro Max", slug: "xiaomi-17-pro-max" },
  { name: "Samsung Galaxy S26 Ultra", slug: "samsung-galaxy-s26-ultra" },
  { name: "OnePlus 15", slug: "oneplus-15" },
  { name: "Samsung Galaxy S25", slug: "samsung-galaxy-s25" },
  { name: "Xiaomi 17 Ultra", slug: "xiaomi-17-ultra" },
  { name: "Oppo Find X9 Pro", slug: "oppo-find-x9-pro" },
  { name: "iPhone 17 Pro Max", slug: "iphone-17-pro-max" },
  { name: "Xiaomi Poco F7", slug: "xiaomi-poco-f7" },
  { name: "Redmi Turbo 4 Pro", slug: "redmi-turbo-4-pro" },
];

const popularComparisons = [
  { phone1: "Galaxy S25 Ultra", phone2: "Galaxy S26 Ultra", slug: "compare?p1=galaxy-s25-ultra&p2=galaxy-s26-ultra" },
  { phone1: "Galaxy A56", phone2: "Galaxy A57", slug: "compare?p1=galaxy-a56&p2=galaxy-a57" },
  { phone1: "iPhone 16", phone2: "iPhone 17", slug: "compare?p1=iphone-16&p2=iphone-17" },
  { phone1: "iPhone 17 Pro", phone2: "iPhone 17", slug: "compare?p1=iphone-17-pro&p2=iphone-17" },
  { phone1: "Galaxy S25", phone2: "Galaxy S26", slug: "compare?p1=galaxy-s25&p2=galaxy-s26" },
  { phone1: "Xiaomi 17T Pro", phone2: "Xiaomi 17T", slug: "compare?p1=xiaomi-17t-pro&p2=xiaomi-17t" },
];

function SidebarSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {icon}
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-primary)]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function GlobalSidebar() {
  return (
    <aside className="hidden w-[200px] shrink-0 space-y-3 lg:block">
      {/* Phone Finder */}
      <SidebarSection
        title="Phone Finder"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2.5">
          {brands.map((b) => (
            <Link
              key={b}
              href={`/phones?brand=${b.toLowerCase()}`}
              className="text-[10px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            >
              {b}
            </Link>
          ))}
        </div>
        <div className="flex border-t border-[var(--border)]">
          <Link
            href="/brands"
            className="flex w-1/2 items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
          >
            All Brands
          </Link>
          <Link
            href="/finder"
            className="flex w-1/2 items-center justify-center gap-1 border-l border-[var(--border)] py-2 text-[9px] font-bold uppercase text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
          >
            Phone Finder
          </Link>
        </div>
      </SidebarSection>

      {/* Latest Devices */}
      <SidebarSection
        title="Latest Devices"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
      >
        <ul className="space-y-0.5 p-2.5">
          {latestDevices.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/phones/${d.slug}`}
                className="block rounded px-1.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarSection>

      {/* In Stores Now */}
      <SidebarSection
        title="In Stores Now"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
      >
        <ul className="space-y-0.5 p-2.5">
          {inStoresNow.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/phones/${d.slug}`}
                className="block rounded px-1.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarSection>

      {/* Top 10 by Daily Interest */}
      <SidebarSection
        title="Top 10 by Daily Interest"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        }
      >
        <ol className="space-y-0.5 p-2.5">
          {dailyInterest.map((d, i) => (
            <li key={d.slug}>
              <Link
                href={`/phones/${d.slug}`}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--bg-elevated)] text-[8px] font-bold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                {d.name}
              </Link>
            </li>
          ))}
        </ol>
      </SidebarSection>

      {/* Top 10 by Fans */}
      <SidebarSection
        title="Top 10 by Fans"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        }
      >
        <ol className="space-y-0.5 p-2.5">
          {fanFavorites.map((d, i) => (
            <li key={d.slug}>
              <Link
                href={`/phones/${d.slug}`}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--bg-elevated)] text-[8px] font-bold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                {d.name}
              </Link>
            </li>
          ))}
        </ol>
      </SidebarSection>

      {/* Popular Comparisons */}
      <SidebarSection
        title="Popular Comparisons"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        }
      >
        <ul className="space-y-0.5 p-2.5">
          {popularComparisons.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="block rounded px-1.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
              >
                {c.phone1} <span className="text-[var(--text-muted)]">vs</span> {c.phone2}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarSection>
    </aside>
  );
}
