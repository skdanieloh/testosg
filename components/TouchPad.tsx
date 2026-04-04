"use client";

type Props = {
  onLeft: () => void;
  onRight: () => void;
};

export function TouchPad({ onLeft, onRight }: Props) {
  return (
    <div className="touch-pad flex w-full max-w-md gap-4">
      <button
        type="button"
        className="min-h-[56px] flex-1 rounded-2xl bg-sky-600 text-2xl font-bold text-white shadow-lg active:scale-[0.98] touch-manipulation"
        aria-label="왼쪽 차선"
        onPointerDown={(e) => {
          e.preventDefault();
          onLeft();
        }}
      >
        ◀
      </button>
      <button
        type="button"
        className="min-h-[56px] flex-1 rounded-2xl bg-sky-600 text-2xl font-bold text-white shadow-lg active:scale-[0.98] touch-manipulation"
        aria-label="오른쪽 차선"
        onPointerDown={(e) => {
          e.preventDefault();
          onRight();
        }}
      >
        ▶
      </button>
    </div>
  );
}
