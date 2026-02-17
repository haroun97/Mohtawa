import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Sun,
  Moon,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiKeyEntry {
  id: string;
  service: string;
  label: string | null;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
}

const SERVICE_OPTIONS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT models, TTS, DALL-E' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
  { value: 'elevenlabs', label: 'ElevenLabs', description: 'Voice synthesis & cloning' },
  { value: 'google-tts', label: 'Google TTS', description: 'Text-to-speech' },
  { value: 'meta', label: 'Meta', description: 'Facebook/Instagram publishing' },
  { value: 'tiktok', label: 'TikTok', description: 'TikTok publishing' },
  { value: 'youtube', label: 'YouTube', description: 'YouTube publishing' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggle, isDark } = useTheme();

  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newService, setNewService] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.get<ApiKeyEntry[]>('/settings/keys');
      setKeys(data);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async () => {
    if (!newService || !newKey) return;
    setSaving(true);
    try {
      await api.post('/settings/keys', {
        service: newService,
        key: newKey,
        label: newLabel || undefined,
      });
      toast.success(`${getServiceLabel(newService)} key saved successfully`);
      setNewService('');
      setNewKey('');
      setNewLabel('');
      setShowForm(false);
      setShowKey(false);
      await fetchKeys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save API key';
      toast.error('Failed to save API key', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/settings/keys/${deleteTarget}`);
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget));
      setDeleteTarget(null);
      toast.success('API key deleted');
    } catch (err) {
      toast.error('Failed to delete API key', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  const getServiceLabel = (service: string) =>
    SERVICE_OPTIONS.find((s) => s.value === service)?.label || service;

  const getServiceDescription = (service: string) =>
    SERVICE_OPTIONS.find((s) => s.value === service)?.description || '';

  const configuredServices = new Set(keys.map((k) => k.service));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Workflow className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {isDark() ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* API Keys section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect external services to power your workflow nodes. Keys are encrypted at rest.
                </CardDescription>
              </div>
              {!showForm && (
                <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Key
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add key form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="service">Service</Label>
                        <Select value={newService} onValueChange={setNewService}>
                          <SelectTrigger id="service">
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <span>{opt.label}</span>
                                  {configuredServices.has(opt.value) && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                      configured
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="label">Label (optional)</Label>
                        <Input
                          id="label"
                          placeholder="e.g. Production key"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apikey">API Key</Label>
                      <div className="relative">
                        <Input
                          id="apikey"
                          type={showKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          className="pr-10 font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      {newService && configuredServices.has(newService) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          A key for {getServiceLabel(newService)} already exists. Saving will replace it.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={handleSave}
                        size="sm"
                        disabled={!newService || newKey.length < 10 || saving}
                        className="gap-2"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {configuredServices.has(newService) ? 'Update Key' : 'Save Key'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowForm(false);
                          setNewService('');
                          setNewKey('');
                          setNewLabel('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing keys list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No API keys configured</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Add your API keys to enable AI generation, text-to-speech, and social publishing in your workflows.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {getServiceLabel(entry.service)}
                          </span>
                          {entry.label && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {entry.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs text-muted-foreground font-mono">
                            {entry.maskedKey}
                          </code>
                          <span className="text-[10px] text-muted-foreground">
                            {getServiceDescription(entry.service)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => setDeleteTarget(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 mt-4">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                API keys are encrypted using AES-256-GCM before being stored in the database. 
                Keys are only decrypted server-side during workflow execution and are never sent to the frontend.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary" className="text-xs">{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the key. Workflow nodes that depend on this service will fail until a new key is added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
