'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download, FileText, Image, FileImage } from 'lucide-react'
import { MindmapExporter } from '@/lib/mindmap-export'

interface ExportDialogProps {
  conversationId?: string
  mindmapData?: any
  title?: string
  children: React.ReactNode
}

export default function ExportDialog({ conversationId, mindmapData, title, children }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [format, setFormat] = useState('png')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!conversationId && !mindmapData) {
      toast.error('缺少必要的导出数据')
      return
    }

    setIsExporting(true)
    try {
      const filename = `${title || '思维导图'}_${new Date().toISOString().split('T')[0]}`

      switch (format) {
        case 'png':
          await MindmapExporter.exportAsPNG('mindmap-canvas', `${filename}.png`)
          break
        case 'pdf':
          await MindmapExporter.exportAsPDF('mindmap-canvas', `${filename}.pdf`)
          break
        case 'json':
          if (conversationId) {
            await MindmapExporter.exportAsJSON(conversationId, `${filename}.json`)
          } else {
            // 客户端生成JSON
            const jsonData = {
              title,
              exportedAt: new Date().toISOString(),
              mindmap: mindmapData
            }
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${filename}.json`
            link.click()
            window.URL.revokeObjectURL(url)
          }
          break
        case 'svg':
          if (conversationId) {
            await MindmapExporter.exportAsSVG(conversationId, `${filename}.svg`)
          } else if (mindmapData) {
            // 客户端生成SVG
            const svgContent = MindmapExporter.generateClientSideSVG(mindmapData)
            MindmapExporter.downloadClientSideSVG(svgContent, `${filename}.svg`)
          }
          break
        default:
          throw new Error('不支持的导出格式')
      }

      toast.success(`${format.toUpperCase()} 导出成功！`)
      setIsOpen(false)
    } catch (error) {
      console.error('导出失败:', error)
      toast.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const formatOptions = [
    {
      value: 'png',
      label: 'PNG 图片',
      description: '高清图片格式，适合分享和展示',
      icon: <Image className="h-4 w-4" />
    },
    {
      value: 'pdf',
      label: 'PDF 文档',
      description: '文档格式，适合打印和存档',
      icon: <FileText className="h-4 w-4" />
    },
    {
      value: 'svg',
      label: 'SVG 矢量图',
      description: '矢量格式，可无限缩放不失真',
      icon: <FileImage className="h-4 w-4" />
    },
    {
      value: 'json',
      label: 'JSON 数据',
      description: '结构化数据，适合备份和迁移',
      icon: <Download className="h-4 w-4" />
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出思维导图
          </DialogTitle>
          <DialogDescription>
            选择导出格式来保存您的思维导图
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 格式选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">选择导出格式</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="space-y-2">
              {formatOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex items-center gap-3 cursor-pointer flex-1">
                    {option.icon}
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 提示信息 */}
          {(format === 'png' || format === 'pdf') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex">
                <div className="text-blue-600 text-sm">
                  <strong>提示：</strong> PNG 和 PDF 格式将导出当前画布的可见内容，请确保思维导图完全显示在视图中。
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[100px]"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  导出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}