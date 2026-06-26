import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasNodeData } from './types';

interface CanvasNodeProps {
  node: CanvasNodeData;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

export function CanvasNode({ node, selected, onPointerDown, onDelete }: CanvasNodeProps) {
  return (
    <article
      className={`canvas-node canvas-node--${node.type} ${selected ? 'canvas-node--selected' : ''}`}
      data-canvas-node
      style={{ width: node.width, height: node.height, transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
      tabIndex={0}
      onPointerDown={(event) => onPointerDown(event, node.id)}
    >
      <div className="canvas-node__topline">
        <span className="canvas-node__badge">{nodeTypeLabel(node.type)}</span>
        {selected ? (
          <button
            className="canvas-node__delete"
            data-canvas-control
            onClick={(event) => {
              event.stopPropagation();
              onDelete(node.id);
            }}
            type="button"
          >
            删除
          </button>
        ) : null}
      </div>
      <h3>{node.title}</h3>
      <p>{node.content}</p>
      {node.type === 'image-placeholder' ? <div className="canvas-node__image-mark" aria-hidden="true" /> : null}
    </article>
  );
}

function nodeTypeLabel(type: CanvasNodeData['type']) {
  if (type === 'image-placeholder') return '图片占位';
  if (type === 'note') return '备注';
  return '文本';
}
