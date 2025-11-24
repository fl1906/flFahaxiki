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
import { Keyboard, MousePointer } from 'lucide-react'

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  const shortcuts = [
    { key: 'Ctrl/Cmd + S', description: '保存思维导图' },
    { key: 'Ctrl/Cmd + E', description: '打开导出对话框' },
    { key: 'Delete', description: '删除选中的节点' },
    { key: 'Escape', description: '取消选择/退出编辑' },
    { key: '+', description: '为选中节点添加子节点' },
    { key: 'Enter', description: '编辑选中的节点内容' },
    { key: '双击节点', description: '快速编辑节点' },
    { key: '拖拽节点', description: '移动节点位置' },
    { key: '单击节点', description: '选择/取消选择节点' },
    { key: '滚轮', description: '缩放思维导图' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            使用这些快捷键来提高您的工作效率
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <div className="flex items-center gap-2">
                  {shortcut.key.includes('鼠标') ? (
                    <MousePointer className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Keyboard className="h-4 w-4 text-gray-400" />
                  )}
                  <code className="px-2 py-1 text-xs bg-white border border-gray-200 rounded font-mono">
                    {shortcut.key}
                  </code>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>提示：</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>双击节点可以直接编辑内容</li>
                <li>拖拽节点可以重新排列布局</li>
                <li>使用缩放控件可以更好地查看大型思维导图</li>
                <li>选择不同的布局算法来优化节点排列</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}