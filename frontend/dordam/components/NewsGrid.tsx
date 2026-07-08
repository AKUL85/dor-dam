export default function NewsGrid() {
  const featured = [
    {
      title: "Best Phones Under ৳20,000 in Bangladesh — July 2026",
      subtitle: "Our top picks for budget-conscious buyers",
      image: "https://fdn.gsmarena.com/imgroot/reviews/24/tecno-pova-6-pro/-347x151/gsmarena_001.jpg",
      badge: "BUYER'S GUIDE",
    },
    {
      title: "Samsung Galaxy A27 — Full Review",
      subtitle: "Is it worth the hype?",
      image: "https://fdn.gsmarena.com/imgroot/reviews/24/samsung-galaxy-a55/-347x151/gsmarena_001.jpg",
      badge: "REVIEW",
    },
    {
      title: "Oppo Reno16 Pro Review",
      subtitle: "Camera champion in the mid-range",
      image: "https://fdn.gsmarena.com/imgroot/reviews/24/oppo-reno11-pro/-347x151/gsmarena_001.jpg",
      badge: "REVIEW",
    },
  ];

  const news = [
    {
      title: "Samsung confirms Galaxy Unpacked event for July 22",
      time: "1h ago",
    },
    {
      title: "Google officially reveals Pixel 11 series launch date",
      time: "3h ago",
    },
    {
      title: "iPhone 18 Pro to be thicker than its predecessor",
      time: "5h ago",
    },
    {
      title: "Redmi Note 17 series launch date and design revealed",
      time: "7h ago",
    },
    {
      title: "Nothing Phone (4b) announced with Snapdragon 6 Gen 4",
      time: "9h ago",
    },
    {
      title: "Xiaomi Redmi K90 Ultra goes official with SD 8 Elite",
      time: "12h ago",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Featured Hero Grid */}
      <div className="grid grid-cols-1 gap-[2px] overflow-hidden rounded-lg sm:grid-cols-3">
        {featured.map((item, idx) => (
          <a
            key={idx}
            href="#"
            className={`relative group overflow-hidden bg-[var(--bg-secondary)] ${
              idx === 0 ? "sm:col-span-2 sm:row-span-2 min-h-[200px] sm:min-h-[320px]" : "min-h-[155px]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60 group-hover:opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            <span className="absolute top-3 left-3 rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {item.badge}
            </span>

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className={`font-bold text-white leading-tight drop-shadow-md ${
                idx === 0 ? "text-xl sm:text-2xl" : "text-sm sm:text-base"
              }`}>
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-300">{item.subtitle}</p>
            </div>
          </a>
        ))}
      </div>

      {/* News List */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Latest News
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {news.map((item, idx) => (
            <a
              key={idx}
              href="#"
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
                {item.title}
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
                {item.time}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
