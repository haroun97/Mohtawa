import { useWorkflowStore } from '@/store/workflowStore';
import { nodeDefinitions, categoryLabels, categoryOrder } from '@/store/nodeDefinitions';
import { WorkflowNode, NodeCategory } from '@/types/workflow';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import * as Icons from 'lucide-react';

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const { addNode } = useWorkflowStore();

  const handleSelect = (type: string) => {
    const definition = nodeDefinitions.find(nd => nd.type === type);
    if (!definition) return;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: definition.type,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        definition,
        config: definition.fields.reduce((acc, f) => {
          if (f.defaultValue !== undefined) acc[f.name] = f.defaultValue;
          return acc;
        }, {} as Record<string, any>),
      },
    };

    addNode(newNode);
    onOpenChange(false);
  };

  const grouped = categoryOrder.reduce((acc, cat) => {
    const nodes = nodeDefinitions.filter(n => n.category === cat);
    if (nodes.length > 0) acc[cat] = nodes;
    return acc;
  }, {} as Record<string, typeof nodeDefinitions>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search nodes to add..." />
      <CommandList>
        <CommandEmpty>No nodes found.</CommandEmpty>
        {Object.entries(grouped).map(([cat, nodes]) => (
          <CommandGroup key={cat} heading={categoryLabels[cat]}>
            {nodes.map(nd => (
              <CommandItem key={nd.type} onSelect={() => handleSelect(nd.type)} className="gap-2">
                {getIcon(nd.icon)}
                <div>
                  <p className="text-sm font-medium">{nd.title}</p>
                  <p className="text-xs text-muted-foreground">{nd.description}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
