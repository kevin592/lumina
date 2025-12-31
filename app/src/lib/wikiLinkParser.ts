/**
 * Wiki-Link 语法解析�? *
 * 支持的语法：
 * - [[笔记标题]] - Wiki 链接，匹配标题以该文本开头的笔记
 * - @卡片�?- 卡片引用，匹配内容包含该文本�?Lumina 类型卡片
 */

export interface WikiLink {
  type: 'wiki' | 'card';
  text: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ParsedWikiLinks {
  links: WikiLink[];
  contentWithLinks: string; // 带有可点击链接的 HTML 内容
}

/**
 * 解析内容中的 Wiki 链接语法
 * @param content - 笔记内容
 * @returns 解析结果，包含链接列表和处理后的内容
 */
export function parseWikiLinks(content: string): ParsedWikiLinks {
  const links: WikiLink[] = [];
  let processedContent = content;

  // 解析 [[标题]] 语法 - Wiki 链接
  const wikiRegex = /\[\[([^\]]+)\]\]/g;
  let match;

  // 收集所�?Wiki 链接
  const wikiMatches: Array<{ text: string; start: number; end: number }> = [];
  while ((match = wikiRegex.exec(content)) !== null) {
    wikiMatches.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // 解析 @卡片�?语法 - 卡片引用（仅�?Lumina 类型中使用）
  const cardRegex = /@([^\s#]+)/g;
  const cardMatches: Array<{ text: string; start: number; end: number }> = [];
  while ((match = cardRegex.exec(content)) !== null) {
    cardMatches.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // 合并所有链接，按位置排�?  const allLinks = [
    ...wikiMatches.map(m => ({ ...m, type: 'wiki' as const })),
    ...cardMatches.map(m => ({ ...m, type: 'card' as const }))
  ].sort((a, b) => a.start - b.start);

  // 转换�?WikiLink 格式
  links.push(...allLinks.map(link => ({
    type: link.type,
    text: link.text,
    startIndex: link.start,
    endIndex: link.end
  })));

  // 替换内容中的链接�?HTML 格式（用于渲染）
  // 从后往前替换，避免位置偏移
  let htmlContent = content;
  for (let i = allLinks.length - 1; i >= 0; i--) {
    const link = allLinks[i];
    const linkClass = link.type === 'wiki' ? 'wiki-link' : 'card-link';
    const linkHtml = `<span class="${linkClass}" data-type="${link.type}" data-text="${link.text}">${link.type === 'wiki' ? '[[' : '@'}${link.text}${link.type === 'wiki' ? ']]' : ''}</span>`;

    htmlContent = htmlContent.substring(0, link.start) + linkHtml + htmlContent.substring(link.end);
  }

  return {
    links,
    contentWithLinks: htmlContent
  };
}

/**
 * 根据笔记标题列表查找匹配的笔�?ID
 * @param linkText - 链接文本
 * @param notes - 笔记列表
 * @returns 匹配的笔�?ID，如果没有匹配则返回 undefined
 */
export function findMatchedNote(linkText: string, notes: any[]): number | undefined {
  // 移除链接文本中的特殊字符，方便匹�?  const cleanText = linkText.trim().toLowerCase();

  // 优先匹配标题完全相同的笔�?  const exactMatch = notes.find(note => {
    const title = note.content?.split('\n')[0]?.trim().toLowerCase() || '';
    return title === cleanText;
  });

  if (exactMatch) {
    return exactMatch.id;
  }

  // 其次匹配标题以链接文本开头的笔记
  const startsWithMatch = notes.find(note => {
    const title = note.content?.split('\n')[0]?.trim().toLowerCase() || '';
    return title.startsWith(cleanText);
  });

  if (startsWithMatch) {
    return startsWithMatch.id;
  }

  // 最后匹配内容包含链接文本的笔记（仅�?Lumina 类型�?  const containsMatch = notes.find(note => {
    return (
      note.type === 0 && // Lumina 类型
      note.content?.toLowerCase().includes(cleanText)
    );
  });

  return containsMatch?.id;
}

/**
 * 生成引用关系�?referenceType
 * @param linkType - 链接类型（wiki �?card�? * @returns 引用类型字符�? */
export function getReferenceType(linkType: 'wiki' | 'card'): string {
  switch (linkType) {
    case 'wiki':
      return 'wiki_link';
    case 'card':
      return 'todo_card';
    default:
      return 'manual';
  }
}

/**
 * 验证 Wiki 链接文本是否有效
 * @param text - 链接文本
 * @returns 是否有效
 */
export function isValidWikiLinkText(text: string): boolean {
  const trimmed = text.trim();
  // 链接文本不能为空，且不能包含换行�?  return trimmed.length > 0 && !trimmed.includes('\n');
}

/**
 * 从现有笔记内容中提取所�?Wiki 链接
 * @param content - 笔记内容
 * @returns 提取的链接数�? */
export function extractWikiLinksFromContent(content: string): WikiLink[] {
  const result = parseWikiLinks(content);
  return result.links;
}

/**
 * 检查内容中是否包含任何 Wiki 链接语法
 * @param content - 笔记内容
 * @returns 是否包含 Wiki 链接
 */
export function hasWikiLinks(content: string): boolean {
  return /\[\[([^\]]+)\]\]/.test(content) || /@([^\s#]+)/.test(content);
}
