export default function BottomSheet({ open, onClose, children }) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop — only clickable if onClose is provided */}
      <div
        onClick={onClose ?? undefined}
        className={`fixed inset-0 bg-black/60 z-40 ${onClose ? "cursor-pointer" : "cursor-default"}`}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] rounded-t-[32px] border-t border-white/10 px-5 py-5 max-h-[80vh] overflow-y-auto">

        {/* Handle — only show if dismissable */}
        {onClose && (
          <div className="flex justify-center mb-5">
            <div className="w-14 h-1.5 rounded-full bg-zinc-600" />
          </div>
        )}

        {/* Non-dismissable indicator */}
        {!onClose && (
          <div className="flex justify-center mb-5">
            <div className="w-14 h-1.5 rounded-full bg-amber-500/60" />
          </div>
        )}

        {children}
      </div>
    </>
  );
}