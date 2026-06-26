import { clampScale } from './canvasMath';

interface CanvasZoomControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
}

export function CanvasZoomControls({ scale, onScaleChange, onReset }: CanvasZoomControlsProps) {
  const percent = Math.round(scale * 100);
  return (
    <div className="canvas-zoom" data-canvas-control aria-label="缩放控件">
      <button type="button" onClick={() => onScaleChange(clampScale(scale - 0.1))} aria-label="缩小">-</button>
      <span>{percent}%</span>
      <button type="button" onClick={() => onScaleChange(clampScale(scale + 0.1))} aria-label="放大">+</button>
      <button type="button" onClick={onReset}>重置</button>
    </div>
  );
}
