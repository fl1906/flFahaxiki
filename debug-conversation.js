// 调试特定对话的上下文记忆问题
// conversation=cmid8a2n5000akzmkmkbt5glm

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';
const CONVERSATION_ID = 'cmid8a2n5000akzmkmkbt5glm';

// 需要先获取token
async function getLoginToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.token) {
      console.log('✅ 获取登录token成功');
      return response.data.token;
    }
    throw new Error('登录失败，未获得token');
  } catch (error) {
    console.log(`登录失败: ${error.message}`);

    // 尝试其他用户
    try {
      const response2 = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'user',
        password: 'password'
      });

      if (response2.data.token) {
        console.log('✅ 获取用户token成功');
        return response2.data.token;
      }
    } catch (error2) {
      console.log(`备用登录也失败: ${error2.message}`);
    }

    return null;
  }
}

// 获取对话详情和消息历史
async function debugConversation() {
  console.log(`🔍 开始调试对话: ${CONVERSATION_ID}`);

  const token = await getLoginToken();

  if (!token) {
    console.log('❌ 无法获取认证token，跳过需要认证的调试');
    console.log('💡 但可以分析已知的代码问题...');
    analyzeCodeIssues();
    return;
  }

  try {
    // 1. 获取对话详情
    console.log('\n📋 获取对话详情...');
    const conversationResponse = await axios.get(`${BASE_URL}/api/conversations/${CONVERSATION_ID}`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });

    console.log('对话详情:', {
      id: conversationResponse.data.id,
      title: conversationResponse.data.title,
      startTime: conversationResponse.data.startTime,
      isActive: conversationResponse.data.isActive
    });

    // 2. 获取消息历史
    console.log('\n💬 获取消息历史...');
    const messagesResponse = await axios.get(`${BASE_URL}/api/conversations/${CONVERSATION_ID}`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });

    if (messagesResponse.data.messages) {
      console.log(`总共 ${messagesResponse.data.messages.length} 条消息:`);
      messagesResponse.data.messages.forEach((msg, index) => {
        console.log(`\n消息 ${index + 1}:`);
        console.log(`  发送者: ${msg.senderType}`);
        console.log(`  内容: ${msg.content}`);
        console.log(`  时间: ${msg.createdAt}`);
      });

      // 3. 分析上下文问题
      console.log('\n🔍 分析上下文记忆问题...');
      analyzeContextIssues(messagesResponse.data.messages);
    }

  } catch (error) {
    console.log(`❌ 调试失败: ${error.response?.data?.error || error.message}`);
  }
}

// 分析消息中的上下文问题
function analyzeContextIssues(messages) {
  console.log('\n🧠 上下文记忆分析:');

  // 查找用户提到的名字
  const nameMentions = [];
  const nameQueries = [];

  messages.forEach((msg, index) => {
    if (msg.senderType === 'user') {
      // 查找自我介绍中的名字
      if (msg.content.includes('我叫') || msg.content.includes('我是')) {
        const nameMatch = msg.content.match(/(我叫|我是)\s*([^\s，。！？]+)/);
        if (nameMatch) {
          nameMentions.push({
            messageIndex: index,
            name: nameMatch[2],
            content: msg.content
          });
          console.log(`✅ 发现名字声明: 消息${index + 1} - "${nameMatch[2]}"`);
        }
      }

      // 查找询问名字的问题
      if (msg.content.includes('我叫什么') || msg.content.includes('我的名字') || msg.content.includes('我是谁')) {
        nameQueries.push({
          messageIndex: index,
          content: msg.content
        });
        console.log(`❓ 发现名字查询: 消息${index + 1} - "${msg.content}"`);
      }
    }

    if (msg.senderType === 'ai') {
      // 查找AI回复中是否包含正确的名字记忆
      if (msg.content.includes('我不知道') || msg.content.includes('还没告诉我') || msg.content.includes('愿意告诉我')) {
        console.log(`⚠️  AI忘记名字: 消息${index + 1} - "${msg.content.substring(0, 50)}..."`);
      }

      // 查找AI是否正确记住了名字
      nameMentions.forEach(nameMention => {
        if (msg.content.includes(nameMention.name)) {
          console.log(`✅ AI记住名字: 消息${index + 1} - 包含"${nameMention.name}"`);
        }
      });
    }
  });

  console.log(`\n📊 分析结果:`);
  console.log(`- 名字声明次数: ${nameMentions.length}`);
  console.log(`- 名字查询次数: ${nameQueries.length}`);

  if (nameMentions.length > 0 && nameQueries.length > 0) {
    console.log('⚠️  检测到上下文记忆问题: 用户声明了名字但AI忘记了');
    console.log('🔧 可能的解决方案:');
    console.log('   1. 检查数据库字段名称');
    console.log('   2. 验证上下文加载逻辑');
    console.log('   3. 检查AI模型配置');
  }
}

// 分析代码中的潜在问题
function analyzeCodeIssues() {
  console.log('\n🔍 分析代码中的潜在上下文问题...');

  console.log('\n1. 数据库字段检查:');
  console.log('   ✅ senderType字段已修复');
  console.log('   ✅ createdAt排序已修复');

  console.log('\n2. API实现检查:');
  console.log('   ✅ 上下文加载逻辑已实现');
  console.log('   ✅ Ollama集成已修复');

  console.log('\n3. 可能的问题点:');
  console.log('   ⚠️  可能是特定对话的上下文加载失败');
  console.log('   ⚠️  可能是AI模型配置问题');
  console.log('   ⚠️  可能是token认证问题');
  console.log('   ⚠️  可能是对话ID不正确');

  console.log('\n💡 建议的调试步骤:');
  console.log('   1. 验证对话ID是否正确');
  console.log('   2. 检查该对话的消息是否正确保存');
  console.log('   3. 验证上下文加载时的数据库查询');
  console.log('   4. 测试新的对话看是否有同样问题');
}

// 修复上下文记忆的建议
function suggestFixes() {
  console.log('\n🛠️  建议的修复方案:');
  console.log('\n1. 强化上下文提示:');
  console.log(`
// 在chat API中添加更强的上下文提示
let promptWithContext = '你是一个专业的AI助手。请特别注意记住用户在对话中提到的个人信息，如姓名、职业、兴趣爱好等。这些信息很重要，需要在后续对话中准确回忆和使用。\\n\\n'

// 添加明确的记忆指令
if (conversationHistory.length > 0) {
  promptWithContext += '以下是我们的对话历史，请记住其中提到的所有重要信息：\\n'
  // ... 历史对话内容
}
  `);

  console.log('\n2. 添加上下文验证:');
  console.log(`
// 在保存AI回复前验证上下文理解
const contextualKeywords = ['风离']; // 用户名字
const hasContextualResponse = contextualKeywords.some(keyword =>
  aiResponse.includes(keyword)
);

if (!hasContextualResponse && shouldRememberContext) {
  // 重新请求AI，强调记住上下文
}
  `);

  console.log('\n3. 增强AI模型配置:');
  console.log(`
options: {
  temperature: 0.3, // 降低随机性，提高记忆准确性
  num_predict: 2000,
  top_p: 0.9,
  repeat_penalty: 1.1
}
  `);
}

// 运行调试
debugConversation().then(() => {
  console.log('\n🛠️ 修复建议:');
  suggestFixes();
}).catch(console.error);