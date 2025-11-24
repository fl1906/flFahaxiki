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
  private static readonly HORIZONTAL_SPACING = 180
  private static readonly VERTICAL_SPACING = 80

  /**
   * 使用树形布局算法重新排列思维导图节点
   */
  static applyTreeLayout(rootNode: MindmapNode): MindmapNode {
    const layoutData = this.calculateTreeLayout(rootNode)
    return this.applyLayoutToNode(rootNode, layoutData)
  }

  /**
   * 计算树形布局的位置信息
   */
  private static calculateTreeLayout(node: MindmapNode, depth: number = 0, index: number = 0): any {
    const children = node.children || []
    const childLayouts = children.map((child, i) =>
      this.calculateTreeLayout(child, depth + 1, i)
    )

    // 计算当前节点的宽度
    const totalWidth = this.getTotalNodeWidth(node)

    // 计算子树的总宽度
    const childrenTotalWidth = children.length > 0
      ? children.reduce((sum, child, i) => sum + childLayouts[i].totalWidth, 0)
      : 0

    // 计算当前节点在水平方向的位置
    const x = depth * this.HORIZONTAL_SPACING + 400 // 从x=400开始

    // 计算垂直位置
    let y: number
    if (depth === 0) {
      y = 300 // 根节点在垂直方向居中
    } else {
      // 根据子树的位置计算当前节点的垂直位置
      y = this.calculateVerticalPosition(childLayouts)
    }

    return {
      x,
      y,
      totalWidth: Math.max(totalWidth, childrenTotalWidth),
      height: this.NODE_HEIGHT,
      children: childLayouts
    }
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
   * 优化径向布局（用于较少节点的思维导图）
   */
  static applyRadialLayout(rootNode: MindmapNode): MindmapNode {
    const allNodes: MindmapNode[] = []

    // 收集所有节点
    const collectNodes = (node: MindmapNode) => {
      allNodes.push(node)
      if (node.children) {
        node.children.forEach(collectNodes)
      }
    }
    collectNodes(rootNode)

    if (allNodes.length <= 1) {
      return rootNode
    }

    // 根节点在中心
    rootNode.x = 400
    rootNode.y = 300

    // 其他节点按层次分布在圆周上
    const levels = this.getNodeLevels(rootNode)
    const maxLevel = Math.max(...Object.values(levels).map(l => l.level))

    Object.entries(levels).forEach(([nodeId, { node, level }]) => {
      if (level === 0) return // 跳过根节点

      const angleStep = (2 * Math.PI) / this.getNodesAtLevel(levels, level).length
      const radius = 150 + level * 100

      const nodeIndex = this.getNodesAtLevel(levels, level).findIndex(n => n.id === nodeId)
      const angle = angleStep * nodeIndex

      node.x = rootNode.x + Math.cos(angle) * radius
      node.y = rootNode.y + Math.sin(angle) * radius
    })

    return rootNode
  }

  /**
   * 获取节点的层次信息
   */
  private static getNodeLevels(rootNode: MindmapNode): Record<string, { node: MindmapNode; level: number }> {
    const levels: Record<string, { node: MindmapNode; level: number }> = {}

    const traverse = (node: MindmapNode, level: number = 0) => {
      levels[node.id] = { node, level }
      if (node.children) {
        node.children.forEach(child => traverse(child, level + 1))
      }
    }

    traverse(rootNode)
    return levels
  }

  /**
   * 获取指定层级的所有节点
   */
  private static getNodesAtLevel(levels: Record<string, { node: MindmapNode; level: number }>, targetLevel: number): MindmapNode[] {
    return Object.entries(levels)
      .filter(([, { level }]) => level === targetLevel)
      .map(([nodeId]) => ({ id: nodeId } as MindmapNode))
  }

  /**
   * 自动选择最佳布局算法
   */
  static applyAutoLayout(rootNode: MindmapNode): MindmapNode {
    const nodeCount = this.countNodes(rootNode)
    const maxDepth = this.getMaxDepth(rootNode)

    // 根据节点数量和深度选择布局
    if (nodeCount <= 8 && maxDepth <= 2) {
      return this.applyRadialLayout(rootNode)
    } else {
      return this.applyTreeLayout(rootNode)
    }
  }

  /**
   * 统计节点数量
   */
  private static countNodes(node: MindmapNode): number {
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
  private static getMaxDepth(node: MindmapNode, currentDepth: number = 0): number {
    if (!node.children || node.children.length === 0) {
      return currentDepth
    }

    return Math.max(
      ...node.children.map(child => this.getMaxDepth(child, currentDepth + 1))
    )
  }

  /**
   * 紧凑布局 - 减少节点间距
   */
  static applyCompactLayout(rootNode: MindmapNode): MindmapNode {
    const layout = this.calculateTreeLayout(rootNode)

    // 调整间距参数
    const originalSpacing = this.HORIZONTAL_SPACING
    ;(this as any).HORIZONTAL_SPACING = 120
    ;(this as any).VERTICAL_SPACING = 60

    const result = this.applyLayoutToNode(rootNode, layout)

    // 恢复原始间距
    ;(this as any).HORIZONTAL_SPACING = originalSpacing

    return result
  }

  /**
   * 宽松布局 - 增加节点间距
   */
  static applySpaciousLayout(rootNode: MindmapNode): MindmapNode {
    const layout = this.calculateTreeLayout(rootNode)

    // 调整间距参数
    const originalHSpacing = this.HORIZONTAL_SPACING
    const originalVSpacing = this.VERTICAL_SPACING
    ;(this as any).HORIZONTAL_SPACING = 220
    ;(this as any).VERTICAL_SPACING = 100

    const result = this.applyLayoutToNode(rootNode, layout)

    // 恢复原始间距
    ;(this as any).HORIZONTAL_SPACING = originalHSpacing
    ;(this as any).VERTICAL_SPACING = originalVSpacing

    return result
  }
}