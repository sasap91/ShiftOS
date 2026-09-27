import { useRef, type KeyboardEvent, type PointerEvent } from "react";

type ResizeHandleProps = {
  orientation: "vertical" | "horizontal";
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: "px" | "%";
  direction?: 1 | -1;
  onChange: (value: number) => void;
  onReset: () => void;
};

type DragState = {
  pointerId: number;
  pointerStart: number;
  valueStart: number;
  span: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** A quiet, accessible split-pane control for the primary workspace geometry. */
export function ResizeHandle({
  orientation,
  label,
  value,
  min,
  max,
  step,
  unit,
  direction = 1,
  onChange,
  onReset,
}: ResizeHandleProps) {
  const drag = useRef<DragState | null>(null);

  function pointerCoordinate(event: PointerEvent<HTMLDivElement>) {
    return orientation === "vertical" ? event.clientX : event.clientY;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const span = orientation === "horizontal"
      ? (event.currentTarget.parentElement?.getBoundingClientRect().height ?? 1)
      : 1;
    drag.current = {
      pointerId: event.pointerId,
      pointerStart: pointerCoordinate(event),
      valueStart: value,
      span: Math.max(1, span),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const pixels = pointerCoordinate(event) - active.pointerStart;
    const delta = orientation === "horizontal" ? (pixels / active.span) * 100 : pixels;
    onChange(clamp(active.valueStart + delta * direction, min, max));
  }

  function endPointerDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (event.key === "Home") next = min;
    if (event.key === "End") next = max;
    if (orientation === "vertical" && event.key === "ArrowLeft") next = value - step * direction;
    if (orientation === "vertical" && event.key === "ArrowRight") next = value + step * direction;
    if (orientation === "horizontal" && event.key === "ArrowUp") next = value - step;
    if (orientation === "horizontal" && event.key === "ArrowDown") next = value + step;
    if (next === null) return;
    event.preventDefault();
    onChange(clamp(next, min, max));
  }

  return (
    <div
      className={`layout-resizer ${orientation}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)}${unit}`}
      title={`${label}. Drag or use arrow keys. Double-click to reset.`}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerDrag}
      onPointerCancel={endPointerDrag}
    />
  );
}
