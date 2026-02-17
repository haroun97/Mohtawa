import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowNode } from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Play } from 'lucide-react';
import * as Icons from 'lucide-react';

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

interface Props {
  node: WorkflowNode;
}

export function NodeConfigForm({ node }: Props) {
  const { updateNodeConfig } = useWorkflowStore();
  const { definition, config } = node.data;

  const handleChange = (name: string, value: any) => {
    updateNodeConfig(node.id, { [name]: value });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="opacity-70">{getIcon(definition.icon)}</div>
        <div>
          <h3 className="text-sm font-semibold">{definition.title}</h3>
          <p className="text-[10px] text-muted-foreground">{definition.description}</p>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['inputs', 'advanced']} className="space-y-2">
        {/* Main inputs */}
        <AccordionItem value="inputs" className="border rounded-lg px-3">
          <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">Inputs</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            {definition.fields.map(field => (
              <div key={field.name} className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">{field.label}</Label>
                  {field.required && <span className="text-destructive text-[10px]">*</span>}
                  {field.help && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">{field.help}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {field.type === 'text' && (
                  <Input
                    className="h-8 text-xs"
                    placeholder={field.placeholder}
                    value={config[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                  />
                )}
                {field.type === 'textarea' && (
                  <Textarea
                    className="text-xs min-h-[60px]"
                    placeholder={field.placeholder}
                    value={config[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                  />
                )}
                {field.type === 'number' && (
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={config[field.name] ?? field.defaultValue ?? ''}
                    onChange={e => handleChange(field.name, parseFloat(e.target.value) || 0)}
                  />
                )}
                {field.type === 'select' && (
                  <Select value={config[field.name] || ''} onValueChange={v => handleChange(field.name, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === 'toggle' && (
                  <Switch
                    checked={!!config[field.name]}
                    onCheckedChange={v => handleChange(field.name, v)}
                  />
                )}
              </div>
            ))}
            {definition.fields.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No configurable inputs</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Error handling */}
        <AccordionItem value="advanced" className="border rounded-lg px-3">
          <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">Error Handling</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Retry on failure</Label>
              <Switch
                checked={!!config._retryOnFailure}
                onCheckedChange={v => handleChange('_retryOnFailure', v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max retries</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={config._maxRetries ?? 3}
                onChange={e => handleChange('_maxRetries', parseInt(e.target.value) || 0)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
        <Play className="h-3 w-3" /> Test Node
      </Button>
    </div>
  );
}
