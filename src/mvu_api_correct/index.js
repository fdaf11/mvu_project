// ==================================================================
// == MVU 二次矫正; API测试运行脚本
// ==================================================================
// 作者: LiuLi 25_08_13
// 版本: 1.7.001 // v1.6.0: 引入“收归扩展”到模拟扩展页容器，支持任务页位置切换；v1.6.001: 将任务页专属提示词加入消息，遵循优先级
// ==================================================================

// v1.1.0: 初始化发送到API的基础框架（表单、配置、请求、结果渲染、全局错误捕获）
// v1.3.0: 增加模型选择，服务端拉取模型列表，表单与输入缓存
// v1.3.001: 增加发送/接收/错误日志与温度按任务类型的数值映射
// v1.4.0: 开放温度与最大Token配置、支持统一提示词编辑器注入 system 消息
// v1.4.001: 修复未输出发送内容日志，新增 messages 全量日志
// v1.5.0: 增加“统一正文”区、正则抽取/排除规则与多任务页，持久化缓存
// v1.5.1: 修复预览样式、任务按钮排版；增加 API 类型选择与本地反代兼容
// v1.6.0: “扩展页（模拟）”与任务面板位置切换
// v1.6.001: 发送时并入“任务页专属提示词”（system），优先级：统一提示词 > 任务页专属提示词 > 正文

import { fetchModels, requestCorrection, sendTerminate } from './modules/api.js'; // v1.7.0: 引入终止通知

const VERSION = '1.7.001'; // v1.7.001: 更新版本常量

// DOM 引用
const $endpoint = document.getElementById('cfg-endpoint'); // v1.1.0: 界面元素
const $apikey = document.getElementById('cfg-apikey'); // v1.1.0
const $task = document.getElementById('cfg-task'); // v1.1.0
const $timeout = document.getElementById('cfg-timeout'); // v1.1.0
const $mock = document.getElementById('cfg-mock'); // v1.1.0
const $model = document.getElementById('cfg-model'); // v1.3.0
const $temp = document.getElementById('cfg-temp'); // v1.4.0
const $maxTokens = document.getElementById('cfg-maxtokens'); // v1.4.0
const $apiType = document.getElementById('cfg-apitype'); // v1.5.1
const $input = document.getElementById('input-text'); // v1.1.0
const $systemPrompt = document.getElementById('cfg-system-prompt'); // v1.4.0
const $body = document.getElementById('cfg-body'); // v1.5.0
const $previewBtn = document.getElementById('btn-preview-extract'); // v1.5.0
const $previewModal = document.getElementById('regex-preview-modal'); // v1.5.0
const $previewArea = document.getElementById('regex-preview'); // v1.5.0
const $previewClose = document.getElementById('btn-close-preview'); // v1.5.0
const $taskSelect = document.getElementById('task-select'); // v1.5.0
const $taskName = document.getElementById('task-name'); // v1.5.0
const $taskPrompt = document.getElementById('task-prompt'); // v1.5.0
const $taskAdd = document.getElementById('task-add'); // v1.5.0
const $taskRemove = document.getElementById('task-remove'); // v1.5.0
const $taskRules = document.getElementById('task-rules'); // v1.5.0
const $taskAddRule = document.getElementById('task-add-rule'); // v1.5.0
const $send = document.getElementById('btn-send'); // v1.1.0
const $clear = document.getElementById('btn-clear'); // v1.1.0
const $output = document.getElementById('output'); // v1.1.0
const $statusDot = document.getElementById('status-dot'); // v1.1.0
const $statusText = document.getElementById('status-text'); // v1.1.0
const $extensionsRoot = document.getElementById('extensions_settings2'); // v1.6.0: 模拟扩展页根容器
const $tasksPanel = document.getElementById('tasks-panel'); // v1.6.0: 任务页面板引用
const tasksPanelOriginalParent = $tasksPanel ? $tasksPanel.parentNode : null; // v1.6.0: 原父节点
const tasksPanelOriginalNextSibling = $tasksPanel ? $tasksPanel.nextSibling : null; // v1.6.0: 原下一个兄弟节点

const LS_KEY = 'mvu_api_correct_settings_v1'; // v1.1.0: 配置持久化键
const LS_KEY_TEXT = 'mvu_api_correct_text_v1'; // v1.3.0: 输入内容单独缓存
const LS_KEY_PROMPT = 'mvu_api_correct_prompt_v1'; // v1.4.0: 统一提示词缓存
const LS_KEY_BODY = 'mvu_api_correct_body_v1'; // v1.5.0: 统一正文缓存
const LS_KEY_TASKS = 'mvu_api_correct_tasks_v1'; // v1.5.0: 多任务页缓存

/** 任务结构
 * {
 *   id: string,
 *   name: string,
 *   prompt: string,
 *   rules: Array<{ type: 'include'|'exclude', pattern: string, flags: string }>
 * }
 */
let tasks = []; // v1.5.0
let activeTaskId = null; // v1.5.0
let currentAbortController = null; // v1.7.0: 当前请求的终止控制器 //{1.7.0}: 终止支持
let isSending = false; // v1.7.0: 状态机

function setStatus(text, type) {
  // v1.1.0: 状态指示
  $statusText.textContent = text || '';
  $statusDot.classList.remove('ok', 'err');
  if (type === 'ok') $statusDot.classList.add('ok');
  if (type === 'err') $statusDot.classList.add('err');
}

function loadSettings() {
  // v1.1.0: 从本地恢复配置
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const cfg = JSON.parse(raw);
    if (cfg && typeof cfg === 'object') {
      if (typeof cfg.endpoint === 'string') $endpoint.value = cfg.endpoint;
      if (typeof cfg.apiKey === 'string') $apikey.value = cfg.apiKey;
      if (typeof cfg.task === 'string') $task.value = cfg.task;
      if (typeof cfg.timeoutMs === 'number') $timeout.value = String(cfg.timeoutMs);
      if (typeof cfg.mock === 'boolean') $mock.checked = cfg.mock;
      if (typeof cfg.model === 'string') $model.setAttribute('data-default', cfg.model); // v1.3.0: 模型晚点设置
      if (typeof cfg.temperature === 'number') $temp.value = String(cfg.temperature); // v1.4.0
      if (typeof cfg.max_tokens === 'number') $maxTokens.value = String(cfg.max_tokens); // v1.4.0
      if (typeof cfg.apiType === 'string') $apiType.value = cfg.apiType; // v1.5.1
      if (typeof cfg.iconLocation === 'string') setIconLocation(cfg.iconLocation); // v1.6.0: 恢复显示位置
    }
  } catch (e) {
    console.warn('读取配置失败，已忽略。'); // v1.1.0: 捕获并忽略无效的本地存储内容
  }
  try {
    $body.value = localStorage.getItem(LS_KEY_BODY) || '';
  } catch (e) {
    console.warn('读取正文缓存失败', e);
  } // v1.5.0
  try {
    const raw = localStorage.getItem(LS_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) tasks = parsed;
    }
  } catch (e) {
    console.warn('读取任务缓存失败', e);
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    tasks = [{ id: generateId(), name: '任务1', prompt: '', rules: [] }]; // v1.5.0: 至少一个任务
  }
  activeTaskId = tasks[0].id;
}

function saveSettings() {
  // v1.1.0: 保存配置
  const cfg = {
    endpoint: ($endpoint.value || '').trim(),
    apiKey: ($apikey.value || '').trim(),
    task: $task.value,
    timeoutMs: Number($timeout.value || 0) || 15000,
    mock: !!$mock.checked,
    model: $model && $model.value ? $model.value : '', // v1.3.0
    temperature: Number($temp.value) || undefined, // v1.4.0
    max_tokens: Number($maxTokens.value) || undefined, // v1.4.0
    apiType: $apiType.value || 'auto', // v1.5.1
    iconLocation: getIconLocation(), // v1.6.0: 记录显示位置
  };
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  return cfg;
}

// v1.6.0: 顶栏/扩展页显示位置选择（模拟 ST 的“驻扎顶栏/收归扩展”）
function getIconLocation() {
  // v1.6.0: 以数据为准，不以文本判断；默认 topbar
  const elTopbar = document.getElementById('loc-topbar');
  const elExt = document.getElementById('loc-extensions');
  if (elExt && elExt.checked) return 'extensions';
  if (elTopbar && elTopbar.checked) return 'topbar';
  return 'topbar';
}

function setIconLocation(v) {
  // v1.6.0: 恢复 UI 单选状态
  const elTopbar = document.getElementById('loc-topbar');
  const elExt = document.getElementById('loc-extensions');
  if (v === 'extensions') {
    if (elExt) elExt.checked = true;
    if (elTopbar) elTopbar.checked = false;
  } else {
    if (elTopbar) elTopbar.checked = true;
    if (elExt) elExt.checked = false;
  }
}

function ensureExtensionFrame() {
  // v1.6.0: 在扩展页根容器下创建一个内联抽屉框架，返回其内容挂载点
  if (!$extensionsRoot) return null;
  let frame = document.getElementById('amily2_extension_frame');
  if (!frame) {
    frame = document.createElement('div');
    frame.id = 'amily2_extension_frame';
    frame.innerHTML = [
      '<div class="inline-drawer">',
      '  <div class="inline-drawer-toggle inline-drawer-header" style="cursor:pointer;display:flex;align-items:center;gap:8px;">',
      '    <b><span style="color:#ffc107;">★</span> 扩展区 · 任务中心</b>',
      '    <div class="inline-drawer-icon" style="margin-left:auto;opacity:.8;">展开/折叠</div>',
      '  </div>',
      '  <div class="inline-drawer-content" style="display:none;"></div>',
      '</div>',
    ].join('');
    $extensionsRoot.appendChild(frame);
    // v1.6.0: 简易展开/折叠
    const header = frame.querySelector('.inline-drawer-toggle');
    const content = frame.querySelector('.inline-drawer-content');
    if (header && content) {
      header.addEventListener('click', () => {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      });
    }
  }
  return frame.querySelector('.inline-drawer-content');
}

function moveTasksPanelTo(location) {
  // v1.6.0: 将“任务页”面板迁移到指定位置
  if (!$tasksPanel) return;
  if (location === 'extensions') {
    const mount = ensureExtensionFrame();
    if (mount) {
      mount.innerHTML = '';
      mount.appendChild($tasksPanel);
    }
    return; // v1.6.0: 已处理扩展区情况
  }
  // v1.6.0: 迁回原始位置（保持初始结构）
  if (tasksPanelOriginalParent) {
    if (tasksPanelOriginalNextSibling && tasksPanelOriginalNextSibling.parentNode === tasksPanelOriginalParent) {
      tasksPanelOriginalParent.insertBefore($tasksPanel, tasksPanelOriginalNextSibling);
    } else {
      tasksPanelOriginalParent.appendChild($tasksPanel);
    }
  }
}

function saveTasks() {
  // v1.5.0
  try {
    localStorage.setItem(LS_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn('保存任务失败', e);
  }
}

function renderTaskSelect() {
  // v1.5.0
  $taskSelect.innerHTML = '';
  tasks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name || t.id;
    $taskSelect.appendChild(opt);
  });
  if (activeTaskId) $taskSelect.value = activeTaskId;
}

function renderTaskDetails() {
  // v1.5.0
  const t = tasks.find(x => x.id === activeTaskId);
  if (!t) return;
  $taskName.value = t.name || '';
  $taskPrompt.value = t.prompt || '';
  $taskRules.innerHTML = '';
  (t.rules || []).forEach((r, idx) => $taskRules.appendChild(createRuleRow(r, idx)));
}

function createRuleRow(rule, index) {
  // v1.5.0
  const wrapper = document.createElement('div');
  wrapper.className = 'row cols-3';
  const typeSel = document.createElement('select');
  ['include', 'exclude'].forEach(tp => {
    const o = document.createElement('option');
    o.value = tp;
    o.textContent = tp === 'include' ? '正则包含' : '正则排除';
    typeSel.appendChild(o);
  });
  typeSel.value = rule.type || 'include';
  const pattern = document.createElement('input');
  pattern.type = 'text';
  pattern.placeholder = '正则表达式，例如：<article>([\\s\\S]*?)</article>';
  pattern.value = rule.pattern || '';
  const flags = document.createElement('input');
  flags.type = 'text';
  flags.placeholder = '标志，例如：gi';
  flags.value = rule.flags || 'g';
  const del = document.createElement('button');
  del.textContent = '删除';
  del.className = 'secondary';
  del.addEventListener('click', () => {
    const t = getActiveTask();
    t.rules.splice(index, 1);
    saveTasks();
    renderTaskDetails();
  });
  [typeSel, pattern, flags].forEach(el =>
    el.addEventListener('change', () => {
      const t = getActiveTask();
      t.rules[index] = { type: typeSel.value, pattern: pattern.value, flags: flags.value };
      saveTasks();
    }),
  );
  const row = document.createElement('div');
  row.className = 'row cols-4';
  const c1 = document.createElement('div');
  c1.appendChild(typeSel);
  const c2 = document.createElement('div');
  c2.appendChild(pattern);
  const c3 = document.createElement('div');
  c3.appendChild(flags);
  const c4 = document.createElement('div');
  c4.appendChild(del);
  row.appendChild(c1);
  row.appendChild(c2);
  row.appendChild(c3);
  row.appendChild(c4);
  wrapper.appendChild(row);
  return wrapper;
}

function getActiveTask() {
  // v1.5.0
  return tasks.find(x => x.id === activeTaskId);
}

function applyRegexPipeline(sourceText, rules) {
  // v1.5.0: 以数据结构执行流水线
  let text = String(sourceText || '');
  for (const r of rules || []) {
    if (!r || !r.pattern) continue;
    let re = null;
    try {
      re = new RegExp(r.pattern, r.flags || 'g');
    } catch (e) {
      console.warn('无效正则', r, e);
      continue;
    }
    if (r.type === 'exclude') {
      text = text.replace(re, '');
    } else {
      const m = text.match(re);
      text = m && m.length > 0 ? m.join('\n') : '';
    }
  }
  return text;
}

function generateId() {
  // v1.5.0
  return 't_' + Math.random().toString(36).slice(2, 10);
}

async function onSend() {
  // v1.7.0: 发送/终止 双态逻辑
  if (isSending) {
    //{1.7.0}: 终止当前请求
    try {
      const cfg = saveSettings(); // 读取 endpoint 等
      if (currentAbortController) {
        currentAbortController.abort(); // 终止 fetch
      }
      // 尝试发送终止通知（非强制）
      sendTerminate({ endpoint: cfg.endpoint, apiKey: cfg.apiKey, apiType: cfg.apiType, model: cfg.model }).catch(
        () => {},
      );
    } finally {
      isSending = false;
      $send.textContent = '发送'; //{1.7.0}
      setStatus('已终止', 'err');
    }
    return;
  }

  // v1.1.0: 发送逻辑
  setStatus('发送中...', '');
  $output.textContent = '';
  try {
    const cfg = saveSettings();
    const text = ($input.value || '').toString();
    if (!cfg.mock && !cfg.endpoint) {
      throw new Error('请填写接口地址或启用 Mock 模式');
    }
    if (!text || text.trim().length === 0) {
      throw new Error('请输入要矫正/优化的文本');
    }

    // v1.3.001: 根据任务类型设置默认温度（不引入语义提示，纯参数化）
    const tempByTask = cfg.task === 'correct' ? 0.2 : 0.7;
    const finalTemp = typeof cfg.temperature === 'number' ? cfg.temperature : tempByTask; // v1.4.0: 覆盖任务默认值

    // v1.3.001: 发送前记录关键信息（不包含敏感Key与完整正文）
    console.info('[MVU-API] 发送请求', {
      timestamp: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      endpoint: cfg.endpoint,
      model: cfg.model,
      task: cfg.task,
      mock: cfg.mock,
      timeoutMs: cfg.timeoutMs,
      textLength: text.length,
      temperature: finalTemp, // v1.4.0
      max_tokens: cfg.max_tokens, // v1.4.0
    });

    // v1.4.0: 统一提示词注入（作为 system 消息）
    // v1.6.001: 注入任务页专属提示词，优先级：统一提示词 > 任务页专属提示词 > 正文
    const sysPrompt = ($systemPrompt?.value || '').trim(); // 统一提示词
    const taskPromptVal = ($taskPrompt?.value || '').trim(); // 任务页专属提示词
    const messages = [];
    if (sysPrompt) {
      messages.push({ role: 'system', content: sysPrompt }); //{1.6.001}: 全局最高优先级
    }
    if (taskPromptVal) {
      messages.push({ role: 'system', content: taskPromptVal }); //{1.6.001}: 任务页专属，其次
    }
    messages.push({ role: 'user', content: text }); //{1.6.001}: 正文

    // v1.4.001: 输出发送内容的完整日志（不含敏感Key）
    console.info('[MVU-API] 发送内容(messages)', messages);

    // v1.7.0: 创建 AbortController 用于终止
    currentAbortController = new AbortController(); //{1.7.0}
    isSending = true; //{1.7.0}
    $send.textContent = '终止'; //{1.7.0}: 切换按钮状态

    const res = await requestCorrection({
      endpoint: cfg.endpoint,
      apiKey: cfg.apiKey,
      task: cfg.task,
      timeoutMs: cfg.timeoutMs,
      text, // 向后兼容
      mock: cfg.mock,
      model: cfg.model, // v1.3.0
      temperature: finalTemp, // v1.4.0
      max_tokens: cfg.max_tokens, // v1.4.0
      messages, // v1.4.0
      apiType: cfg.apiType, // v1.5.1: 指定API类型（auto/openai/google）
      abortSignal: currentAbortController.signal, // v1.7.0: 允许终止
    });

    if (res && res.ok === true && res.data && typeof res.data.text === 'string') {
      // v1.1.0: 以数据格式判断
      $output.textContent = res.data.text;
      setStatus('完成', 'ok');
      // v1.3.001: 成功日志
      console.info('[MVU-API] 接收成功', {
        timestamp: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        preview: res.data.text.slice(0, 200),
        length: res.data.text.length,
      });
      if (typeof toastr !== 'undefined') {
        toastr.success('已成功接收响应');
      }
    } else {
      $output.textContent = JSON.stringify(res, null, 2);
      setStatus('响应格式未识别', 'err');
      // v1.3.001: 异常响应日志
      console.warn('[MVU-API] 接收但格式未识别', res);
    }
  } catch (err) {
    // v1.7.001: 区分终止错误和真实错误
    if (err.name === 'AbortError') {
      setStatus('已终止', 'err');
      $output.textContent = '请求已被用户终止';
      console.info('[MVU-API] 请求已终止');
    } else {
      setStatus('失败', 'err');
      $output.textContent = String(err && err.message ? err.message : err);
      if (typeof toastr !== 'undefined') {
        toastr.error($output.textContent, '请求失败'); // v1.1.0: 错误提示
      }
      // v1.3.001: 错误日志
      console.error('[MVU-API] 请求失败', err);
    }
  } finally {
    // v1.7.0: 恢复按钮与状态
    isSending = false;
    $send.textContent = '发送';
    currentAbortController = null;
  }
}

function bindEvents() {
  // v1.1.0: 事件绑定
  $send.addEventListener('click', onSend);
  $clear.addEventListener('click', () => {
    $input.value = '';
    $output.textContent = '';
    setStatus('空闲', '');
  });
  $input.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSend();
    }
  });
  $input.addEventListener('input', () => {
    // v1.3.0: 输入自动缓存
    try {
      localStorage.setItem(LS_KEY_TEXT, $input.value || '');
    } catch (e) {
      console.warn('输入缓存失败', e);
    }
  });
  $systemPrompt.addEventListener('input', () => {
    // v1.4.0: 提示词缓存
    try {
      localStorage.setItem(LS_KEY_PROMPT, $systemPrompt.value || '');
    } catch (e) {
      console.warn('提示词缓存失败', e);
    }
  });
  [$endpoint, $apikey, $task, $timeout, $mock, $model].forEach(el => {
    // v1.3.0: 表单改动即缓存
    el.addEventListener('change', () => {
      try {
        saveSettings();
      } catch (e) {
        console.warn('保存配置失败', e);
      }
    });
  });
  // v1.6.0: 位置切换事件绑定
  ['loc-topbar', 'loc-extensions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const cfg = saveSettings(); // v1.6.0: 保存 iconLocation
        moveTasksPanelTo(cfg.iconLocation); // v1.6.0: 迁移
      });
    }
  });
  $body.addEventListener('input', () => {
    try {
      localStorage.setItem(LS_KEY_BODY, $body.value || '');
    } catch (e) {
      console.warn('正文缓存失败', e);
    }
  }); // v1.5.0
  $taskAdd.addEventListener('click', () => {
    // v1.5.0
    const t = { id: generateId(), name: `任务${tasks.length + 1}`, prompt: '', rules: [] };
    tasks.push(t);
    activeTaskId = t.id;
    saveTasks();
    renderTaskSelect();
    renderTaskDetails();
  });
  $taskRemove.addEventListener('click', () => {
    // v1.5.0
    if (tasks.length <= 1) {
      toastr.warning('至少需要保留一个任务');
      return;
    }
    tasks = tasks.filter(t => t.id !== activeTaskId);
    activeTaskId = tasks[0].id;
    saveTasks();
    renderTaskSelect();
    renderTaskDetails();
  });
  $taskSelect.addEventListener('change', () => {
    activeTaskId = $taskSelect.value;
    renderTaskDetails();
  }); // v1.5.0
  $taskName.addEventListener('input', () => {
    const t = getActiveTask();
    t.name = $taskName.value || '';
    saveTasks();
    renderTaskSelect();
  }); // v1.5.0
  $taskPrompt.addEventListener('input', () => {
    const t = getActiveTask();
    t.prompt = $taskPrompt.value || '';
    saveTasks();
  }); // v1.5.0
  $taskAddRule.addEventListener('click', () => {
    const t = getActiveTask();
    t.rules.push({ type: 'include', pattern: '', flags: 'g' });
    saveTasks();
    renderTaskDetails();
  }); // v1.5.0
  $previewBtn.addEventListener('click', () => {
    // v1.5.0
    const t = getActiveTask();
    const out = applyRegexPipeline($body.value || '', t.rules || []);
    $previewArea.textContent = out || '[空结果]';
    try {
      $previewModal.showModal();
    } catch (_) {
      $previewModal.open = true;
    }
  });
  $previewClose.addEventListener('click', () => {
    try {
      $previewModal.close();
    } catch (_) {
      $previewModal.open = false;
    }
  }); // v1.5.0
}

async function loadModels() {
  // v1.3.0: 动态加载模型列表
  try {
    const cfg = saveSettings();
    if (!cfg.endpoint) return;
    if ($model) {
      $model.innerHTML = '<option value="" disabled selected>加载中...</option>';
    }
    const list = await fetchModels({ endpoint: cfg.endpoint, apiKey: cfg.apiKey, apiType: cfg.apiType });
    const defaultValue = $model?.getAttribute('data-default') || '';
    if ($model) {
      $model.innerHTML = '';
      list.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label || m.id;
        $model.appendChild(opt);
      });
      if (defaultValue) {
        $model.value = defaultValue;
      } else if ($model.options.length > 0) {
        $model.selectedIndex = 0;
      }
    }
    saveSettings();
  } catch (err) {
    console.error('加载模型列表失败', err);
    if ($model) $model.innerHTML = '<option value="" disabled selected>加载失败</option>';
  }
}

function boot() {
  // v1.1.0: 启动
  loadSettings();
  if (!$timeout.value) $timeout.value = '15000';
  setStatus('空闲', '');
  bindEvents();
  try {
    $input.value = localStorage.getItem(LS_KEY_TEXT) || '';
  } catch (e) {
    console.warn('读取输入缓存失败', e);
  } // v1.3.0: 恢复输入缓存
  try {
    $systemPrompt.value = localStorage.getItem(LS_KEY_PROMPT) || '';
  } catch (e) {
    console.warn('读取提示词缓存失败', e);
  } // v1.4.0: 恢复提示词缓存
  loadModels(); // v1.3.0: 启动后加载模型
  renderTaskSelect();
  renderTaskDetails(); // v1.5.0: 任务初始化
  // v1.6.0: 启动时根据配置位置迁移一次
  try {
    const cfgRaw = localStorage.getItem(LS_KEY);
    const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
    const loc = cfg && typeof cfg.iconLocation === 'string' ? cfg.iconLocation : getIconLocation();
    moveTasksPanelTo(loc);
  } catch (_) {
    // ignore
  }
}

window.addEventListener('error', event => {
  // v1.1.0: 全局错误捕获
  const message = event && event.error && event.error.message ? event.error.message : '未知错误';
  if (typeof toastr !== 'undefined') {
    toastr.error(`页面错误: ${message}`, '严重错误', { timeOut: 8000 });
  }
});

// 延迟到 DOM 可用后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot); // v1.1.0
} else {
  boot(); // v1.1.0
}
