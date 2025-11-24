// 测试上下文记忆修复效果
// 验证AI现在能否正确记住"风离"这个名字

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

async function testContextMemoryFix() {
  console.log('🧪 测试AI上下文记忆修复效果');
  console.log('📝 测试场景：用户自我介绍"风离"，然后询问名字');

  // 模拟对话流程
  const testConversation = [
    {
      userMessage: '你好，我叫风离，很高兴认识你',
      expectedResponse: '应该记住"风离"这个名字',
      testName: '用户自我介绍'
    },
    {
      userMessage: '风离这个名字有什么含义吗？',
      expectedResponse: '应该使用"风离"这个名字进行解释',
      testName: '基于上下文的询问'
    },
    {
      userMessage: '我叫什么名字？',
      expectedResponse: '应该回答"风离"',
      testName: '名字记忆测试'
    }
  ];

  console.log('\n🔄 开始测试对话...');

  try {
    // 创建新对话
    let conversationId = null;
    try {
      // 如果能登录就创建新对话
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });

      if (loginResponse.data.token) {
        const convResponse = await axios.post(`${BASE_URL}/api/conversations`, {
          title: '上下文记忆测试',
          modelId: 'default-model'
        }, {
          headers: {
            'Cookie': `token=${loginResponse.data.token}`,
            'Content-Type': 'application/json'
          }
        });
        conversationId = convResponse.data.id;
        console.log(`✅ 创建测试对话: ${conversationId}`);
      }
    } catch (error) {
      console.log('⚠️ 无法登录，将使用现有对话测试');
    }

    // 如果没有创建新对话，使用一个现有的ID
    if (!conversationId) {
      conversationId = 'cmid8a2n5000akzmkmkbt5glm'; // 使用问题对话ID
      console.log(`📋 使用现有对话: ${conversationId}`);
    }

    // 执行测试对话
    for (let i = 0; i < testConversation.length; i++) {
      const test = testConversation[i];
      console.log(`\n--- 测试 ${i + 1}: ${test.testName} ---`);

      try {
        const response = await axios.post(`${BASE_URL}/api/chat`, {
          message: test.userMessage,
          conversationId: conversationId,
          modelId: 'default-model',
          modelEndpoint: 'http://localhost:11434/api/generate',
          modelName: 'qwen2.5:7b'
        });

        const aiResponse = response.data.response;
        console.log(`👤 用户: ${test.userMessage}`);
        console.log(`🤖 AI: ${aiResponse.substring(0, 150)}...`);

        // 评估AI回复
        const evaluation = evaluateResponse(aiResponse, test);
        console.log(`📊 评估结果: ${evaluation.status}`);
        console.log(`💬 分析: ${evaluation.analysis}`);

      } catch (error) {
        console.log(`❌ 请求失败: ${error.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ 测试执行失败: ${error.message}`);
  }
}

// 评估AI回复质量
function evaluateResponse(response, test) {
  const analysis = [];
  let score = 0;

  // 检查是否包含"风离"
  const containsName = response.includes('风离');
  if (containsName) {
    score += 3;
    analysis.push('✅ 正确记住并使用了"风离"这个名字');
  } else {
    analysis.push('❌ 没有使用"风离"这个名字');
  }

  // 检查是否有推脱性回答
  const hasAvoidance = response.includes('我不知道') ||
                       response.includes('还没告诉我') ||
                       response.includes('不记得') ||
                       response.includes('愿意告诉我');

  if (hasAvoidance) {
    score -= 2;
    analysis.push('❌ 使用了推脱性回答');
  } else {
    analysis.push('✅ 没有推脱性回答');
  }

  // 特定测试的额外评估
  if (test.testName === '名字记忆测试') {
    // 对于询问名字的问题，应该直接回答
    if (containsName && !hasAvoidance) {
      score += 2;
      analysis.push('✅ 正确回答了名字问题');
    }
  }

  if (test.testName === '基于上下文的询问') {
    // 对于基于上下文的询问，应该体现出理解
    if (containsName) {
      score += 1;
      analysis.push('✅ 体现了上下文理解');
    }
  }

  // 确定状态
  let status;
  if (score >= 4) {
    status = '🟢 优秀 - 上下文记忆工作正常';
  } else if (score >= 2) {
    status = '🟡 一般 - 部分上下文理解';
  } else {
    status = '🔴 差 - 上下文记忆仍有问题';
  }

  return {
    status,
    score,
    analysis: analysis.join('; ')
  };
}

// 额外的上下文记忆强化测试
async function testMemoryReinforcement() {
  console.log('\n🧠 测试上下文记忆强化效果');

  const reinforcementTests = [
    '我是一名程序员，擅长JavaScript开发',
    '我的爱好是读书和旅行',
    '我住在北京'
  ];

  console.log('📝 将依次添加个人信息，然后测试回忆...');

  // 这里可以添加更复杂的测试逻辑
  console.log('💡 建议：在实际使用中测试以下场景：');
  console.log('   1. 用户介绍多个信息点');
  console.log('   2. 隔几轮对话后询问之前的信息');
  console.log('   3. 混合不同类型的个人信息（姓名、职业、爱好等）');
}

// 输出修复总结
function printFixSummary() {
  console.log('\n🛠️  上下文记忆修复总结:');
  console.log('\n1. 强化系统提示词:');
  console.log('   ✅ 添加了明确的记忆指令');
  console.log('   ✅ 强调个人信息的重要性');
  console.log('   ✅ 严禁推脱性回答');

  console.log('\n2. 优化AI参数:');
  console.log('   ✅ temperature: 0.7 → 0.3 (降低随机性)');
  console.log('   ✅ 添加top_p和repeat_penalty参数');

  console.log('\n3. 改进上下文构建:');
  console.log('   ✅ 更清晰的对话历史结构');
  console.log('   ✅ 强调记忆任务的标签');

  console.log('\n📈 预期改进效果:');
  console.log('   - AI更容易记住用户个人信息');
  console.log('   - 减少推脱性回答');
  console.log('   - 提高上下文理解的准确性');
  console.log('   - 增强对话连贯性');
}

// 运行测试
testContextMemoryFix()
  .then(() => testMemoryReinforcement())
  .then(() => printFixSummary())
  .catch(console.error);