export interface MindmapNode {
  id: string
  text: string
  x: number
  y: number
  children: MindmapNode[]
  color?: string
  associatedMessageId?: string
}

export class MindmapLayout {
  private static readonly NODE_WIDTH = 120
  private static readonly NODE_HEIGHT = 60
  private static readonly HORIZONTAL_SPACING = 200
  private static readonly VERTICAL_SPACING = 90

  /**
   * 使用线性树形布局算法重新排列思维导图节点（提问-回复交替）
   */
  static applyTreeLayout(rootNode: MindmapNode): MindmapNode {
    const layoutData = this.calculateLinearTreeLayout(rootNode)
    return this.applyLayoutToNode(rootNode, layoutData)
  }

  /**
   * 计算线性贪吃蛇布局的位置信息（根节点→问题1→回答1→问题2→回答2）
   */
  private static calculateLinearTreeLayout(node: MindmapNode, depth: number = 0, nodeIndex: number = 0): any {
    const children = node.children || []

    // 计算当前节点的宽度
    const totalWidth = this.getTotalNodeWidth(node)

    // 计算位置 - 贪吃蛇式线性排列
    let x: number
    let y: number

    // 根据节点深度和索引计算位置 - 优化线性贪吃蛇布局
    if (node.id === 'root') {
      // 根节点 - 在起点位置
      x = 100
      y = 400 // 垂直居中
    } else {
      // 线性贪吃蛇：水平向右展开，S型垂直偏移让路径更清晰
      const spacing = 220 // 更大的节点间距
      const amplitude = 60 // S型摆动幅度

      x = 100 + nodeIndex * spacing
      // 创建S型路径：奇数节点向上，偶数节点向下
      y = 400 + (nodeIndex % 2 === 0 ? amplitude : -amplitude)
    }

    // 递归处理子节点（只有一个子节点，因为贪吃蛇结构）
    const childLayouts = children.map((child, i) => {
      // 子节点的索引是基于当前节点索引计算的
      const childIndex = nodeIndex + 1
      return this.calculateLinearTreeLayout(child, depth + 1, childIndex)
    })

    return {
      x,
      y,
      totalWidth: Math.max(totalWidth, children.length > 0 ? children.length * 100 : 0),
      height: this.NODE_HEIGHT,
      children: childLayouts
    }
  }

  /**
   * 判断是否为用户消息节点
   */
  private static isUserMessage(node: MindmapNode): boolean {
    // 根据节点ID或文本内容判断是否为用户节点
    return node.id.includes('user') ||
           node.text.includes('Q:') ||
           node.associatedMessageId?.includes('user') ||
           node.id.startsWith('msg_') && node.text.startsWith('Q:')
  }

  /**
   * 计算节点的总宽度
   */
  private static getTotalNodeWidth(node: MindmapNode): number {
    const textWidth = Math.min(this.NODE_WIDTH, Math.max(80, node.text.length * 8 + 20))
    return textWidth
  }

  /**
   * 计算垂直位置，使子节点在父节点周围均匀分布
   */
  private static calculateVerticalPosition(childLayouts: any[]): number {
    if (childLayouts.length === 0) {
      return 0
    }

    if (childLayouts.length === 1) {
      return childLayouts[0].y
    }

    // 计算子节点的平均垂直位置
    const totalY = childLayouts.reduce((sum, child) => sum + child.y, 0)
    return totalY / childLayouts.length
  }

  /**
   * 将布局应用到节点结构中
   */
  private static applyLayoutToNode(node: MindmapNode, layoutData: any): MindmapNode {
    const updatedNode: MindmapNode = {
      ...node,
      x: layoutData.x,
      y: layoutData.y
    }

    if (node.children && layoutData.children) {
      updatedNode.children = node.children.map((child, index) =>
        this.applyLayoutToNode(child, layoutData.children[index])
      )
    }

    return updatedNode
  }

  /**
   * 树形布局的便捷方法
   */
  static applyLayout(rootNode: MindmapNode): MindmapNode {
    return this.applyTreeLayout(rootNode)
  }

  /**
   * 统计节点数量
   */
  static countNodes(node: MindmapNode): number {
    let count = 1
    if (node.children) {
      node.children.forEach(child => {
        count += this.countNodes(child)
      })
    }
    return count
  }

  /**
   * 获取最大深度
   */
  static getMaxDepth(node: MindmapNode, currentDepth: number = 0): number {
    if (!node.children || node.children.length === 0) {
      return currentDepth
    }

    return Math.max(
      ...node.children.map(child => this.getMaxDepth(child, currentDepth + 1))
    )
  }

  /**
   * 垂直树形布局 - 从上到下展开
   */
  static applyVerticalTreeLayout(rootNode: MindmapNode): MindmapNode {
    return this.applyVerticalTreeLayoutRecursive(rootNode, 0, 0)
  }

  /**
   * 垂直树形布局的递归实现
   */
  private static applyVerticalTreeLayoutRecursive(node: MindmapNode, depth: number = 0, siblingIndex: number = 0): MindmapNode {
    const children = node.children || []

    // 垂直布局：根节点在顶部，子节点向下展开
    const x = 400 + siblingIndex * 50 // 根据兄弟节点的位置进行水平偏移
    const y = 100 + depth * this.VERTICAL_SPACING

    const updatedNode: MindmapNode = {
      ...node,
      x,
      y,
      children: children.map((child, index) =>
        this.applyVerticalTreeLayoutRecursive(child, depth + 1, index - (children.length - 1) / 2)
      )
    }

    return updatedNode
  }
}