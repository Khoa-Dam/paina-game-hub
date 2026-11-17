"use client";

export default function MusicToggle({
  enabled,
  supported,
  onToggle,
}: {
  enabled: boolean;
  supported: boolean | null;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-secondary min-h-10 px-3 py-1.5 text-sm"
      onClick={onToggle}
      disabled={supported !== true}
      aria-pressed={enabled}
      aria-label={
        supported === null
          ? "Đang kiểm tra hỗ trợ âm thanh"
          : supported
            ? enabled
              ? "Tắt nhạc nền"
              : "Bật nhạc nền"
            : "Trình duyệt không hỗ trợ âm thanh"
      }
      title={
        supported === false
          ? "Trình duyệt này không hỗ trợ phát âm thanh"
          : undefined
      }
    >
      {supported === null
        ? "Đang kiểm tra âm thanh…"
        : supported
          ? enabled
            ? "🔊 Tắt nhạc"
            : "🎵 Bật nhạc"
          : "🔇 Không hỗ trợ"}
    </button>
  );
}
