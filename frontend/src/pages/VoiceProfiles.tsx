import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { voiceProfilesApi, type VoiceProfile } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mic,
  Plus,
  Upload,
  Loader2,
  Sun,
  Moon,
  Workflow,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  Clock,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'azure', label: 'Azure TTS' },
];

export default function VoiceProfiles() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggle, isDark } = useTheme();

  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VoiceProfile | null>(null);
  const [detail, setDetail] = useState<VoiceProfile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createProvider, setCreateProvider] = useState('elevenlabs');
  const [createVoiceId, setCreateVoiceId] = useState('');
  const [createLanguage, setCreateLanguage] = useState('en');
  const [createSaving, setCreateSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const list = await voiceProfilesApi.list();
      setProfiles(list);
    } catch (err) {
      toast.error('Failed to load voice profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const p = await voiceProfilesApi.get(id);
      setDetail(p);
      setSelected(p);
    } catch {
      toast.error('Failed to load profile');
    }
  }, []);

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (createProvider === 'azure' && !createVoiceId.trim()) {
      toast.error('Provider Voice ID is required for Azure');
      return;
    }
    setCreateSaving(true);
    try {
      const created = await voiceProfilesApi.create({
        name: createName.trim(),
        provider: createProvider,
        ...(createVoiceId.trim() ? { providerVoiceId: createVoiceId.trim() } : {}),
        language: createLanguage || 'en',
      });
      toast.success('Voice profile created');
      setCreateOpen(false);
      setCreateName('');
      setCreateVoiceId('');
      setCreateLanguage('en');
      await fetchProfiles();
      await fetchDetail(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selected || !uploadFile) {
      toast.error('Select a profile and choose a file');
      return;
    }
    setUploading(true);
    try {
      await voiceProfilesApi.uploadAsset(selected.id, uploadFile);
      toast.success('Sample uploaded');
      setUploadFile(null);
      await fetchDetail(selected.id);
      await fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    if (!selected) return;
    setTraining(true);
    try {
      await voiceProfilesApi.train(selected.id);
      toast.success('Profile marked ready');
      await fetchDetail(selected.id);
      await fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Train failed');
    } finally {
      setTraining(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Mic className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Voice Profiles</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {isDark() ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm hidden sm:inline">{user?.name || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Workflow className="h-4 w-4 mr-2" /> Workflows
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">My voice profiles</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Create profiles and upload samples for the &quot;My Voice → Generate Voiceover&quot; node
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New profile
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-colors ${selected?.id === p.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => fetchDetail(p.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant={p.trainingStatus === 'ready' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.trainingStatus === 'ready' ? (
                        <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Ready</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-0.5" /> {p.trainingStatus || 'Pending'}</>
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {p.provider} · {(p as VoiceProfile & { assetCount?: number }).assetCount ?? p.assets?.length ?? 0} sample(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] text-muted-foreground font-mono truncate" title={p.id}>
                    ID: {p.id}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {detail && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{detail.name}</CardTitle>
              <CardDescription>
                {detail.provider}
                {detail.providerVoiceId
                  ? ` · Voice ID: ${detail.providerVoiceId}`
                  : ' · Clone from samples (upload then Train)'}
                {' · '}{detail.language || 'en'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Profile ID (use in voice.tts node)</Label>
                <p className="text-sm font-mono mt-1 break-all bg-muted/50 px-2 py-1 rounded">{detail.id}</p>
              </div>
              <div>
                <Label className="text-xs">Upload audio sample (MP3 or WAV, max 25 MB)</Label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                    className="max-w-[220px]"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="sm"
                    disabled={!uploadFile || uploading}
                    onClick={handleUpload}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? ' Uploading...' : ' Upload'}
                  </Button>
                </div>
              </div>
              {detail.assets && detail.assets.length > 0 && (
                <div>
                  <Label className="text-xs">Samples ({detail.assets.length})</Label>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    {detail.assets.map((a) => (
                      <li key={a.id}>
                        <a href={a.fileUrl} target="_blank" rel="noreferrer" className="underline truncate block max-w-full">
                          {a.fileUrl.split('/').pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                onClick={handleTrain}
                disabled={!detail.assets?.length || detail.trainingStatus === 'ready' || training}
              >
                {training ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {detail.trainingStatus === 'ready'
                  ? 'Already ready'
                  : detail.provider === 'elevenlabs' && !detail.providerVoiceId
                    ? 'Clone my voice (ElevenLabs)'
                    : 'Mark ready (train)'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New voice profile</DialogTitle>
            <DialogDescription>
              For ElevenLabs: leave Voice ID empty to clone your voice from samples (upload samples then Train). For Azure: enter a voice name (e.g. en-US-JennyNeural).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g. My narrator"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={createProvider} onValueChange={setCreateProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider Voice ID {createProvider === 'elevenlabs' && '(optional — leave empty to clone from samples)'}</Label>
              <Input
                placeholder={createProvider === 'elevenlabs' ? 'Leave empty to clone from samples' : 'e.g. en-US-JennyNeural (required)'}
                value={createVoiceId}
                onChange={(e) => setCreateVoiceId(e.target.value)}
              />
            </div>
            <div>
              <Label>Language (optional)</Label>
              <Input
                placeholder="en"
                value={createLanguage}
                onChange={(e) => setCreateLanguage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createSaving}>
              {createSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
