// ==================================================================
// == MVU 二次矫正; API 客户端
// ==================================================================
// 作者: LiuLi 25_08_13
// 版本: 1.7.0 // v1.7.0: 支持请求终止（AbortSignal）与服务端终止通知
// ==================================================================

// v1.2.0: 引入“统一OpenAI协议 + Google端点自动适配”的请求/响应桥接

/**
 * 统一响应结构
 * { ok: boolean, data?: { text: string, raw?: any }, error?: { code?: string, message: string } }
 */

function withTimeout(promise, timeoutMs) {
  // v1.1.0: 超时封装
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('请求超时')), Math.max(1, timeoutMs || 15000));
    promise.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function isGoogleLikeEndpoint(url, forceType) {
  // v1.5.0: 支持手动指定类型；以URL结构判断Google风格端点
  if (forceType === 'google') return true;
  if (forceType === 'openai') return false;
  try {
    if (!url || typeof url !== 'string') return false;
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase();
    const path = (u.pathname || '').toLowerCase();
    return host.includes('googleapis.com') || host.includes('generativelanguage');
  } catch (_e) {
    return false;
  }
}

function buildGoogleApiUrl(baseURL, model) {
  // v1.2.001: 根据URL结构拼接 generateContent 终点（更鲁棒，自动纠正子路径）
  try {
    const u = new URL(baseURL);
    const path = (u.pathname || '').replace(/\/+$/, '');
    const hasV1beta = path === '/v1beta' || path === 'v1beta' || path.includes('/v1beta');
    const alreadyModelsEndpoint = /\/v1beta\/models\/.+?:generateContent$/.test(path);
    if (hasV1beta && !alreadyModelsEndpoint) {
      if (!model) throw new Error('Google API需要模型名称');
      u.pathname = `v1beta/models/${model}:generateContent`;
    }
    return u.href;
  } catch (_e) {
    throw new Error('无效的API地址: ' + baseURL);
  }
}

function buildOpenAiUrl(baseURL, kind) {
  // v1.5.1: 归一化 OpenAI 兼容端点，适配本地反代（/v1, /v1/, 根路径等）
  try {
    const u = new URL(baseURL);
    let p = u.pathname || '';
    const lower = p.toLowerCase();
    const ensureV1 = () => {
      const path = p.replace(/\/+$/, '');
      const l = path.toLowerCase();
      if (l.endsWith('/v1')) return path;
      if (l.endsWith('/v1/')) return path.slice(0, -1);
      if (l.includes('/openai') && !l.includes('/v1')) return path.replace(/\/$/, '') + '/v1';
      if (l === '' || l === '/') return '/v1';
      return path.replace(/\/$/, '') + '/v1';
    };
    if (kind === 'chat') {
      if (lower.endsWith('/v1/chat/completions')) return u.href;
      p = ensureV1() + '/chat/completions';
      u.pathname = p;
      return u.href;
    }
    if (kind === 'models') {
      if (lower.endsWith('/v1/models')) return u.href;
      p = ensureV1() + '/models';
      u.pathname = p;
      return u.href;
    }
    return u.href;
  } catch (_e) {
    return baseURL;
  }
}

function openAiToGoogleRequest(openaiBody) {
  // v1.2.0: 将OpenAI风格请求映射到Google generateContent
  const messages = Array.isArray(openaiBody?.messages) ? openaiBody.messages : [];
  const contents = messages.map(m => ({
    role: m?.role === 'system' ? 'user' : m?.role || 'user',
    parts: [{ text: m?.content ?? '' }],
  }));
  return {
    contents,
    generationConfig: {
      maxOutputTokens: openaiBody?.max_tokens,
      temperature: typeof openaiBody?.temperature === 'number' ? openaiBody.temperature : 0.7,
      topP: 0.95,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };
}

function parseGoogleLikeResponse(json) {
  // v1.2.0: 解析Google响应，抽取文本
  if (!json || typeof json !== 'object') return { ok: false, error: { message: '响应非JSON对象' } };
  if (json.error) {
    return {
      ok: false,
      error: { message: String(json.error?.message || '未知错误'), code: String(json.error?.code || '') },
      data: { raw: json },
    };
  }
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts;
  // v1.3.001: 兼容空parts但存在空字符串的情况，或 Gemini 2.x 返回仅有 role 的content
  let text = '';
  if (Array.isArray(parts) && parts.length > 0) {
    text = parts
      .map(p => p?.text || '')
      .join('\n')
      .trim();
  } else if (typeof candidate?.content?.text === 'string') {
    // 某些代理会直接返回 content.text
    text = candidate.content.text.trim();
  }
  if (text) return { ok: true, data: { text, raw: json } };
  return { ok: false, error: { message: '未找到候选内容', code: 'BAD_FORMAT' }, data: { raw: json } };
}

function parseOpenAiLikeResponse(json) {
  // v1.2.0: 解析OpenAI响应，抽取文本
  if (!json || typeof json !== 'object') return { ok: false, error: { message: '响应非JSON对象' } };
  if (json.error)
    return {
      ok: false,
      error: { message: String(json.error?.message || '未知错误'), code: String(json.error?.code || '') },
      data: { raw: json },
    };
  const choice = json?.choices?.[0];
  const content = choice?.message?.content ?? choice?.text ?? '';
  if (typeof content === 'string' && content.length > 0) return { ok: true, data: { text: content, raw: json } };
  // v1.1.0: 兼容旧方案
  const dataNode = json.result || json.data || json;
  const candidate = dataNode && dataNode.text;
  if (typeof candidate === 'string') return { ok: true, data: { text: candidate, raw: json } };
  return { ok: false, error: { message: '未找到内容', code: 'BAD_FORMAT' }, data: { raw: json } };
}

function buildOpenAiBodyFromTask({ task, text, model, temperature, max_tokens }) {
  // v1.2.0: 在不引入语义指令的前提下，构造最小化OpenAI风格 body
  const messages = [{ role: 'user', content: String(text || '') }];
  return { model: model || 'gpt-3.5-turbo', messages, temperature, max_tokens };
}

async function doFetch({ endpoint, apiKey, body, timeoutMs, googleMode, model, abortSignal }) {
  // v1.2.0: 按端点类型发送请求
  let url = endpoint;
  let payload = body;
  const headers = { 'Content-Type': 'application/json' };

  if (googleMode) {
    // v1.2.001: Google 风格，构建 URL，并将 key 作为查询参数，避免自定义头引发的预检敏感性
    url = buildGoogleApiUrl(endpoint, model);
    payload = openAiToGoogleRequest(body);
    if (apiKey) {
      const u = new URL(url);
      u.searchParams.set('key', apiKey); // v1.2.001: 使用 ?key= 形式
      url = u.href;
    }
  } else if (apiKey) {
    // v1.1.0: OpenAI风格使用 Bearer
    headers['Authorization'] = `Bearer ${apiKey}`;
    // v1.5.1: 归一化为 /v1/chat/completions
    url = buildOpenAiUrl(endpoint, 'chat');
  }

  // v1.7.0: 传入 abortSignal 以支持主动终止 //{1.7.0}: 终止控制
  const resp = await withTimeout(
    fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: abortSignal }),
    timeoutMs,
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${text || '请求失败'}`);
  }
  const json = await resp.json();
  return googleMode ? parseGoogleLikeResponse(json) : parseOpenAiLikeResponse(json);
}

function doMock({ task, text }) {
  // v1.1.0: Mock
  const content = String(text || '');
  let out = content;
  if (task === 'correct') {
    out = content.replace(/\s+/g, ' ').trim();
  } else if (task === 'optimize') {
    out = `优化：${content}`;
  }
  return { ok: true, data: { text: out, raw: { mock: true, task } } };
}

export async function requestCorrection({
  // v1.2.0: 接口扩展为统一OpenAI协议
  endpoint,
  apiKey,
  task,
  text,
  timeoutMs = 15000,
  mock = false,
  model = 'gpt-3.5-turbo',
  temperature,
  max_tokens,
  messages,
  apiType = 'auto',
  abortSignal, // v1.7.0: 允许外部传入中止信号 //{1.7.0}: 终止控制
} = {}) {
  if (mock) return doMock({ task, text });
  if (!endpoint) throw new Error('未提供 endpoint');

  // v1.2.0: 优先使用外部传入的 messages，否则由 {task,text} 构建最简 body
  const openAiBody =
    Array.isArray(messages) && messages.length > 0
      ? { model, messages, temperature, max_tokens }
      : buildOpenAiBodyFromTask({ task, text, model, temperature, max_tokens });

  const googleMode = isGoogleLikeEndpoint(endpoint, apiType === 'auto' ? undefined : apiType);
  return doFetch({ endpoint, apiKey, body: openAiBody, timeoutMs, googleMode, model, abortSignal }); //{1.7.0}
}

// v1.7.0: 终止通知；尽力而为地向服务端发送“终止”消息（不保证一定存在该端点）
export async function sendTerminate({ endpoint, apiKey, apiType = 'auto', model } = {}) {
  //{1.7.0}: 若无 endpoint，直接返回
  if (!endpoint) return false;
  try {
    const googleMode = isGoogleLikeEndpoint(endpoint, apiType === 'auto' ? undefined : apiType);
    let url = endpoint;
    const headers = { 'Content-Type': 'application/json' };
    if (googleMode) {
      // 尝试在同域下提供 /terminate；若包含 v1beta 则拼接到该版本路径 //{1.7.0}
      const u = new URL(endpoint);
      const path = (u.pathname || '').replace(/\/+$/, '');
      const base = path.includes('/v1beta') ? path.replace(/(\/v1beta)(.*)?$/, '$1') : path || '/';
      u.pathname = (base.endsWith('/') ? base.slice(0, -1) : base) + '/terminate';
      if (apiKey) u.searchParams.set('key', apiKey);
      url = u.href;
    } else {
      // OpenAI风格：定位到 /v1，然后调用 /v1/terminate //{1.7.0}
      const modelsUrl = buildOpenAiUrl(endpoint, 'models');
      const u = new URL(modelsUrl);
      u.pathname = u.pathname.replace(/\/models$/, '/terminate');
      url = u.href;
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const body = { reason: 'user_cancelled' };
    const resp = await withTimeout(fetch(url, { method: 'POST', headers, body: JSON.stringify(body) }), 1500);
    return resp.ok;
  } catch (_e) {
    return false; // 忽略终止通知失败 //{1.7.0}
  }
}

export async function fetchModels({ endpoint, apiKey, timeoutMs = 15000, apiType = 'auto' } = {}) {
  // v1.3.0: 统一获取模型列表并归一化为 [{ id, label }]
  if (!endpoint) throw new Error('未提供 endpoint');
  const googleMode = isGoogleLikeEndpoint(endpoint, apiType === 'auto' ? undefined : apiType);
  let url = endpoint;
  const headers = { 'Content-Type': 'application/json' };
  if (googleMode) {
    // Google: 列表端点通常是 v1beta/models
    try {
      const u = new URL(endpoint);
      const path = (u.pathname || '').replace(/\/+$/, '');
      if (!/\/v1beta(\/|$)/.test(path)) {
        // 若不是明确 v1beta，直接返回空，避免误打
        return [];
      }
      u.pathname = 'v1beta/models';
      if (apiKey) u.searchParams.set('key', apiKey);
      url = u.href;
    } catch {
      return [];
    }
  } else if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    // OpenAI: /v1/models 端点
    try {
      const u = new URL(endpoint);
      let p = (u.pathname || '').toLowerCase();
      if (p.endsWith('/v1/chat/completions')) p = p.slice(0, -'/chat/completions'.length);
      if (p.endsWith('/v1/')) p = p.slice(0, -1);
      if (!p.endsWith('/v1')) p = p.replace(/\/$/, '') + '/v1';
      u.pathname = p.replace(/\/$/, '') + '/models';
      url = u.href;
    } catch {
      return [];
    }
  } else {
    // 无鉴权，大概率无法列出，直接返回空
    return [];
  }

  const resp = await withTimeout(fetch(url, { method: 'GET', headers }), timeoutMs);
  if (!resp.ok) return [];
  const json = await resp.json().catch(() => ({}));

  if (googleMode) {
    // Google: { models: [{ name: 'models/gemini-1.5-pro', ... }] }
    const arr = Array.isArray(json?.models) ? json.models : [];
    return arr.map(m => {
      const name = m?.name || '';
      const id = name.includes('/') ? name.split('/').pop() : name;
      return { id, label: id };
    });
  }
  // OpenAI: { data: [{ id: 'gpt-4o', ... }] }
  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map(m => ({ id: m?.id || '', label: m?.id || '' })).filter(x => x.id);
}
