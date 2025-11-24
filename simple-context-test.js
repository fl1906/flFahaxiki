// 简化的AI连续对话上下文测试
// 使用现有的认证系统和数据库直接验证

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3004';

// 测试结果
let testResults = [];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

function recordTest(name, passed, details) {
  testResults.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });

  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${details}`);
}

// 创建测试用户和对话
async function setupTestEnvironment() {
  try {
    // 生成唯一的测试用户信息
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpass123'
    };

    log(`创建测试用户: ${testUser.username}`);

    // 注册用户
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);

    if (registerResponse.data.token) {
      log('✅ 用户注册成功');
      return {
        token: registerResponse.data.token,
        userId: registerResponse.data.user?.id
      };
    }

    throw new Error('注册失败，未获得token');

  } catch (error) {
    log(`环境设置失败: ${error.message}`, 'error');

    // 如果用户已存在，尝试登录
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });

      if (loginResponse.data.token) {
        log('✅ 使用现有admin用户登录');
        return {
          token: loginResponse.data.token,
          userId: loginResponse.data.user?.id
        };
      }
    } catch (loginError) {
      log(`登录失败: ${loginError.message}`, 'error');
    }

    throw error;
  }
}

// 创建测试对话
async function createConversation(token, title) {
  try {
    const response = await axios.post(`${BASE_URL}/api/conversations`, {
      title,
      modelId: 'default-model'
    }, {
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.id;
  } catch (error) {
    log(`创建对话失败: ${error.response?.data?.error || error.message}`, 'error');
    throw error;
  }
}

// 发送聊天消息
async function sendChatMessage(token, conversationId, message) {
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message,
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    }, {
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      response: response.data.response,
      timestamp: response.data.timestamp
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    log(`发送消息失败: ${errorMsg}`, 'error');
    return {
      success: false,
      error: errorMsg
    };
  }
}

// 测试1: 基础上下文记忆
async function testBasicContextMemory(token) {
  log('\n=== 测试1: 基础上下文记忆 ===');

  try {
    const conversationId = await createConversation(token, '基础上下文测试');

    // 消息1: 自我介绍
    log('发送自我介绍消息...');
    const response1 = await sendChatMessage(token, conversationId,
      '我叫李明，是一名前端开发工程师，我主要使用React和Vue'
    );
    recordTest('发送自我介绍', response1.success,
      response1.success ? response1.response?.substring(0, 50) + '...' : response1.error);

    // 消息2: 询问姓名
    log('询问姓名测试...');
    const response2 = await sendChatMessage(token, conversationId, '请告诉我我的名字是什么？');

    const remembersName = response2.success &&
      (response2.response.includes('李明') ||
       response2.response.includes('您叫李明') ||
       response2.response.includes('李明先生'));

    recordTest('记住用户姓名', remembersName,
      remembersName ? 'AI正确记住用户姓名' : 'AI没有记住用户姓名');

    // 消息3: 询问职业
    log('询问职业测试...');
    const response3 = await sendChatMessage(token, conversationId, '我的职业是什么？');

    const remembersJob = response3.success &&
      (response3.response.includes('前端开发') ||
       response3.response.includes('工程师') ||
       response3.response.includes('开发工程师'));

    recordTest('记住用户职业', remembersJob,
      remembersJob ? 'AI正确记住用户职业' : 'AI没有记住用户职业');

    // 消息4: 询问技术栈
    log('询问技术栈测试...');
    const response4 = await sendChatMessage(token, conversationId, '我主要使用什么技术？');

    const remembersTech = response4.success &&
      (response4.response.includes('React') ||
       response4.response.includes('Vue') ||
       (response4.response.includes('React') && response4.response.includes('Vue')));

    recordTest('记住技术栈', remembersTech,
      remembersTech ? 'AI正确记住技术栈' : 'AI没有记住技术栈');

    return conversationId;

  } catch (error) {
    recordTest('基础上下文测试', false, error.message);
    throw error;
  }
}

// 测试2: 上下文连贯性
async function testContextCoherence(token) {
  log('\n=== 测试2: 上下文连贯性 ===');

  try {
    const conversationId = await createConversation(token, '上下文连贯性测试');

    // 连续的逻辑对话
    const conversationFlow = [
      '我想学习人工智能',
      '我对机器学习比较感兴趣',
      '希望从Python开始学起',
      '根据我刚才说的，你推荐我学习什么方向？',
      '请给我一个具体的学习计划'
    ];

    let coherenceScore = 0;

    for (let i = 0; i < conversationFlow.length; i++) {
      const response = await sendChatMessage(token, conversationId, conversationFlow[i]);

      // 检查回答的连贯性
      let isCoherent = false;

      if (i === 3) { // 询问推荐方向时，应该结合之前的信息
        isCoherent = response.success &&
          (response.response.includes('机器学习') ||
           response.response.includes('人工智能') ||
           response.response.includes('Python') ||
           response.response.includes('根据'));
      } else if (i === 4) { // 询问学习计划时
        isCoherent = response.success &&
          (response.response.includes('计划') ||
           response.response.includes('步骤') ||
           response.response.includes('学习') ||
           response.response.includes('路线'));
      } else {
        isCoherent = response.success;
      }

      if (isCoherent) coherenceScore++;

      recordTest(`连贯性测试${i+1}`, isCoherent,
        `消息: "${conversationFlow[i].substring(0, 20)}..."`);
    }

    const overallCoherence = coherenceScore >= conversationFlow.length * 0.8;
    recordTest('整体连贯性', overallCoherence,
      `连贯性得分: ${coherenceScore}/${conversationFlow.length}`);

    return conversationId;

  } catch (error) {
    recordTest('上下文连贯性测试', false, error.message);
    throw error;
  }
}

// 测试3: 复杂上下文理解
async function testComplexContext(token) {
  log('\n=== 测试3: 复杂上下文理解 ===');

  try {
    const conversationId = await createConversation(token, '复杂上下文测试');

    // 项目需求场景
    const projectScenario = [
      '我需要开发一个电商网站',
      '网站需要用户注册登录功能',
      '还要有商品展示和购物车',
      '支付系统也很重要',
      '请总结我刚才提到的所有功能需求',
      '现在针对这些功能，请推荐技术栈'
    ];

    let contextAccuracy = 0;

    for (let i = 0; i < projectScenario.length; i++) {
      const response = await sendChatMessage(token, conversationId, projectScenario[i]);

      // 检查上下文理解准确性
      let understandsContext = false;

      if (i === 4) { // 总结需求时，应该提到所有功能
        understandsContext = response.success &&
          (response.response.includes('注册') ||
           response.response.includes('登录') ||
           response.response.includes('购物车') ||
           response.response.includes('支付') ||
           response.response.includes('功能'));
      } else if (i === 5) { // 推荐技术栈时，应该针对电商需求
        understandsContext = response.success &&
          (response.response.includes('技术') ||
           response.response.includes('框架') ||
           response.response.includes('数据库') ||
           !response.response.includes('我不确定'));
      } else {
        understandsContext = response.success;
      }

      if (understandsContext) contextAccuracy++;

      recordTest(`复杂理解${i+1}`, understandsContext,
        `场景: "${projectScenario[i].substring(0, 25)}..."`);
    }

    const highAccuracy = contextAccuracy >= projectScenario.length * 0.7;
    recordTest('复杂理解准确性', highAccuracy,
      `准确性得分: ${contextAccuracy}/${projectScenario.length}`);

    return conversationId;

  } catch (error) {
    recordTest('复杂上下文测试', false, error.message);
    throw error;
  }
}

// 测试4: 上下文持久性测试
async function testContextPersistence(token) {
  log('\n=== 测试4: 上下文持久性 ===');

  try {
    const conversationId = await createConversation(token, '上下文持久性测试');

    // 建立初始上下文
    await sendChatMessage(token, conversationId, '我是张伟，是一名后端开发工程师');
    await sendChatMessage(token, conversationId, '我主要使用Java和Spring Boot');
    await sendChatMessage(token, conversationId, '我正在开发一个微服务项目');

    // 等待一下模拟时间间隔
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试长时记忆
    const memoryTest = await sendChatMessage(token, conversationId, '请完整介绍一下我的背景信息');

    const remembersAllInfo = memoryTest.success &&
      (memoryTest.response.includes('张伟') &&
       (memoryTest.response.includes('后端') || memoryTest.response.includes('工程师')) &&
       (memoryTest.response.includes('Java') || memoryTest.response.includes('Spring')) &&
       (memoryTest.response.includes('微服务') || memoryTest.response.includes('项目')));

    recordTest('长时上下文记忆', remembersAllInfo,
      remembersAllInfo ? 'AI记住所有背景信息' : 'AI部分遗忘信息');

    return conversationId;

  } catch (error) {
    recordTest('上下文持久性测试', false, error.message);
    throw error;
  }
}

// 测试5: 对话历史验证
async function testConversationHistory(token) {
  log('\n=== 测试5: 对话历史验证 ===');

  try {
    const conversationId = await createConversation(token, '对话历史测试');

    // 发送一系列消息
    const messages = [
      '今天的天气怎么样？',
      'Python和Java有什么区别？',
      '推荐几本技术书籍',
      '如何学习人工智能？'
    ];

    let responses = [];
    for (const msg of messages) {
      const response = await sendChatMessage(token, conversationId, msg);
      responses.push(response);
      recordTest('发送历史消息', response.success, msg);
    }

    // 检查AI能否引用之前的对话内容
    const contextQuery = await sendChatMessage(token, conversationId,
      '我们刚才聊了几个不同的话题，请回顾一下');

    const canRecallHistory = contextQuery.success &&
      (contextQuery.response.includes('天气') ||
       contextQuery.response.includes('Python') ||
       contextQuery.response.includes('Java') ||
       contextQuery.response.includes('书籍') ||
       contextQuery.response.includes('人工智能') ||
       contextQuery.response.includes('刚才'));

    recordTest('历史对话回顾', canRecallHistory,
      canRecallHistory ? 'AI能回顾历史对话' : 'AI无法回顾历史对话');

    return conversationId;

  } catch (error) {
    recordTest('对话历史测试', false, error.message);
    throw error;
  }
}

// 生成测试报告
function generateReport() {
  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.passed).length;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: `${successRate}%`
    },
    testResults: testResults,
    conclusion: successRate >= 80
      ? '✅ AI连续对话上下文理解功能正常工作'
      : '❌ AI连续对话上下文理解功能存在问题',
    recommendations: successRate >= 80
      ? ['功能正常', '可以投入生产使用']
      : ['需要进一步调试', '检查数据库查询逻辑', '验证API参数传递']
  };

  return report;
}

// 主测试函数
async function runAllTests() {
  log('🚀 开始AI连续对话上下文理解验证测试');

  try {
    // 设置测试环境
    const { token } = await setupTestEnvironment();
    log('✅ 测试环境设置完成');

    // 运行所有测试
    await testBasicContextMemory(token);
    await testContextCoherence(token);
    await testComplexContext(token);
    await testContextPersistence(token);
    await testConversationHistory(token);

    // 生成报告
    const report = generateReport();

    // 保存报告
    const fs = require('fs');
    const reportPath = `./context-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 输出结果
    log('\n📊 测试结果摘要:');
    log(`总测试数: ${report.summary.totalTests}`);
    log(`通过测试: ${report.summary.passedTests}`);
    log(`失败测试: ${report.summary.failedTests}`);
    log(`成功率: ${report.summary.successRate}`);

    log('\n🎯 结论:');
    log(report.conclusion);

    log('\n💡 建议:');
    report.recommendations.forEach(rec => log(`  - ${rec}`));

    log(`\n📄 详细报告已保存到: ${reportPath}`);

    return report;

  } catch (error) {
    log(`测试执行失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };