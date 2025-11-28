// Temporary file to test the correct structure

export default function MindmapPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')

  const [mindmapTitle, setMindmapTitle] = useState('思维导图')
  const [selectedAnswer, setSelectedAnswer] = useState<{ id: string; content: string; truncatedContent: string } | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')

  // ... other state and functions ...

  const goToChat = (messageId?: string) => {
    // 返回对话界面，带上下文参数
    if (conversationId) {
      const url = messageId
        ? `/chat?conversation=${conversationId}&highlight=${messageId}`
        : `/chat?conversation=${conversationId}`
      window.location.href = url
    } else {
      window.location.href = '/chat'
    }
  }

  const locateToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId)
    // 滚动到消息位置
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
        // 添加高亮效果
        messageElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50', 'bg-blue-50')
        setTimeout(() => {
          messageElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50', 'bg-blue-50')
          setHighlightedMessageId(null)
        }, 3000) // 3秒后移除高亮
      }
    }, 100)
  }

  const getNodeAssociatedMessage = (node: any): string | null => {
    if (!mindmapData || !node.associatedMessageId) return null

    const findNodeById = (nodeId: string, node: MindmapNode): MindmapNode | null => {
      if (!node) return null
      if (node.id === nodeId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(nodeId, child)
          if (found) return found
        }
      }
      return null
    }
    return findNodeById(node.associatedMessageId, mindmapData)
  }

  const handleContinueConversation = () => {
    const messageId = getNodeAssociatedMessage(selectedNode)
    const url = messageId
      ? `/chat?conversation=${conversationId}&continueFrom=${messageId}`
      : `/chat?conversation=${conversationId}&continueFrom=${selectedNode}`

    window.location.href = url
    toast.success(t('mindmap.extendingConversation'))
  }

  // 主组件返回语句
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* 思维导图头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={goToChat}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('mindmap.returnToChat')}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}