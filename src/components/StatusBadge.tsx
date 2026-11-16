const STYLES: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  PUBLISHED: "bg-sky-100 text-sky-700",
  ACTIVE: "bg-lime-200 text-lime-800",
  CLOSED: "bg-pink-100 text-pink-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const EMOJI: Record<string, string> = {
  DRAFT: "✏️",
  PUBLISHED: "📣",
  ACTIVE: "✨",
  CLOSED: "🔒",
  ARCHIVED: "📦",
};

const LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ACTIVE: "Đang mở",
  CLOSED: "Đã đóng",
  ARCHIVED: "Lưu trữ",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      <span aria-hidden="true">{EMOJI[status] || "•"}</span>
      {LABELS[status] || status}
    </span>
  );
}
