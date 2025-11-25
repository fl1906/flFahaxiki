'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Settings, 
  Key, 
  Palette,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeModeSelector } from "@/components/ui/theme-toggle"

interface AIModel {
  id: string
  name: string
  model?: string  // API模型名称，用于调用AI API
  endpoint: string
  description?: string
  createdAt: string | Date  // 支持字符串和Date类型
}

export default function SettingsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('models')
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({})
  const [isAddModelOpen, setIsAddModelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)

  // AI模型列表状态
  const [aiModels, setAiModels] = useState<AIModel[]>([])
  const [modelForm, setModelForm] = useState({
    name: '',
    model: '',
    endpoint: '',
    apiKey: '',
    description: ''
  })

  // 用户信息表单
  const [userForm, setUserForm] = useState({
    username: '用户名',
    nickname: '昵称',
    email: 'user@example.com',
    avatarUrl: ''
  })

  // 获取用户AI模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models')
        if (response.ok) {
          const data = await response.json()
          setAiModels(data.models || [])
        }
      } catch (error) {
        console.error('获取AI模型失败:', error)
      }
    }

    fetchModels()
  }, [])

  const handleAddModel = async () => {
    if (!modelForm.name || !modelForm.endpoint) return

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: modelForm.name,
          model: modelForm.model || modelForm.name, // 如果没有指定model，使用name作为默认值
          apiEndpoint: modelForm.endpoint,
          apiKey: modelForm.apiKey,
          description: modelForm.description,
        }),
      })

      if (response.ok) {
        const newModel = await response.json()
        setAiModels(prev => [...prev, newModel.model])
        setModelForm({ name: '', model: '', endpoint: '', apiKey: '', description: '' })
        setIsAddModelOpen(false)
        alert('AI模型添加成功')
      } else {
        const error = await response.json()
        alert(`添加失败: ${error.error}`)
      }
    } catch (error) {
      console.error('添加AI模型错误:', error)
      alert('添加失败，请稍后重试')
    }
  }

  const handleEditModel = (model: AIModel) => {
    setEditingModel(model)
    setModelForm({
      name: model.name,
      model: model.model || '',
      endpoint: model.endpoint,
      apiKey: '',
      description: model.description || ''
    })
  }

  const handleUpdateModel = async () => {
    if (!editingModel) return

    try {
      const response = await fetch(`/api/models/${editingModel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: modelForm.name,
          model: modelForm.model || modelForm.name,
          apiEndpoint: modelForm.endpoint,
          apiKey: modelForm.apiKey,
          description: modelForm.description,
        }),
      })

      if (response.ok) {
        const updatedModel = await response.json()
        setAiModels(prev => prev.map(model =>
          model.id === editingModel.id ? updatedModel.model : model
        ))
        setEditingModel(null)
        setModelForm({ name: '', model: '', endpoint: '', apiKey: '', description: '' })
        alert('AI模型更新成功')
      } else {
        const error = await response.json()
        alert(`更新失败: ${error.error}`)
      }
    } catch (error) {
      console.error('更新AI模型错误:', error)
      alert('更新失败，请稍后重试')
    }
  }

  const handleDeleteModel = async (id: string) => {
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAiModels(prev => prev.filter(model => model.id !== id))
        alert('AI模型删除成功')
      } else {
        const error = await response.json()

        if (response.status === 409 && error.code === 'MODEL_IN_USE') {
          // 模型正在被使用，显示详细信息
          const conversationList = error.relatedConversations
            .map((conv: { title: string }) => conv.title)
            .join('、')
          confirm(
            `该模型正在被以下对话使用，无法删除：\n${conversationList}\n\n` +
            '请先删除这些对话或为对话更换其他模型后再尝试删除。'
          )
        } else {
          alert(`删除失败: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('删除AI模型错误:', error)
      alert('删除失败，请稍后重试')
    }
  }

  const toggleApiKeyVisibility = (modelId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }))
  }

  const handleSaveUserInfo = () => {
    alert('用户信息已保存')
  }

  return (
    <DashboardLayout>
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* 页面头部 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.settings')}</h1>
            <p className="text-gray-600">管理您的账户和系统配置</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="models">{t('settings.aiModels')}</TabsTrigger>
              <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
              <TabsTrigger value="appearance">{t('settings.theme')}</TabsTrigger>
              <TabsTrigger value="shortcuts">快捷键</TabsTrigger>
            </TabsList>

            {/* AI模型管理 */}
            <TabsContent value="models" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t('settings.modelManagement')}</CardTitle>
                      <CardDescription>
                        {t('settings.modelManagementDesc')}
                      </CardDescription>
                    </div>
                    <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('settings.addModel')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('settings.addAIModel')}</DialogTitle>
                          <DialogDescription>
                            {t('settings.addAIModelDesc')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="model-name">显示名称</Label>
                            <Input
                              id="model-name"
                              value={modelForm.name}
                              onChange={(e) => setModelForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="例如: 我的GPT模型"
                            />
                          </div>
                          <div>
                            <Label htmlFor="model-api">API模型名称</Label>
                            <Input
                              id="model-api"
                              value={modelForm.model}
                              onChange={(e) => setModelForm(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="例如: gpt-4o, claude-3-sonnet"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              用于调用AI API的实际模型名称，如 gpt-4o, claude-3-sonnet-20240229 等
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="model-endpoint">API地址</Label>
                            <Input
                              id="model-endpoint"
                              value={modelForm.endpoint}
                              onChange={(e) => setModelForm(prev => ({ ...prev, endpoint: e.target.value }))}
                              placeholder="https://api.openai.com/v1/chat/completions"
                            />
                          </div>
                          <div>
                            <Label htmlFor="model-apikey">API密钥（可选）</Label>
                            <Input
                              id="model-apikey"
                              type="password"
                              value={modelForm.apiKey}
                              onChange={(e) => setModelForm(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="输入API密钥"
                            />
                          </div>
                          <div>
                            <Label htmlFor="model-description">描述（可选）</Label>
                            <Textarea
                              id="model-description"
                              value={modelForm.description}
                              onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="模型描述信息"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
                              {t('common.cancel')}
                            </Button>
                            <Button onClick={handleAddModel}>
                              {t('settings.addModel')}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* 编辑模型对话框 */}
                    <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('settings.editAIModel')}</DialogTitle>
                          <DialogDescription>
                            {t('settings.editAIModelDesc')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-model-name">显示名称</Label>
                            <Input
                              id="edit-model-name"
                              value={modelForm.name}
                              onChange={(e) => setModelForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="例如: 我的GPT模型"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-model-api">API模型名称</Label>
                            <Input
                              id="edit-model-api"
                              value={modelForm.model}
                              onChange={(e) => setModelForm(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="例如: gpt-4o, claude-3-sonnet"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              用于调用AI API的实际模型名称，如 gpt-4o, claude-3-sonnet-20240229 等
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="edit-model-endpoint">API地址</Label>
                            <Input
                              id="edit-model-endpoint"
                              value={modelForm.endpoint}
                              onChange={(e) => setModelForm(prev => ({ ...prev, endpoint: e.target.value }))}
                              placeholder="https://api.openai.com/v1/chat/completions"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-model-apikey">API密钥（可选）</Label>
                            <Input
                              id="edit-model-apikey"
                              type="password"
                              value={modelForm.apiKey}
                              onChange={(e) => setModelForm(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="输入新的API密钥（留空保持不变）"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              留空则保持原有密钥不变
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="edit-model-description">描述（可选）</Label>
                            <Textarea
                              id="edit-model-description"
                              value={modelForm.description}
                              onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="模型描述信息"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {
                              setEditingModel(null)
                              setModelForm({ name: '', model: '', endpoint: '', apiKey: '', description: '' })
                            }}>
                              取消
                            </Button>
                            <Button onClick={handleUpdateModel}>
                              保存修改
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>显示名称</TableHead>
                        <TableHead>API模型名称</TableHead>
                        <TableHead>API地址</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="w-20">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">{model.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {model.model || model.name}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {model.endpoint}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleApiKeyVisibility(model.id)}
                              >
                                {showApiKey[model.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{model.description}</TableCell>
                          <TableCell>
                            {typeof model.createdAt === 'string' 
                              ? new Date(model.createdAt).toLocaleDateString('zh-CN')
                              : model.createdAt.toLocaleDateString('zh-CN')
                            }
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditModel(model)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteModel(model.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 个人信息 */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>个人信息</CardTitle>
                  <CardDescription>
                    管理您的个人资料和账户信息
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">用户名</Label>
                      <Input
                        id="username"
                        value={userForm.username}
                        onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nickname">昵称</Label>
                      <Input
                        id="nickname"
                        value={userForm.nickname}
                        onChange={(e) => setUserForm(prev => ({ ...prev, nickname: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatar">头像URL</Label>
                    <Input
                      id="avatar"
                      value={userForm.avatarUrl}
                      onChange={(e) => setUserForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveUserInfo}>
                      <Save className="h-4 w-4 mr-2" />
                      保存信息
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 外观设置 */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>外观设置</CardTitle>
                  <CardDescription>
                    自定义界面主题和显示偏好
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>主题模式</Label>
                    <div className="mt-3">
                      <ThemeModeSelector />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      选择您喜欢的界面主题，可以跟随系统设置自动切换浅色/深色模式
                    </p>
                  </div>

                  <div>
                    <Label>语言设置</Label>
                    <select className="w-full mt-2 p-2 border rounded-md">
                      <option>简体中文</option>
                      <option>English</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-2">
                      选择界面显示语言（开发中）
                    </p>
                  </div>

                  <div>
                    <Label>字体大小</Label>
                    <select className="w-full mt-2 p-2 border rounded-md">
                      <option>小</option>
                      <option selected>中</option>
                      <option>大</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-2">
                      调整界面字体大小（开发中）
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 快捷键 */}
            <TabsContent value="shortcuts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>快捷键设置</CardTitle>
                  <CardDescription>
                    查看和自定义快捷键配置
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>功能</TableHead>
                        <TableHead>快捷键</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>新建对话</TableCell>
                        <TableCell>Ctrl + N</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">编辑</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>发送消息</TableCell>
                        <TableCell>Ctrl + Enter</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">编辑</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>打开思维导图</TableCell>
                        <TableCell>Ctrl + M</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">编辑</Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}