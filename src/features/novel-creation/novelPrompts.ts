import type { Chapter, Novel } from '../../types/novel';

type TextMessage = { role: 'system' | 'user'; content: string };

export function buildContinueChapterPrompt(novel: Novel, chapter: Chapter): TextMessage[] {
  const tail = chapter.content.slice(-1500);
  return [
    { role: 'system', content: '你是小说续写助手，保持原文风格，直接输出正文，不解释。' },
    {
      role: 'user',
      content: [
        `小说标题：${novel.title}`,
        novel.summary ? `小说简介：${novel.summary}` : '',
        `当前章节：${chapter.title || '未命名章节'}`,
        '当前章节末尾：',
        tail || '本章还没有正文，请根据章节标题续写一段开头。',
        '请续写一段正文。',
      ].filter(Boolean).join('\n'),
    },
  ];
}

export function buildPolishChapterPrompt(novel: Novel, chapter: Chapter, text: string): TextMessage[] {
  return buildEditPrompt(novel, chapter, text, '润色下面正文：保持原意，优化表达、节奏和错别字，直接输出润色后的正文，不解释，不加标题。');
}

export function buildRewriteChapterPrompt(novel: Novel, chapter: Chapter, text: string): TextMessage[] {
  return buildEditPrompt(novel, chapter, text, '改写下面正文：保持剧情信息，换一种更流畅、更有张力的写法，直接输出改写后的正文，不解释，不加标题。');
}

export function buildExpandChapterPrompt(novel: Novel, chapter: Chapter, text: string): TextMessage[] {
  return buildEditPrompt(novel, chapter, text, '\u6269\u5199\u4e0b\u9762\u6b63\u6587\uff1a\u4fdd\u6301\u539f\u610f\u548c\u53d9\u4e8b\u65b9\u5411\uff0c\u589e\u52a0\u7ec6\u8282\u3001\u52a8\u4f5c\u3001\u611f\u5b98\u63cf\u5199\u548c\u60c5\u7eea\u5c42\u6b21\uff0c\u4e0d\u65b0\u589e\u91cd\u5927\u5267\u60c5\u8f6c\u6298\uff0c\u76f4\u63a5\u8f93\u51fa\u6269\u5199\u540e\u7684\u6b63\u6587\uff0c\u4e0d\u89e3\u91ca\uff0c\u4e0d\u52a0\u6807\u9898\u3002');
}

function buildEditPrompt(novel: Novel, chapter: Chapter, text: string, instruction: string): TextMessage[] {
  return [
    { role: 'system', content: '你是小说文本编辑助手，只输出可直接使用的正文，不解释，不加标题。' },
    {
      role: 'user',
      content: [
        `小说标题：${novel.title}`,
        novel.summary ? `小说简介：${novel.summary}` : '',
        `当前章节：${chapter.title || '未命名章节'}`,
        instruction,
        text,
      ].filter(Boolean).join('\n'),
    },
  ];
}
