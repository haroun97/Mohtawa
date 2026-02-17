import { useState } from 'react';
import { nodeDefinitions, categoryLabels, categoryOrder } from '@/store/nodeDefinitions';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeCategory } from '@/types/workflow';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import * as Icons from 'lucide-react';

const categoryColorMap: Record<NodeCategory, string> = {
  trigger: 'bg-trigger/10 text-trigger border-trigger/20',
  ai: 'bg-ai/10 text-ai border-ai/20',
  voice: 'bg-voice/10 text-voice border-voice/20',
  video: 'bg-video/10 text-video border-video/20',
  social: 'bg-social/10 text-social border-social/20',
  logic: 'bg-logic/10 text-logic border-logic/20',
  utility: 'bg-utility/10 text-utility border-utility/20',
};

const categoryDotColor: Record<NodeCategory, string> = {
  trigger: 'bg-trigger',
  ai: 'bg-ai',
  voice: 'bg-voice',
  video: 'bg-video',
  social: 'bg-social',
  logic: 'bg-logic',
  utility: 'bg-utility',
};

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

export function NodeLibrary() {
  const [search, setSearch] = useState('');
  const { addNode, getActiveWorkflow } = useWorkflowStore();

  const filtered = nodeDefinitions.filter(nd =>
    !search || nd.title.toLowerCase().includes(search.toLowerCase()) || nd.category.includes(search.toLowerCase())
  );

  const grouped = categoryOrder.reduce((acc, cat) => {
    const nodes = filtered.filter(n => n.category === cat);
    if (nodes.length > 0) acc[cat] = nodes;
    return acc;
  }, {} as Record<string, typeof filtered>);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-r bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 flex flex-col"
    >
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([cat, nodes]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-1.5 w-1.5 rounded-full ${categoryDotColor[cat as NodeCategory]}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {categoryLabels[cat]}
              </span>
            </div>
            <div className="space-y-1">
              {nodes.map(nd => (
                <div
                  key={nd.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, nd.type)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${categoryColorMap[nd.category]}`}
                >
                  <div className="shrink-0">{getIcon(nd.icon)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{nd.title}</p>
                    <p className="text-[10px] opacity-70 truncate">{nd.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
