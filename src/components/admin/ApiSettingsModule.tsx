import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiConfigurations, ApiConfiguration, ApiType, ApiStatus } from '@/hooks/useApiConfigurations';
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';

const API_TYPE_LABELS: Record<ApiType, string> = {
  dexscreener: 'DexScreener API',
  geckoterminal: 'GeckoTerminal API',
  birdeye: 'Birdeye API',
  dextools: 'Dextools API',
  honeypot_rugcheck: 'Honeypot/Rug-check API',
  liquidity_lock: 'Liquidity Lock Verification API',
  trade_execution: 'Trade Execution API',
  rpc_provider: 'RPC Provider',
};

const STATUS_COLORS: Record<ApiStatus, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-muted text-muted-foreground border-muted',
  error: 'bg-destructive/20 text-destructive border-destructive/30',
  rate_limited: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

interface ApiFormData {
  api_type: ApiType;
  api_name: string;
  base_url: string;
  api_key_encrypted: string;
  is_enabled: boolean;
  rate_limit_per_minute: number;
  status: ApiStatus;
}

const defaultFormData: ApiFormData = {
  api_type: 'dexscreener',
  api_name: '',
  base_url: '',
  api_key_encrypted: '',
  is_enabled: true,
  rate_limit_per_minute: 60,
  status: 'inactive',
};

export function ApiSettingsModule() {
  const { configurations, loading, addConfiguration, updateConfiguration, deleteConfiguration, toggleEnabled, fetchConfigurations } = useApiConfigurations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfiguration | null>(null);
  const [formData, setFormData] = useState<ApiFormData>(defaultFormData);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenDialog = (config?: ApiConfiguration) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        api_type: config.api_type,
        api_name: config.api_name,
        base_url: config.base_url,
        api_key_encrypted: config.api_key_encrypted || '',
        is_enabled: config.is_enabled,
        rate_limit_per_minute: config.rate_limit_per_minute,
        status: config.status,
      });
    } else {
      setEditingConfig(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingConfig) {
        await updateConfiguration(editingConfig.id, formData);
      } else {
        await addConfiguration(formData);
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingConfig(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this API configuration?')) {
      await deleteConfiguration(id);
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return '—';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Settings</h2>
          <p className="text-muted-foreground">Manage external API configurations for the application</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchConfigurations()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add API
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingConfig ? 'Edit API Configuration' : 'Add New API Configuration'}</DialogTitle>
                <DialogDescription>
                  Configure the API settings. API keys are stored securely.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="api_type">API Type</Label>
                  <Select
                    value={formData.api_type}
                    onValueChange={(value: ApiType) => setFormData(prev => ({ ...prev, api_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select API type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(API_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="api_name">API Name</Label>
                  <Input
                    id="api_name"
                    value={formData.api_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_name: e.target.value }))}
                    placeholder="e.g., DexScreener Main API"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key_encrypted}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key_encrypted: e.target.value }))}
                    placeholder="Enter API key (optional)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rate_limit">Rate Limit (per minute)</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={formData.rate_limit_per_minute}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_minute: parseInt(e.target.value) || 60 }))}
                    min={1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_enabled"
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                  />
                  <Label htmlFor="is_enabled">Enabled</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving || !formData.api_name || !formData.base_url}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingConfig ? 'Update' : 'Add'} API
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured APIs</CardTitle>
          <CardDescription>All external APIs used by the application</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.api_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {API_TYPE_LABELS[config.api_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {config.base_url}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {showApiKeys[config.id] ? config.api_key_encrypted : maskApiKey(config.api_key_encrypted)}
                      </span>
                      {config.api_key_encrypted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleShowApiKey(config.id)}
                        >
                          {showApiKeys[config.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{config.rate_limit_per_minute}/min</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[config.status]}>
                      {config.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={config.is_enabled}
                      onCheckedChange={(checked) => toggleEnabled(config.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(config)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configurations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No API configurations found. Add your first API to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
