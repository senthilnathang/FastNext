"use client"

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Settings, 
  Check, 
  X, 
  AlertCircle, 
  ExternalLink,
  Zap,
  Database,
  Mail,
  MessageSquare,
  Cloud,
  Globe,
  Key,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Progress } from '@/shared/components/ui/progress'

interface Integration {
  id: string
  name: string
  description: string
  category: 'database' | 'api' | 'messaging' | 'storage' | 'analytics' | 'auth'
  icon: React.ComponentType<{ className?: string }>
  status: 'connected' | 'disconnected' | 'error' | 'configuring'
  config: Record<string, any>
  lastSync?: Date
  features: string[]
  documentation?: string
  webhookUrl?: string
}

interface IntegrationTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  configFields: ConfigField[]
  popular: boolean
  verified: boolean
}

interface ConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: string[]
  description?: string
}

const integrationTemplates: IntegrationTemplate[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and alerts to Slack channels',
    category: 'messaging',
    icon: MessageSquare,
    popular: true,
    verified: true,
    configFields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://hooks.slack.com/...' },
      { name: 'channel', label: 'Default Channel', type: 'text', required: false, placeholder: '#general' },
      { name: 'username', label: 'Bot Username', type: 'text', required: false, placeholder: 'FastNext Bot' }
    ]
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to external PostgreSQL databases',
    category: 'database',
    icon: Database,
    popular: true,
    verified: true,
    configFields: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '5432' },
      { name: 'database', label: 'Database', type: 'text', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'ssl', label: 'Use SSL', type: 'select', required: false, options: ['true', 'false'] }
    ]
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send emails through SendGrid API',
    category: 'messaging',
    icon: Mail,
    popular: true,
    verified: true,
    configFields: [
      { name: 'api_key', label: 'API Key', type: 'password', required: true },
      { name: 'from_email', label: 'From Email', type: 'email', required: true },
      { name: 'from_name', label: 'From Name', type: 'text', required: false }
    ]
  },
  {
    id: 's3',
    name: 'Amazon S3',
    description: 'Store and retrieve files from Amazon S3',
    category: 'storage',
    icon: Cloud,
    popular: true,
    verified: true,
    configFields: [
      { name: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
      { name: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
      { name: 'bucket', label: 'Bucket Name', type: 'text', required: true },
      { name: 'region', label: 'Region', type: 'select', required: true, options: ['us-east-1', 'us-west-2', 'eu-west-1'] }
    ]
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Send HTTP requests to custom endpoints',
    category: 'api',
    icon: Globe,
    popular: false,
    verified: true,
    configFields: [
      { name: 'url', label: 'Webhook URL', type: 'url', required: true },
      { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['POST', 'PUT', 'PATCH'] },
      { name: 'headers', label: 'Custom Headers', type: 'textarea', required: false, placeholder: 'Authorization: Bearer token\nContent-Type: application/json' },
      { name: 'secret', label: 'Secret Key', type: 'password', required: false, description: 'For request signing' }
    ]
  }
]

export function IntegrationHub() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null)
  const [configData, setConfigData] = useState<Record<string, any>>({})
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  const categories = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'database', label: 'Databases', icon: Database },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'storage', label: 'Storage', icon: Cloud },
    { id: 'api', label: 'APIs', icon: Zap },
    { id: 'auth', label: 'Authentication', icon: Key }
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? integrationTemplates 
    : integrationTemplates.filter(t => t.category === selectedCategory)

  const handleConfigureIntegration = (template: IntegrationTemplate) => {
    setIsConfiguring(template.id)
    setConfigData({})
  }

  const handleSaveIntegration = async () => {
    if (!isConfiguring) return

    const template = integrationTemplates.find(t => t.id === isConfiguring)!
    
    // Simulate API call
    setTestingConnection(isConfiguring)
    
    setTimeout(() => {
      const newIntegration: Integration = {
        id: `${isConfiguring}-${Date.now()}`,
        name: template.name,
        description: template.description,
        category: template.category as any,
        icon: template.icon,
        status: 'connected',
        config: configData,
        features: ['webhook', 'polling', 'real-time'],
        lastSync: new Date()
      }

      setIntegrations(prev => [...prev, newIntegration])
      setIsConfiguring(null)
      setConfigData({})
      setTestingConnection(null)
    }, 2000)
  }

  const handleTestConnection = async (integrationId: string) => {
    setTestingConnection(integrationId)
    
    // Simulate test
    setTimeout(() => {
      setTestingConnection(null)
      // Update integration status based on test result
    }, 1500)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      case 'configuring':
        return <Settings className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      disconnected: 'secondary',
      error: 'destructive',
      configuring: 'outline'
    }[status] as any

    return <Badge variant={variants}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Hub</h1>
          <p className="text-muted-foreground">
            Connect FastNext with external services and APIs
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Custom Integration
        </Button>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available">Available ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="configured">Configured ({integrations.length})</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* Integration Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const Icon = template.icon
              return (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            {template.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                            {template.verified && (
                              <Badge variant="outline" className="text-xs">Verified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Category</span>
                        <Badge variant="outline" className="capitalize">
                          {template.category}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="flex-1"
                              onClick={() => handleConfigureIntegration(template)}
                            >
                              Configure
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Configure {template.name}</DialogTitle>
                              <DialogDescription>
                                {template.description}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {template.configFields.map(field => (
                                <div key={field.name}>
                                  <Label>
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  {field.type === 'select' ? (
                                    <Select 
                                      value={configData[field.name] || ''}
                                      onValueChange={(value) => 
                                        setConfigData({...configData, [field.name]: value})
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map(option => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : field.type === 'textarea' ? (
                                    <Textarea
                                      placeholder={field.placeholder}
                                      value={configData[field.name] || ''}
                                      onChange={(e) => 
                                        setConfigData({...configData, [field.name]: e.target.value})
                                      }
                                    />
                                  ) : (
                                    <Input
                                      type={field.type}
                                      placeholder={field.placeholder}
                                      value={configData[field.name] || ''}
                                      onChange={(e) => 
                                        setConfigData({...configData, [field.name]: e.target.value})
                                      }
                                    />
                                  )}
                                  {field.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {field.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                              
                              <div className="flex space-x-2 pt-4">
                                <Button 
                                  onClick={handleSaveIntegration}
                                  disabled={!!testingConnection}
                                  className="flex-1"
                                >
                                  {testingConnection === isConfiguring ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Testing...
                                    </>
                                  ) : (
                                    'Save & Test'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {template.documentation && (
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="configured" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No integrations configured</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your first integration to get started
                </p>
                <Button onClick={() => setSelectedCategory('all')}>
                  Browse Integrations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations.map(integration => {
                const Icon = integration.icon
                return (
                  <Card key={integration.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{integration.name}</h3>
                              {getStatusIcon(integration.status)}
                              {getStatusBadge(integration.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                            {integration.lastSync && (
                              <p className="text-xs text-muted-foreground">
                                Last sync: {integration.lastSync.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(integration.id)}
                            disabled={!!testingConnection}
                          >
                            {testingConnection === integration.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {integration.features && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {integration.features.map(feature => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Webhook endpoints allow external services to send data to FastNext. 
              Each integration can have its own webhook URL for receiving real-time updates.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Configure incoming webhooks for your integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Global Webhook</h4>
                      <p className="text-sm text-muted-foreground">
                        Receives data from all configured integrations
                      </p>
                      <code className="text-xs bg-background px-2 py-1 rounded mt-2 block">
                        https://api.fastnext.com/webhooks/global
                      </code>
                    </div>
                    <Button variant="outline" size="sm">
                      Copy URL
                    </Button>
                  </div>
                </div>
                
                {integrations.map(integration => (
                  <div key={integration.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{integration.name} Webhook</h4>
                        <p className="text-sm text-muted-foreground">
                          Dedicated endpoint for {integration.name}
                        </p>
                        <code className="text-xs bg-muted px-2 py-1 rounded mt-2 block">
                          https://api.fastnext.com/webhooks/{integration.id}
                        </code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch />
                        <Button variant="outline" size="sm">
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IntegrationHub