export interface Position {
  x: number;
  y: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  k: number;
}

export type CanvasNodeType = 'text' | 'image-placeholder' | 'note';

export interface CanvasNodeData {
  id: string;
  type: CanvasNodeType;
  title: string;
  content: string;
  position: Position;
  width: number;
  height: number;
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface CanvasDocument {
  id: string;
  title: string;
  description?: string;
  nodes: CanvasNodeData[];
  connections: CanvasConnection[];
  viewport: ViewportTransform;
  updatedAt: string;
}
