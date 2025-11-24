import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
  associatedMessageId?: string
}

export class MindmapExporter {
  static async exportAsPNG(elementId: string, filename: string = 'mindmap.png'): Promise<void> {
    try {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error('找不到要导出的元素')
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true
      })

      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('PNG导出失败:', error)
      throw new Error('PNG导出失败')
    }
  }

  static async exportAsPDF(elementId: string, filename: string = 'mindmap.pdf'): Promise<void> {
    try {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error('找不到要导出的元素')
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(filename)
    } catch (error) {
      console.error('PDF导出失败:', error)
      throw new Error('PDF导出失败')
    }
  }

  static async exportAsJSON(conversationId: string, filename: string = 'mindmap.json'): Promise<void> {
    try {
      const response = await fetch(`/api/mindmap/export/${conversationId}?format=json`)

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('JSON导出失败:', error)
      throw new Error('JSON导出失败')
    }
  }

  static async exportAsSVG(conversationId: string, filename: string = 'mindmap.svg'): Promise<void> {
    try {
      const response = await fetch(`/api/mindmap/export/${conversationId}?format=svg`)

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('SVG导出失败:', error)
      throw new Error('SVG导出失败')
    }
  }

  static generateClientSideSVG(mindmapData: MindmapNode, width: number = 800, height: number = 600): string {
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

    collectNodes(mindmapData)

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
    svg += `<defs>
      <style>
        .node-text {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          text-anchor: middle;
          dominant-baseline: middle;
          fill: #374151;
        }
        .node-rect {
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        }
      </style>
    </defs>`

    // 绘制连接线
    lines.forEach(line => {
      svg += `<line x1="${line.x1 - minX}" y1="${line.y1 - minY}" x2="${line.x2 - minX}" y2="${line.y2 - minY}" stroke="#d1d5db" stroke-width="2"/>`
    })

    // 绘制节点
    nodes.forEach(n => {
      const rectWidth = Math.min(120, n.text.length * 8 + 20)
      const rectHeight = 40
      const x = n.x - minX - rectWidth/2
      const y = n.y - minY - rectHeight/2

      svg += `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="8" fill="${n.color}15" stroke="${n.color}" stroke-width="2" class="node-rect"/>`
      svg += `<text x="${n.x - minX}" y="${n.y - minY}" class="node-text">${n.text}</text>`
    })

    svg += '</svg>'
    return svg
  }

  static downloadClientSideSVG(svgContent: string, filename: string = 'mindmap.svg'): void {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }
}