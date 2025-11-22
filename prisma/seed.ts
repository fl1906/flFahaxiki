import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('正在初始化数据库...')

  // 注意：这里不再创建演示账户和模拟AI模型配置
  // 用户需要通过注册页面创建真实账户
  // AI模型配置需要用户在设置页面中自行添加有效的API密钥

  console.log('数据库初始化完成！请通过注册页面创建用户账户。')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })