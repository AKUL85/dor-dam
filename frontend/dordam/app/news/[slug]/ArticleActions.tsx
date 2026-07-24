"use client";

import { useState } from "react";

interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
}

interface Props {
  slug: string;
  initialLikes: number;
  initialComments: number;
  shares: number;
}

/**
 * Functional (client-side) engagement bar for an article.
 * Likes toggle, comments append to a local list, and share copies
 * the page URL. State is in-session only — there is no backend yet,
 * so nothing persists across reloads (by design, for now).
 */
export default function ArticleActions({
  slug,
  initialLikes,
  initialComments,
  shares,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const commentCount = initialComments + comments.length;

  const toggleLike = () => {
    setLiked((prev) => !prev);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
  };

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [
      { id: Date.now(), author: "You", text, time: "just now" },
      ...prev,
    ]);
    setDraft("");
  };

  const share = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/news/${slug}`
        : "";
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user dismissed share sheet — ignore */
    }
  };

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            liked
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {likes}
        </button>

        <span className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {commentCount}
        </span>

        <button
          onClick={share}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          {copied ? "Link copied!" : `Share (${shares})`}
        </button>
      </div>

      {/* Comment composer */}
      <form onSubmit={addComment} className="mt-5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Post comment
          </button>
        </div>
      </form>

      {/* Comment list */}
      {comments.length > 0 && (
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                {c.author.charAt(0)}
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-2)] px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text)]">{c.author}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{c.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
