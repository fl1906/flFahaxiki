'use client' // 触发重启

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Brain,
  Plus,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

interface Stat {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  change: string
  color: string
}

interface Activity {
  id: string
  type: '对话' | '思维导图'
  name: string
  time: string
  model?: string
  messageCount?: number
}

export default function Home() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<Stat[]>([])
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const quickActions = [
    { title: t('dashboard.startConversation'), description: t('dashboard.startConversationDesc'), icon: MessageSquare, href: '/chat', color: 'bg-blue-500' },
    { title: t('dashboard.viewMindmap'), description: t('dashboard.viewMindmapDesc'), icon: Brain, href: '/mindmap', color: 'bg-green-500' },
    { title: t('dashboard.manageModels'), description: t('dashboard.manageModelsDesc'), icon: Users, href: '/settings', color: 'bg-purple-500' },
    { title: t('dashboard.conversationHistory'), description: t('dashboard.conversationHistoryDesc'), icon: FileText, href: '/history', color: 'bg-orange-500' },
  ]

  useEffect(() => {
    // 调用API获取真实的统计数据和最近活动
    const loadDashboardData = async () => {
      try {
        const statsResponse = await fetch('/api/stats')

        if (statsResponse.ok) {
          const data = await statsResponse.json()

          // 格式化统计数据
          const formattedStats: Stat[] = [
            {
              title: t('dashboard.totalConversations'),
              value: data.stats.totalConversations.toString(),
              icon: MessageSquare,
              change: data.stats.conversationChange,
              color: 'text-blue-600'
            },
            {
              title: t('dashboard.mindmaps'),
              value: data.stats.totalMindmaps.toString(),
              icon: Brain,
              change: data.stats.mindmapsChange,
              color: 'text-green-600'
            },
            {
              title: t('dashboard.aiModels'),
              value: data.stats.totalModels.toString(),
              icon: Users,
              change: data.stats.modelsChange,
              color: 'text-purple-600'
            },
            {
              title: t('dashboard.activeThisWeek'),
              value: `${data.stats.activeDays}天`,
              icon: TrendingUp,
              change: data.stats.activeDaysChange,
              color: 'text-orange-600'
            },
          ]

          setStats(formattedStats)
          setRecentActivities(data.recentActivities || [])
        } else {
          // 如果API调用失败，使用默认数据
          setStats([])
          setRecentActivities([])
        }
      } catch (error) {
        console.error('加载仪表板数据失败:', error)
        // 出错时使用默认数据
        setStats([])
        setRecentActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const defaultStats: Stat[] = [
    { title: t('dashboard.totalConversations'), value: '0', icon: MessageSquare, change: '0%', color: 'text-blue-600' },
    { title: t('dashboard.mindmaps'), value: '0', icon: Brain, change: '0%', color: 'text-green-600' },
    { title: t('dashboard.aiModels'), value: '0', icon: Users, change: '0%', color: 'text-purple-600' },
    { title: t('dashboard.activeThisWeek'), value: '0天', icon: TrendingUp, change: '0天', color: 'text-orange-600' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 欢迎信息 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.welcome')}</h1>
          <p className="text-gray-600">{t('dashboard.startJourney')}</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            (stats.length > 0 ? stats : defaultStats).map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-500">
                    <span className={stat.change && stat.change.startsWith('+') ? 'text-green-600' : 'text-gray-600'}>
                      {stat.change || t('dashboard.noData')}
                    </span>
                    {' '}{t('dashboard.comparedToLastWeek')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 快捷入口 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
            <Link href="/history">
              <Button variant="outline" size="sm">
                {t('dashboard.viewAll')}
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="divide-y">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === '对话' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {activity.type === '对话' ?
                            <MessageSquare className="h-4 w-4 text-blue-600" /> :
                            <Brain className="h-4 w-4 text-green-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.name}</p>
                          <p className="text-sm text-gray-500">
                            {activity.type} • {activity.model || '未知模型'} • {activity.messageCount || 0} 条消息
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{activity.time}</span>
                        <Badge variant="secondary">{activity.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium mb-2">{t('dashboard.noActivityYet')}</p>
                  <p className="text-sm text-gray-400 mb-4">{t('dashboard.startFirstConversation')}</p>
                  <Link href="/chat">
                    <Button>{t('dashboard.startChat')}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}