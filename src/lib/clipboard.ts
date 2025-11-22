/**
 * 安全的剪贴板复制功能
 * 处理浏览器权限问题
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 优先使用现代剪贴板API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // 降级到传统方法
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    return successful
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
}

/**
 * 检查剪贴板API是否可用
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && window.isSecureContext)
}

/**
 * 安全的剪贴板读取功能
 */
export async function readFromClipboard(): Promise<string> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText()
    }
    
    // 降级方法 - 通常无法从剪贴板读取由于安全限制
    throw new Error('剪贴板读取在当前环境下不可用')
  } catch (error) {
    console.error('从剪贴板读取失败:', error)
    throw error
  }
}