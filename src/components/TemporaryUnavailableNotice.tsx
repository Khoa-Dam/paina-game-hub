"use client";

export default function TemporaryUnavailableNotice({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <div className="card space-y-3 border-amber-300 bg-amber-50" role="status">
      <p className="text-sm text-amber-900">
        Hệ thống đang bận. Vui lòng thử lại sau ít phút.
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          Thử tải lại
        </button>
      )}
    </div>
  );
}
