import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
  associatedMessageId?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // 验证用户身份
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: '无效的token' },
        { status: 401 }
      )
    }

    const { conversationId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // 验证对话是否属于当前用户
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId: payload.userId
      },
      include: {
        mindmap: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权限' },
        { status: 404 }
      )
    }

    if (!conversation.mindmap) {
      return NextResponse.json(
        { error: '思维导图不存在' },
        { status: 404 }
      )
    }

    const mindmapData: MindmapNode = JSON.parse(conversation.mindmap.structureData)

    // 根据格式返回不同的导出内容
    switch (format.toLowerCase()) {
      case 'json':
        return exportAsJSON(mindmapData, conversation.mindmap.title, conversation)

      case 'svg':
        return exportAsSVG(mindmapData, conversation.mindmap.title)

      case 'png':
        return NextResponse.json(
          { error: 'PNG导出需要在前端处理，请使用前端导出功能' },
          { status: 400 }
        )

      case 'pdf':
        return NextResponse.json(
          { error: 'PDF导出需要在前端处理，请使用前端导出功能' },
          { status: 400 }
        )

      default:
        return NextResponse.json(
          { error: '不支持的导出格式' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('导出思维导图错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

function exportAsJSON(mindmapData: MindmapNode, title: string, conversation: any) {
  const exportData = {
    title,
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messageCount: conversation.chatMessages.length
    },
    mindmap: mindmapData
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${title}_mindmap.json"`
    }
  })
}

function exportAsSVG(mindmapData: MindmapNode, title: string) {
  const svgContent = generateSVG(mindmapData)

  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${title}_mindmap.svg"`
    }
  })
}

function generateSVG(node: MindmapNode, width: number = 800, height: number = 600): string {
  const nodes: Array<{id: string, x: number, y: number, text: string, color: string}> = []
  const lines: Array<{x1: number, y1: number, x2: number, y2: number}> = []

  function collectNodes(n: MindmapNode) {
    nodes.push({
      id: n.id,
      x: n.x,
      y: n.y,
      text: n.text,
      color: n.color || '#3b82f6'
    })

    if (n.children) {
      n.children.forEach(child => {
        lines.push({
          x1: n.x,
          y1: n.y,
          x2: child.x,
          y2: child.y
        })
        collectNodes(child)
      })
    }
  }

  collectNodes(node)

  // 计算实际的画布大小
  const allX = nodes.map(n => n.x)
  const allY = nodes.map(n => n.y)
  const minX = Math.min(...allX) - 100
  const maxX = Math.max(...allX) + 100
  const minY = Math.min(...allY) - 100
  const maxY = Math.max(...allY) + 100
  const actualWidth = maxX - minX
  const actualHeight = maxY - minY

  let svg = `<svg width="${actualWidth}" height="${actualHeight}" xmlns="http://www.w3.org/2000/svg">`
  svg += `<defs><style>.node-text { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; dominant-baseline: middle; }</style></defs>`

  // 绘制连接线
  lines.forEach(line => {
    svg += `<line x1="${line.x1 - minX}" y1="${line.y1 - minY}" x2="${line.x2 - minX}" y2="${line.y2 - minY}" stroke="#d1d5db" stroke-width="2"/>`
  })

  // 绘制节点
  nodes.forEach(n => {
    const rectWidth = 100
    const rectHeight = 40
    const x = n.x - minX - rectWidth/2
    const y = n.y - minY - rectHeight/2

    svg += `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="5" fill="${n.color}20" stroke="${n.color}" stroke-width="2"/>`
    svg += `<text x="${n.x - minX}" y="${n.y - minY}" class="node-text">${n.text}</text>`
  })

  svg += '</svg>'
  return svg
}