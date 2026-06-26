import type { CanvasConnection, CanvasNodeData } from './types';

interface CanvasConnectionsProps {
  connections: CanvasConnection[];
  nodes: CanvasNodeData[];
  selectedNodeId: string | null;
}

export function CanvasConnections({ connections, nodes, selectedNodeId }: CanvasConnectionsProps) {
  return (
    <svg className="canvas-connections" aria-hidden="true">
      {connections.map((connection) => {
        const from = nodes.find((node) => node.id === connection.fromNodeId);
        const to = nodes.find((node) => node.id === connection.toNodeId);
        if (!from || !to) return null;
        const active = selectedNodeId === from.id || selectedNodeId === to.id;
        return <ConnectionPath active={active} from={from} key={connection.id} to={to} />;
      })}
    </svg>
  );
}

function ConnectionPath({ from, to, active }: { from: CanvasNodeData; to: CanvasNodeData; active: boolean }) {
  const startX = from.position.x + from.width;
  const startY = from.position.y + from.height / 2;
  const endX = to.position.x;
  const endY = to.position.y + to.height / 2;
  const dx = Math.abs(endX - startX);
  const curvature = Math.max(dx * 0.5, 64);
  const pathD = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;
  return <path className={active ? 'canvas-connections__path canvas-connections__path--active' : 'canvas-connections__path'} d={pathD} />;
}
