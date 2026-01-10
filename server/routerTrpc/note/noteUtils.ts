/**
 * 从内容中提取标签
 * 忽略代码块中的标签
 */
export const extractHashtags = (input: string): string[] => {
  const withoutCodeBlocks = input.replace(/```[\s\S]*?```/g, '');
  // 先移除 URL 中的哈希片段（如 http://example.com#section）
  // 匹配常见的 URL 模式并移除其中的 # 及其后的片段
  const withoutUrlHashes = withoutCodeBlocks.replace(/https?:\/\/[^\s]+#[^\s]*/g, url => {
    return url.split('#')[0];
  });
  // 匹配标签，支持层级标签（斜杠），标签后可以跟标点、空白或另一个标签
  // 负向后瞻排除 : 和 /（避免部分 URL 片段），但不排除 \w 以支持连续标签
  // 前瞻支持：中英文标点、空白、另一个标签开头(#)、行尾
  const hashtagRegex = /(?<![:\/])#[\u4e00-\u9fa5a-zA-Z0-9_\/]+(?=[*?.。、,，;；:!！??:？:\s#]|$)/g;
  const matches = withoutUrlHashes.match(hashtagRegex);
  return matches ? matches : [];
};

/**
 * 生成分享 ID
 */
export const generateShareId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
