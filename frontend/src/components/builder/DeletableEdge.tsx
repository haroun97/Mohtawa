import type { FC } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSimpleBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export const DeletableEdge: FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd } = props;
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getSimpleBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={() => deleteElements({ edges: [{ id }] })}
          className="nodrag nopan rounded-full bg-background border border-border shadow-sm h-5 w-5 flex items-center justify-center text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          aria-label="Delete connection"
        >
          <X className="h-3 w-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
};

