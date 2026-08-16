/**
 * 从聊天消息列表中构建发送给后端的对话历史。
 *
 * 规则：
 * 1. 跳过 streaming 中的消息
 * 2. 排除最后一条 user 消息（会通过 question 参数单独传）
 * 3. 跳过开头的 assistant 消息（欢迎语等 UI 占位）
 * 4. 限制最大条数（maxRounds * 2）
 */
export function buildChatHistory(
  messages: ReadonlyArray<{ role: string; content?: string; streaming?: boolean }>,
  maxRounds: number,
): { role: 'user' | 'assistant'; content: string }[] {
  const result: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const m of messages) {
    if (m.streaming) continue;
    if (m.role === 'user' || (m.role === 'assistant' && m.content)) {
      result.push({ role: m.role as 'user' | 'assistant', content: m.content! });
    }
  }

  // 排除最后一条 user（当前用户消息，通过 question 参数传给后端）
  if (result.length > 0 && result[result.length - 1].role === 'user') {
    result.pop();
  }

  // 跳过开头的 assistant（欢迎语）
  while (result.length > 0 && result[0].role === 'assistant') {
    result.shift();
  }

  const maxItems = maxRounds * 2;
  return result.length > maxItems ? result.slice(-maxItems) : result;
}
