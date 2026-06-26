import type { CanvasNodeType } from './types';

interface CanvasToolbarProps {
  hasSelection: boolean;
  onAddNode: (type: CanvasNodeType) => void;
  onDeleteSelected: () => void;
  onResetView: () => void;
}

export function CanvasToolbar({ hasSelection, onAddNode, onDeleteSelected, onResetView }: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar" data-canvas-control role="toolbar" aria-label="画布工具栏">
      <button type="button" className="canvas-toolbar__button canvas-toolbar__button--active">选择</button>
      <span className="canvas-toolbar__divider" />
      <button type="button" className="canvas-toolbar__button" onClick={() => onAddNode('text')}>新增文本节点</button>
      <button type="button" className="canvas-toolbar__button" onClick={() => onAddNode('image-placeholder')}>新增图片占位</button>
      <button type="button" className="canvas-toolbar__button" onClick={() => onAddNode('note')}>新增备注</button>
      <span className="canvas-toolbar__divider" />
      <button type="button" className="canvas-toolbar__button" disabled={!hasSelection} onClick={onDeleteSelected}>删除选中</button>
      <button type="button" className="canvas-toolbar__button" onClick={onResetView}>重置视图</button>
    </div>
  );
}
