'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';
import { DataTable } from '@/shared/components/ui/data-table';
import { 
  Settings, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Copy,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Key,
  Database,
  Server,
  Globe,
  Mail,
  Shield,
  Clock,
  Users,
  FileText,
  Code,
  Zap,
  MoreHorizontal,
  ChevronRight,
  Lock,
  Unlock,
  RefreshCw,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface ConfigItem {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'password' | 'enum';
  category: 'security' | 'database' | 'email' | 'api' | 'system' | 'ui' | 'performance' | 'features';
  description: string;
  required: boolean;
  sensitive: boolean;
  envVar?: string;
  validationRule?: string;
  options?: string[];
  lastModified: string;
  modifiedBy: string;
  defaultValue?: any;
  restartRequired?: boolean;
}

interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configs: Partial<ConfigItem>[];
  version: string;
  author: string;
  createdAt: string;
}

interface ConfigHistory {
  id: string;
  configId: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  userId: string;
  userName: string;
  reason?: string;
  rollback: boolean;
}

export default function ConfigurationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showSensitive, setShowSensitive] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [activeTab, setActiveTab] = useState('configs');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());

  // Mock configuration data
  const mockConfigs: ConfigItem[] = [
    {
      id: '1',
      key: 'JWT_SECRET',
      value: '••••••••••••••••',
      type: 'password',
      category: 'security',
      description: 'Secret key for JWT token signing',
      required: true,
      sensitive: true,
      envVar: 'JWT_SECRET',
      validationRule: 'min:32',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: '',
      restartRequired: true
    },
    {
      id: '2',
      key: 'SESSION_TIMEOUT',
      value: 3600,
      type: 'number',
      category: 'security',
      description: 'Session timeout in seconds',
      required: true,
      sensitive: false,
      envVar: 'SESSION_TIMEOUT',
      validationRule: 'min:300,max:86400',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: 3600,
      restartRequired: false
    },
    {
      id: '3',
      key: 'DATABASE_URL',
      value: 'postgresql://user:••••@localhost:5432/db',
      type: 'password',
      category: 'database',
      description: 'Primary database connection string',
      required: true,
      sensitive: true,
      envVar: 'DATABASE_URL',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: '',
      restartRequired: true
    },
    {
      id: '4',
      key: 'SMTP_HOST',
      value: 'smtp.gmail.com',
      type: 'string',
      category: 'email',
      description: 'SMTP server hostname',
      required: true,
      sensitive: false,
      envVar: 'SMTP_HOST',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: '',
      restartRequired: false
    },
    {
      id: '5',
      key: 'ENABLE_ANALYTICS',
      value: true,
      type: 'boolean',
      category: 'features',
      description: 'Enable user analytics tracking',
      required: false,
      sensitive: false,
      envVar: 'ENABLE_ANALYTICS',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: true,
      restartRequired: false
    },
    {
      id: '6',
      key: 'LOG_LEVEL',
      value: 'info',
      type: 'enum',
      category: 'system',
      description: 'Application logging level',
      required: true,
      sensitive: false,
      envVar: 'LOG_LEVEL',
      options: ['debug', 'info', 'warn', 'error'],
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: 'info',
      restartRequired: false
    },
    {
      id: '7',
      key: 'API_RATE_LIMIT',
      value: '{"requests": 1000, "window": "15m"}',
      type: 'json',
      category: 'api',
      description: 'API rate limiting configuration',
      required: true,
      sensitive: false,
      envVar: 'API_RATE_LIMIT',
      validationRule: 'valid_json',
      lastModified: new Date().toISOString(),
      modifiedBy: 'admin@example.com',
      defaultValue: '{"requests": 1000, "window": "15m"}',
      restartRequired: false
    }
  ];

  const mockTemplates: ConfigTemplate[] = [
    {
      id: '1',
      name: 'Production Security',
      description: 'Recommended security settings for production environment',
      category: 'security',
      configs: [
        { key: 'JWT_SECRET', value: '••••••••••••••••' },
        { key: 'SESSION_TIMEOUT', value: 1800 },
        { key: 'ENABLE_2FA', value: true },
        { key: 'PASSWORD_MIN_LENGTH', value: 12 }
      ],
      version: '1.0.0',
      author: 'Security Team',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Development Setup',
      description: 'Configuration for development environment',
      category: 'system',
      configs: [
        { key: 'LOG_LEVEL', value: 'debug' },
        { key: 'ENABLE_ANALYTICS', value: false },
        { key: 'CACHE_ENABLED', value: false }
      ],
      version: '1.0.0',
      author: 'Dev Team',
      createdAt: new Date().toISOString()
    }
  ];

  const mockHistory: ConfigHistory[] = [
    {
      id: '1',
      configId: '2',
      oldValue: 1800,
      newValue: 3600,
      timestamp: new Date().toISOString(),
      userId: 'admin_456',
      userName: 'admin@example.com',
      reason: 'Increased timeout for better user experience',
      rollback: false
    },
    {
      id: '2',
      configId: '5',
      oldValue: false,
      newValue: true,
      timestamp: new Date().toISOString(),
      userId: 'admin_456',
      userName: 'admin@example.com',
      reason: 'Enabled analytics for insights',
      rollback: false
    }
  ];

  // Filter configurations
  const filteredConfigs = useMemo(() => {
    return mockConfigs.filter(config => {
      const matchesSearch = !searchTerm || 
        config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || config.category === categoryFilter;
      const matchesType = typeFilter === 'all' || config.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [mockConfigs, searchTerm, categoryFilter, typeFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'api': return <Globe className="h-4 w-4" />;
      case 'system': return <Server className="h-4 w-4" />;
      case 'ui': return <Eye className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'features': return <Activity className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-blue-600 bg-blue-100';
      case 'number': return 'text-green-600 bg-green-100';
      case 'boolean': return 'text-purple-600 bg-purple-100';
      case 'json': return 'text-orange-600 bg-orange-100';
      case 'password': return 'text-red-600 bg-red-100';
      case 'enum': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const maskSensitiveValue = (config: ConfigItem) => {
    if (config.sensitive && !showSensitive) {
      return '••••••••••••••••';
    }
    if (config.type === 'boolean') {
      return config.value ? 'true' : 'false';
    }
    if (config.type === 'json') {
      return typeof config.value === 'string' ? config.value : JSON.stringify(config.value, null, 2);
    }
    return config.value;
  };

  const handleConfigSave = useCallback((configId: string, newValue: any) => {
    console.log('Saving config:', configId, newValue);
    setPendingChanges(prev => {
      const updated = new Map(prev);
      updated.set(configId, newValue);
      return updated;
    });
  }, []);

  const handleBatchSave = useCallback(() => {
    console.log('Saving batch changes:', Array.from(pendingChanges.entries()));
    // Implement batch save logic
    setPendingChanges(new Map());
  }, [pendingChanges]);

  const exportConfigs = useCallback(() => {
    const exportData = {
      configs: filteredConfigs.map(config => ({
        key: config.key,
        value: config.sensitive ? '[SENSITIVE]' : config.value,
        type: config.type,
        category: config.category,
        description: config.description,
        required: config.required
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: 'current_user'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredConfigs]);

  const columns = [
    {
      accessorKey: 'key',
      header: 'Configuration Key',
      cell: ({ row }: any) => {
        const config = row.original;
        return (
          <div className="flex items-center space-x-3">
            {getCategoryIcon(config.category)}
            <div>
              <div className="font-medium">{config.key}</div>
              <div className="text-sm text-gray-500">{config.envVar}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: ({ row }: any) => {
        const config = row.original;
        const displayValue = maskSensitiveValue(config);
        return (
          <div className="max-w-xs">
            <div className="font-mono text-sm truncate">
              {config.sensitive && !showSensitive ? (
                <span className="flex items-center space-x-2">
                  <Lock className="h-3 w-3" />
                  <span>{displayValue}</span>
                </span>
              ) : (
                displayValue
              )}
            </div>
            {pendingChanges.has(config.id) && (
              <div className="text-xs text-orange-600 mt-1">
                Pending changes
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => {
        const type = row.original.type;
        return (
          <Badge className={getTypeColor(type)}>
            {type.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => {
        const category = row.original.category;
        return (
          <Badge variant="outline" className="capitalize">
            {category}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'required',
      header: 'Required',
      cell: ({ row }: any) => {
        const required = row.original.required;
        return required ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-400" />
        );
      },
    },
    {
      accessorKey: 'lastModified',
      header: 'Last Modified',
      cell: ({ row }: any) => {
        const lastModified = row.original.lastModified;
        return (
          <div className="text-sm">
            <div>{format(new Date(lastModified), 'MMM dd, HH:mm')}</div>
            <div className="text-xs text-gray-500">{row.original.modifiedBy}</div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const config = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedConfig(config)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setEditingConfig(config)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration Management</h1>
          <p className="text-gray-600">Manage system configuration and settings</p>
        </div>
        <div className="flex items-center space-x-2">
          {pendingChanges.size > 0 && (
            <Button onClick={handleBatchSave} className="bg-orange-600 hover:bg-orange-700">
              <Save className="h-4 w-4 mr-2" />
              Save Changes ({pendingChanges.size})
            </Button>
          )}
          <Button variant="outline" onClick={exportConfigs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Config
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Configuration</DialogTitle>
                <DialogDescription>
                  Create a new configuration setting
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Configuration Key</Label>
                  <Input placeholder="CONFIG_KEY" />
                </div>
                <div>
                  <Label>Value</Label>
                  <Input placeholder="Configuration value" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="enum">Enum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="ui">UI</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="features">Features</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe this configuration setting" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="required" />
                  <Label htmlFor="required">Required</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="sensitive" />
                  <Label htmlFor="sensitive">Sensitive</Label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configs" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Configs</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockConfigs.length}</div>
                <p className="text-xs text-muted-foreground">
                  {mockConfigs.filter(c => c.required).length} required
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sensitive</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockConfigs.filter(c => c.sensitive).length}</div>
                <p className="text-xs text-muted-foreground">
                  Protected values
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingChanges.size}</div>
                <p className="text-xs text-muted-foreground">
                  Unsaved changes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Restart Required</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockConfigs.filter(c => c.restartRequired).length}</div>
                <p className="text-xs text-muted-foreground">
                  For changes to apply
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Configurations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search configurations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="ui">UI</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="features">Features</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="password">Password</SelectItem>
                    <SelectItem value="enum">Enum</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-sensitive" 
                    checked={showSensitive}
                    onCheckedChange={setShowSensitive}
                  />
                  <Label htmlFor="show-sensitive" className="text-sm">
                    Show sensitive values
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Table */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Settings ({filteredConfigs.length})</CardTitle>
              <CardDescription>System configuration parameters and values</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredConfigs}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Templates</CardTitle>
              <CardDescription>Pre-defined configuration sets for different environments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          <div>Version: {template.version}</div>
                          <div>Author: {template.author}</div>
                          <div>Created: {format(new Date(template.createdAt), 'MMM dd, yyyy')}</div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Configurations ({template.configs.length})</Label>
                          <div className="mt-2 space-y-1">
                            {template.configs.slice(0, 3).map((config, index) => (
                              <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                                {config.key}: {String(config.value)}
                              </div>
                            ))}
                            {template.configs.length > 3 && (
                              <div className="text-sm text-gray-500">
                                +{template.configs.length - 3} more configurations
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button size="sm">
                            Apply Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration History</CardTitle>
              <CardDescription>Track all configuration changes and rollback options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <History className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {mockConfigs.find(c => c.id === entry.configId)?.key || 'Unknown Config'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Changed by {entry.userName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {entry.reason && (
                          <div className="text-xs text-gray-600 mt-1">
                            Reason: {entry.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-right">
                        <div className="text-red-600">Old: {String(entry.oldValue)}</div>
                        <div className="text-green-600">New: {String(entry.newValue)}</div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rollback
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rollback Configuration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to rollback this configuration change? This will restore the previous value.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Rollback</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Validation</CardTitle>
              <CardDescription>Validate configuration settings and check for issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Run Validation
                </Button>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">All required configurations are set</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">No validation errors found</span>
                  </div>
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">2 configurations require restart to take effect</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Detail Dialog */}
      {selectedConfig && (
        <Dialog open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configuration Details - {selectedConfig.key}</DialogTitle>
              <DialogDescription>
                Detailed information about this configuration setting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Key</Label>
                  <div className="font-mono text-sm">{selectedConfig.key}</div>
                </div>
                <div>
                  <Label>Environment Variable</Label>
                  <div className="font-mono text-sm">{selectedConfig.envVar || 'N/A'}</div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge className={getTypeColor(selectedConfig.type)}>
                    {selectedConfig.type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(selectedConfig.category)}
                    <span className="capitalize">{selectedConfig.category}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Current Value</Label>
                <div className="font-mono text-sm p-3 bg-gray-50 rounded">
                  {maskSensitiveValue(selectedConfig)}
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <div className="text-sm text-gray-600">{selectedConfig.description}</div>
              </div>
              
              {selectedConfig.validationRule && (
                <div>
                  <Label>Validation Rule</Label>
                  <div className="font-mono text-sm">{selectedConfig.validationRule}</div>
                </div>
              )}
              
              {selectedConfig.options && (
                <div>
                  <Label>Valid Options</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedConfig.options.map((option, index) => (
                      <Badge key={index} variant="outline">{option}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  {selectedConfig.required ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedConfig.sensitive ? (
                    <Lock className="h-4 w-4 text-red-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Sensitive</span>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedConfig.restartRequired ? (
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Restart Required</span>
                </div>
              </div>
              
              <div>
                <Label>Last Modified</Label>
                <div className="text-sm">
                  {format(new Date(selectedConfig.lastModified), 'MMM dd, yyyy HH:mm')} by {selectedConfig.modifiedBy}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}