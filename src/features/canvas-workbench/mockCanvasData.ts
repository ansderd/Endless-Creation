import type { CanvasDocument, CanvasNodeData } from './types';

const baseNodes: CanvasNodeData[] = [
  {
    id: 'node-brief',
    type: 'text',
    title: '创作目标',
    content: '整理画布中的核心创作方向，建立节点与资源的关系。',
    position: { x: 80, y: 80 },
    width: 260,
    height: 150,
  },
  {
    id: 'node-reference',
    type: 'image-placeholder',
    title: '参考画面',
    content: '图片占位节点，后续可承载本地资源或生成结果。',
    position: { x: 460, y: 40 },
    width: 280,
    height: 190,
  },
  {
    id: 'node-note',
    type: 'note',
    title: '编排备注',
    content: '使用连线表达想法、资源和结果之间的依赖。',
    position: { x: 300, y: 330 },
    width: 280,
    height: 150,
  },
  {
    id: 'node-output',
    type: 'text',
    title: '输出结构',
    content: '将关键节点汇总为可继续创作的项目画布。',
    position: { x: 820, y: 260 },
    width: 260,
    height: 150,
  },
];

const documents: Record<string, Pick<CanvasDocument, 'title' | 'description' | 'updatedAt'>> = {
  'canvas-2': { title: '无限画布 2', description: '画布项目 · 23 个节点 · 32 条连线', updatedAt: '06/24 18:06' },
  'canvas-1': { title: '无限画布 1', description: '画布项目 · 19 个节点 · 25 条连线', updatedAt: '06/26 13:02' },
  'relationship-canvas': { title: '角色关系画布', description: '画布项目 · 12 个节点 · 8 条连线', updatedAt: '今天 14:32' },
  'archive-board': { title: '资源编排画布', description: '画布项目 · 16 个节点 · 14 条连线', updatedAt: '上周' },
  'new-canvas': { title: '新建画布', description: '画布项目 · 4 个节点 · 3 条连线', updatedAt: '刚刚' },
};

export function createMockCanvasDocument(canvasId: string): CanvasDocument {
  const meta = documents[canvasId] || documents['canvas-2'];
  return {
    id: canvasId,
    title: meta.title,
    description: meta.description,
    updatedAt: meta.updatedAt,
    viewport: { x: 130, y: 110, k: 1 },
    nodes: baseNodes.map((node) => ({ ...node, position: { ...node.position } })),
    connections: [
      { id: 'connection-brief-reference', fromNodeId: 'node-brief', toNodeId: 'node-reference' },
      { id: 'connection-brief-note', fromNodeId: 'node-brief', toNodeId: 'node-note' },
      { id: 'connection-note-output', fromNodeId: 'node-note', toNodeId: 'node-output' },
    ],
  };
}
