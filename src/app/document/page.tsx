'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DocumentPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>页面不存在</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                抱歉，您访问的页面不存在。
              </CardDescription>
              <div className="space-y-4">
                <Button onClick={() => window.location.href = '/'}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
                <Button onClick={() => window.location.href = '/chat'}>
                  前往对话
                </Button>
                <Button onClick={() => window.location.href = '/mindmap'}>
                  前往思维导图
                </Button>
                <Button onClick={() => window.location.href = '/settings'}>
                  前往设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}