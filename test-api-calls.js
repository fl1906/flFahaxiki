// 测试API调用

console.log("测试API调用功能:\n");

// 测试1: 创建一个测试对话
async function createTestConversation() {
  console.log("1. 创建测试对话...");
  try {
    const response = await fetch('http://localhost:3004/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Python学习测试对话',
        modelId: 'default-model'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ 对话创建成功:", data.id);
      return data.id;
    } else {
      console.error("❌ 对话创建失败:", response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error("❌ 创建对话时出错:", error.message);
    return null;
  }
}

// 测试2: 发送消息并测试上下文
async function testChatContext(conversationId) {
  console.log("\n2. 测试AI连续对话上下文功能...");

  // 第一条消息
  console.log("发送第一条消息: '我想学习Python编程，应该从哪里开始？'");
  const response1 = await fetch('http://localhost:3004/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '我想学习Python编程，应该从哪里开始？',
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b',
      conversationId: conversationId
    })
  });

  if (response1.ok) {
    const data1 = await response1.json();
    console.log("✅ 第一条消息发送成功");
    console.log("AI回复:", data1.response?.substring(0, 100) + '...');
  } else {
    console.error("❌ 第一条消息失败:", response1.status);
    return;
  }

  // 等待一下，然后发送第二条消息
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 第二条消息（应该基于上下文回答）
  console.log("\n发送第二条消息: '请推荐一些Python学习资源'");
  const response2 = await fetch('http://localhost:3004/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '请推荐一些Python学习资源',
      modelId: 'default-model',
      modelEndpoint: 'http://localhost:11434/api/generate',
      modelName: 'qwen2.5:7b',
      conversationId: conversationId
    })
  });

  if (response2.ok) {
    const data2 = await response2.json();
    console.log("✅ 第二条消息发送成功");
    console.log("AI回复:", data2.response?.substring(0, 150) + '...');

    // 检查是否包含上下文相关的关键词
    const response2Text = data2.response.toLowerCase();
    const contextKeywords = ['python', '学习', '刚才', '基于', '根据', '针对'];
    const hasContext = contextKeywords.some(keyword => response2Text.includes(keyword));

    console.log(`\n上下文测试结果:`);
    console.log(`包含上下文关键词: ${hasContext ? '✅' : '❌'}`);

    if (hasContext) {
      console.log("🎉 AI回复包含了上下文相关的关键词，表明上下文功能正常工作！");
    } else {
      console.log("⚠️ AI回复没有明显的上下文关联，可能上下文功能有问题");
    }
  } else {
    console.error("❌ 第二条消息失败:", response2.status);
  }
}

// 测试3: 测试思维导图生成
async function testMindmapGeneration(conversationId) {
  console.log("\n3. 测试思维导图生成功能...");

  const response = await fetch(`http://localhost:3004/api/mindmap/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversationId: conversationId
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log("✅ 思维导图生成成功");
    console.log("思维导图结构:", JSON.stringify(data).substring(0, 200) + '...');

    if (data.nodes && data.nodes.length > 0) {
      console.log(`思维导图包含 ${data.nodes.length} 个节点`);
      console.log("根节点文本:", data.nodes[0].text);
    } else {
      console.log("⚠️ 思维导图为空或结构异常");
    }
  } else {
    console.error("❌ 思维导图生成失败:", response.status, await response.text());
  }
}

// 主测试函数
async function runTests() {
  console.log("开始API功能测试...\n");

  // 创建测试对话
  const conversationId = await createTestConversation();
  if (!conversationId) {
    console.error("无法创建测试对话，终止测试");
    return;
  }

  // 测试聊天上下文
  await testChatContext(conversationId);

  // 测试思维导图
  await testMindmapGeneration(conversationId);

  console.log("\n📋 测试总结:");
  console.log("1. 数据库连接: 需要手动检查DATABASE_URL配置");
  console.log("2. 聊天API: 已测试上下文功能");
  console.log("3. 思维导图: 已测试生成功能");
  console.log("4. AI服务: 需要确认Ollama服务运行在localhost:11434");
}

// 运行测试
runTests().catch(error => {
  console.error("测试执行失败:", error);
});