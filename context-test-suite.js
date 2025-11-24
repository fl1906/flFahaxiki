// AI连续对话上下文理解测试套件
// 基于api.md的OpenAI兼容格式规范

const axios = require('axios');
const fs = require('fs');

// 测试配置
const BASE_URL = 'http://localhost:3004';
const API_ENDPOINT = `${BASE_URL}/api/chat`;

// 测试结果存储
let testResults = {
  startTime: new Date().toISOString(),
  endTime: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  details: []
};

// 工具函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

function recordTest(testName, passed, details = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    log(`✅ ${testName}: ${details}`, 'success');
  } else {
    testResults.failedTests++;
    log(`❌ ${testName}: ${details}`, 'error');
  }

  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

// 生成测试用的JWT token (模拟用户登录)
async function getTestToken() {
  try {
    // 创建测试用户并获取token
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser',
      password: 'testpass123'
    });

    if (response.data.token) {
      log('成功获取测试用户token');
      return response.data.token;
    }

    // 如果登录失败，尝试注册
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass123'
    });

    if (registerResponse.data.token) {
      log('成功注册测试用户并获取token');
      return registerResponse.data.token;
    }

    throw new Error('无法获取测试token');
  } catch (error) {
    log(`获取token失败: ${error.message}`, 'error');
    throw error;
  }
}

// 创建测试对话
async function createTestConversation(token, title) {
  try {
    const response = await axios.post(`${BASE_URL}/api/conversations`, {
      title: title,
      modelId: 'default-model'
    }, {
      headers: {
        'Cookie': `token=${token}`
      }
    });

    return response.data.id;
  } catch (error) {
    log(`创建对话失败: ${error.message}`, 'error');
    throw error;
  }
}

// 测试场景1: 基础上下文理解
async function testBasicContext(token) {
  log('\n=== 测试场景1: 基础上下文理解 ===');

  try {
    const conversationId = await createTestConversation(token, '基础上下文测试');

    // 第一条消息
    const msg1 = await sendChatMessage(token, {
      message: '我的名字是张三，我是一名软件工程师',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    recordTest('发送第一条消息', msg1.success, msg1.response?.substring(0, 100) + '...');

    // 第二条消息 - 测试是否能记住名字
    const msg2 = await sendChatMessage(token, {
      message: '请叫我什么？',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    const remembersName = msg2.response && (
      msg2.response.includes('张三') ||
      msg2.response.includes('张三先生') ||
      msg2.response.includes('您是张三')
    );

    recordTest('记住用户名字', remembersName,
      remembersName ? 'AI正确记住了用户名字' : 'AI没有记住用户名字');

    // 第三条消息 - 测试是否能记住职业
    const msg3 = await sendChatMessage(token, {
      message: '我的职业是什么？',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    const remembersJob = msg3.response && (
      msg3.response.includes('软件工程师') ||
      msg3.response.includes('工程师') ||
      msg3.response.includes('软件开发')
    );

    recordTest('记住用户职业', remembersJob,
      remembersJob ? 'AI正确记住了用户职业' : 'AI没有记住用户职业');

    return { conversationId, success: true };

  } catch (error) {
    recordTest('基础上下文测试', false, error.message);
    return { success: false, error: error.message };
  }
}

// 测试场景2: 复杂多轮对话上下文
async function testComplexContext(token) {
  log('\n=== 测试场景2: 复杂多轮对话上下文 ===');

  try {
    const conversationId = await createTestConversation(token, '复杂上下文测试');

    // 模拟技术讨论场景
    const messages = [
      {
        role: 'user',
        content: '我想开发一个React应用，需要使用TypeScript',
        expectedContext: 'React + TypeScript'
      },
      {
        role: 'user',
        content: '这个应用需要连接到PostgreSQL数据库',
        expectedContext: 'React + TypeScript + PostgreSQL'
      },
      {
        role: 'user',
        content: '你还记得我刚才说的技术栈吗？请列出来',
        expectedContext: '应该包含React、TypeScript、PostgreSQL'
      },
      {
        role: 'user',
        content: '现在我想添加Docker部署，请更新技术栈',
        expectedContext: 'React + TypeScript + PostgreSQL + Docker'
      },
      {
        role: 'user',
        content: '请总结我完整的项目技术栈',
        expectedContext: '应该包含所有四种技术'
      }
    ];

    let contextMaintained = true;
    let responses = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const response = await sendChatMessage(token, {
        message: msg.content,
        conversationId,
        modelId: 'default-model',
        modelEndpoint: 'http://localhost:11434/api/generate',
        modelName: 'qwen2.5:7b'
      });

      responses.push(response.response);

      // 检查是否保持了上下文
      if (i >= 2) { // 从第3条消息开始检查上下文
        const hasContext = response.response && (
          response.response.includes('React') ||
          response.response.includes('TypeScript') ||
          (i >= 1 && response.response.includes('PostgreSQL')) ||
          (i >= 3 && response.response.includes('Docker'))
        );

        if (!hasContext) {
          contextMaintained = false;
        }

        recordTest(`多轮对话上下文${i+1}`, hasContext,
          `消息${i+1}: ${msg.expectedContext}`);
      } else {
        recordTest(`发送消息${i+1}`, response.success,
          response.response?.substring(0, 50) + '...');
      }
    }

    recordTest('复杂多轮对话上下文', contextMaintained,
      contextMaintained ? '成功保持复杂对话上下文' : '上下文保持失败');

    return { conversationId, responses, success: true };

  } catch (error) {
    recordTest('复杂上下文测试', false, error.message);
    return { success: false, error: error.message };
  }
}

// 测试场景3: 上下文连贯性和逻辑性
async function testContextCoherence(token) {
  log('\n=== 测试场景3: 上下文连贯性和逻辑性 ===');

  try {
    const conversationId = await createTestConversation(token, '上下文连贯性测试');

    // 创建一个有逻辑顺序的对话场景
    const logicalFlow = [
      '我想学习一门编程语言',
      '我对Web开发比较感兴趣',
      '希望比较容易上手，就业前景好',
      '基于我刚才说的需求，你推荐什么语言？',
      '好的，就学你推荐的语言。请给我一个学习路线图',
      '按照路线图，我第一步应该做什么？'
    ];

    let coherenceScore = 0;
    let responses = [];

    for (let i = 0; i < logicalFlow.length; i++) {
      const response = await sendChatMessage(token, {
        message: logicalFlow[i],
        conversationId,
        modelId: 'default-model',
        modelEndpoint: 'http://localhost:11434/api/generate',
        modelName: 'qwen2.5:7b'
      });

      responses.push(response.response);

      // 检查回答的连贯性
      let isCoherent = false;

      if (i === 3) { // 推荐阶段
        isCoherent = response.response && (
          response.response.includes('JavaScript') ||
          response.response.includes('Python') ||
          response.response.includes('推荐') ||
          response.response.includes('基于')
        );
      } else if (i === 4) { // 路线图阶段
        isCoherent = response.response && (
          response.response.includes('路线') ||
          response.response.includes('步骤') ||
          response.response.includes('学习') ||
          response.response.includes('计划')
        );
      } else if (i === 5) { // 第一步阶段
        isCoherent = response.response && (
          response.response.includes('第一步') ||
          response.response.includes('首先') ||
          response.response.includes('开始') ||
          response.response.includes('基础')
        );
      } else {
        isCoherent = response.success;
      }

      if (isCoherent) coherenceScore++;

      recordTest(`连贯性测试${i+1}`, isCoherent,
        `消息${i+1}: ${logicalFlow[i].substring(0, 30)}...`);
    }

    const overallCoherence = coherenceScore >= logicalFlow.length * 0.8;
    recordTest('整体上下文连贯性', overallCoherence,
      `连贯性得分: ${coherenceScore}/${logicalFlow.length}`);

    return { conversationId, responses, coherenceScore, success: true };

  } catch (error) {
    recordTest('上下文连贯性测试', false, error.message);
    return { success: false, error: error.message };
  }
}

// 测试场景4: 上下文长度和性能测试
async function testContextPerformance(token) {
  log('\n=== 测试场景4: 上下文长度和性能测试 ===');

  try {
    const conversationId = await createTestConversation(token, '上下文性能测试');

    // 发送多条消息测试上下文长度限制
    let messageCount = 10;
    let totalTime = 0;
    let successfulMessages = 0;

    for (let i = 0; i < messageCount; i++) {
      const startTime = Date.now();

      const message = i === 0
        ? `这是第${i+1}条测试消息，请简单回复确认收到`
        : `这是第${i+1}条消息，请告诉我这是第几条消息？`;

      const response = await sendChatMessage(token, {
        message,
        conversationId,
        modelId: 'default-model',
        modelEndpoint: 'http://localhost:11434/api/generate',
        modelName: 'qwen2.5:7b'
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      totalTime += responseTime;

      // 检查AI是否正确理解消息序号
      const understandsSequence = response.response &&
        response.response.includes(`${i+1}`) &&
        response.response.includes('第');

      if (understandsSequence) successfulMessages++;

      recordTest(`性能测试消息${i+1}`, understandsSequence,
        `响应时间: ${responseTime}ms, 理解序号: ${understandsSequence}`);
    }

    const averageResponseTime = totalTime / messageCount;
    const sequenceAccuracy = successfulMessages / messageCount;

    recordTest('上下文性能基准', averageResponseTime < 30000 && sequenceAccuracy > 0.7,
      `平均响应时间: ${averageResponseTime.toFixed(0)}ms, 序号准确率: ${(sequenceAccuracy * 100).toFixed(1)}%`);

    return {
      conversationId,
      averageResponseTime,
      sequenceAccuracy,
      success: true
    };

  } catch (error) {
    recordTest('上下文性能测试', false, error.message);
    return { success: false, error: error.message };
  }
}

// 测试场景5: 上下文切换和重置测试
async function testContextSwitching(token) {
  log('\n=== 测试场景5: 上下文切换和重置测试 ===');

  try {
    const conversationId = await createTestConversation(token, '上下文切换测试');

    // 场景1: 话题切换
    await sendChatMessage(token, {
      message: '我喜欢Python编程语言',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    await sendChatMessage(token, {
      message: 'Python有什么优点？',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    // 切换话题
    const switchResponse = await sendChatMessage(token, {
      message: '现在我们聊聊烹饪吧，你擅长做什么菜？',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    const canSwitchTopics = switchResponse.response && (
      switchResponse.response.includes('烹饪') ||
      switchResponse.response.includes('菜') ||
      switchResponse.response.includes('美食') ||
      !switchResponse.response.includes('Python')
    );

    recordTest('话题切换能力', canSwitchTopics,
      canSwitchTopics ? '成功切换到新话题' : '话题切换失败');

    // 场景2: 回到之前的话题
    const returnResponse = await sendChatMessage(token, {
      message: '刚才我们聊的编程语言是什么？',
      conversationId,
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b'
    });

    const canRecallPrevious = returnResponse.response && (
      returnResponse.response.includes('Python') ||
      returnResponse.response.includes('刚才') ||
      returnResponse.response.includes('之前')
    );

    recordTest('话题回溯能力', canRecallPrevious,
      canRecallPrevious ? '成功回忆之前的话题' : '无法回忆之前的话题');

    return { conversationId, success: true };

  } catch (error) {
    recordTest('上下文切换测试', false, error.message);
    return { success: false, error: error.message };
  }
}

// 发送聊天消息的辅助函数
async function sendChatMessage(token, data) {
  try {
    const response = await axios.post(API_ENDPOINT, data, {
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
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

// 生成测试报告
function generateTestReport() {
  testResults.endTime = new Date().toISOString();
  testResults.duration = new Date(testResults.endTime) - new Date(testResults.startTime);

  const successRate = testResults.totalTests > 0
    ? (testResults.passedTests / testResults.totalTests * 100).toFixed(1)
    : 0;

  const report = {
    summary: {
      startTime: testResults.startTime,
      endTime: testResults.endTime,
      duration: `${testResults.duration}ms`,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      successRate: `${successRate}%`
    },
    testScenarios: {
      '基础上下文理解': testResults.details.filter(t => t.test.includes('基础') || t.test.includes('名字') || t.test.includes('职业')),
      '复杂多轮对话': testResults.details.filter(t => t.test.includes('复杂') || t.test.includes('多轮')),
      '上下文连贯性': testResults.details.filter(t => t.test.includes('连贯性')),
      '性能测试': testResults.details.filter(t => t.test.includes('性能')),
      '上下文切换': testResults.details.filter(t => t.test.includes('切换') || t.test.includes('回溯'))
    },
    allTests: testResults.details,
    conclusion: successRate >= 80
      ? '✅ AI连续对话上下文理解功能正常工作'
      : '❌ AI连续对话上下文理解功能存在问题'
  };

  return report;
}

// 主测试函数
async function runContextTests() {
  log('🚀 开始AI连续对话上下文理解测试套件');
  log(`测试目标: ${API_ENDPOINT}`);

  try {
    // 获取测试token
    const token = await getTestToken();

    // 运行所有测试场景
    await testBasicContext(token);
    await testComplexContext(token);
    await testContextCoherence(token);
    await testContextPerformance(token);
    await testContextSwitching(token);

    // 生成并保存测试报告
    const report = generateTestReport();

    // 保存报告到文件
    const reportPath = './test-report-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 输出测试结果摘要
    log('\n📊 测试结果摘要:');
    log(`总测试数: ${report.summary.totalTests}`);
    log(`通过测试: ${report.summary.passedTests}`);
    log(`失败测试: ${report.summary.failedTests}`);
    log(`成功率: ${report.summary.successRate}`);
    log(`测试时长: ${report.summary.duration}`);

    log('\n🎯 结论:');
    log(report.conclusion);
    log(`\n📄 详细报告已保存到: ${reportPath}`);

    return report;

  } catch (error) {
    log(`测试执行失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runContextTests().catch(console.error);
}

module.exports = {
  runContextTests,
  testBasicContext,
  testComplexContext,
  testContextCoherence,
  testContextPerformance,
  testContextSwitching
};