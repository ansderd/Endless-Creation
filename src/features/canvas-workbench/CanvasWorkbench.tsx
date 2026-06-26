import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CanvasConnections } from './CanvasConnections';
import { CanvasNode } from './CanvasNode';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasZoomControls } from './CanvasZoomControls';
import { clampScale, createId } from './canvasMath';
import { InfiniteCanvas } from './InfiniteCanvas';
import { createMockCanvasDocument } from './mockCanvasData';
import type { CanvasDocument, CanvasNodeData, CanvasNodeType, ViewportTransform } from './types';
import './CanvasWorkbench.css';

interface CanvasWorkbenchProps {
  canvasId: string;
  onBack: () => void;
}

type SaveState = 'saved' | 'dirty';

export function CanvasWorkbench({ canvasId, onBack }: CanvasWorkbenchProps) {
  const initialDocument = useMemo(() => createMockCanvasDocument(canvasId), [canvasId]);
  const [document, setDocument] = useState<CanvasDocument>(initialDocument);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const documentRef = useRef(document);
  const viewportRef = useRef(document.viewport);
  const dragRef = useRef<{
    active: boolean;
    nodeId: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialPosition: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setDocument(initialDocument);
    setSelectedNodeId(null);
    setSaveState('saved');
  }, [initialDocument]);

  useEffect(() => {
    documentRef.current = document;
    viewportRef.current = document.viewport;
  }, [document]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag?.active) return;
      const viewport = viewportRef.current;
      const dx = (event.clientX - drag.startX) / viewport.k;
      const dy = (event.clientY - drag.startY) / viewport.k;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true;
      updateNodes((nodes) =>
        nodes.map((node) =>
          node.id === drag.nodeId
            ? { ...node, position: { x: drag.initialPosition.x + dx, y: drag.initialPosition.y + dy } }
            : node,
        ),
      );
      setSaveState('dirty');
    }

    function handlePointerUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  function updateDocument(patch: Partial<CanvasDocument>) {
    setDocument((current) => ({ ...current, ...patch }));
  }

  function updateNodes(updater: (nodes: CanvasNodeData[]) => CanvasNodeData[]) {
    setDocument((current) => ({ ...current, nodes: updater(current.nodes) }));
  }

  function updateViewport(viewport: ViewportTransform) {
    setDocument((current) => ({ ...current, viewport: { ...viewport, k: clampScale(viewport.k) } }));
  }

  function handleNodePointerDown(event: ReactPointerEvent<HTMLElement>, nodeId: string) {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-canvas-control]')) return;
    event.stopPropagation();
    const node = documentRef.current.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    dragRef.current = {
      active: true,
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition: { ...node.position },
      moved: false,
    };
  }

  function addNode(type: CanvasNodeType) {
    const offset = document.nodes.length * 28;
    const node: CanvasNodeData = {
      id: createId(type),
      type,
      title: nodeTitle(type),
      content: nodeContent(type),
      position: { x: 180 + offset, y: 180 + offset },
      width: type === 'image-placeholder' ? 280 : 260,
      height: type === 'image-placeholder' ? 190 : 150,
    };
    updateNodes((nodes) => [...nodes, node]);
    setSelectedNodeId(node.id);
    setSaveState('dirty');
  }

  function deleteNode(nodeId: string) {
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      connections: current.connections.filter((connection) => connection.fromNodeId !== nodeId && connection.toNodeId !== nodeId),
    }));
    setSelectedNodeId((current) => (current === nodeId ? null : current));
    setSaveState('dirty');
  }

  function deleteSelectedNode() {
    if (selectedNodeId) deleteNode(selectedNodeId);
  }

  function resetView() {
    updateViewport({ x: 130, y: 110, k: 1 });
  }

  function saveMock() {
    updateDocument({ updatedAt: '刚刚' });
    setSaveState('saved');
  }

  const selectedNode = selectedNodeId ? document.nodes.find((node) => node.id === selectedNodeId) : null;

  return (
    <main className="canvas-workbench" aria-label="画布工作区">
      <header className="canvas-workbench__topbar">
        <div className="canvas-workbench__title-area">
          <button className="canvas-workbench__back" onClick={onBack} type="button">返回项目管理</button>
          <div>
            <h1>{document.title}</h1>
            <p>{document.description || '画布项目'}</p>
          </div>
        </div>
        <div className="canvas-workbench__meta">
          <span className={saveState === 'saved' ? 'canvas-workbench__save-state' : 'canvas-workbench__save-state canvas-workbench__save-state--dirty'}>
            {saveState === 'saved' ? '已保存' : '有未保存更改'}
          </span>
          <button className="canvas-workbench__save" onClick={saveMock} type="button">保存</button>
        </div>
      </header>

      <section className="canvas-workbench__stage">
        <InfiniteCanvas viewport={document.viewport} onViewportChange={updateViewport} onCanvasClick={() => setSelectedNodeId(null)}>
          <CanvasConnections connections={document.connections} nodes={document.nodes} selectedNodeId={selectedNodeId} />
          {document.nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onPointerDown={handleNodePointerDown}
              onDelete={deleteNode}
            />
          ))}
        </InfiniteCanvas>
        <CanvasToolbar hasSelection={Boolean(selectedNode)} onAddNode={addNode} onDeleteSelected={deleteSelectedNode} onResetView={resetView} />
        <CanvasZoomControls scale={document.viewport.k} onScaleChange={(k) => updateViewport({ ...document.viewport, k })} onReset={resetView} />
        {selectedNode ? <div className="canvas-workbench__selection" data-canvas-control>已选中：{selectedNode.title}</div> : null}
      </section>
    </main>
  );
}

function nodeTitle(type: CanvasNodeType) {
  if (type === 'image-placeholder') return '图片占位';
  if (type === 'note') return '新备注';
  return '新文本节点';
}

function nodeContent(type: CanvasNodeType) {
  if (type === 'image-placeholder') return '用于占位本地图片或后续生成的视觉结果。';
  if (type === 'note') return '记录画布编排中的补充想法。';
  return '写下一段可继续拆分的创作内容。';
}
