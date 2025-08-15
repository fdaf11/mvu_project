// MVU API 矫正助手 - SillyTavern 扩展版本
// 版本: 1.7.001
// 作者: LiuLi

import { eventSource, event_types } from '../../../script.js';
import { extension_settings, saveSettingsDebounced } from '../../../scripts/extensions.js';

const extensionName = 'mvu_api_correct';
let context;

// 默认设置
const defaultSettings = {
  enabled: true,
  endpoint: '',
  apiKey: '',
  task: 'correct',
  timeoutMs: 15000,
  mock: false,
  model: '',
  temperature: 0.2,
  max_tokens: 2000,
  apiType: 'auto',
  iconLocation: 'loc-topbar',
  systemPrompt: '',
  body: '',
  tasks: [],
};

// 扩展设置键
const SETTINGS_KEYS = {
  LS_KEY: 'mvu_api_correct_settings_v1',
  LS_KEY_TEXT: 'mvu_api_correct_text_v1',
  LS_KEY_PROMPT: 'mvu_api_correct_prompt_v1',
  LS_KEY_BODY: 'mvu_api_correct_body_v1',
  LS_KEY_TASKS: 'mvu_api_correct_tasks_v1',
};

// 状态变量
let isSending = false;
let currentAbortController = null;
let tasks = [];
let activeTaskId = null;

// 初始化扩展
function initExtension() {
  console.log(`[${extensionName}] 扩展初始化开始`);

  // 加载设置
  loadSettings();

  // 创建UI
  createUI();

  // 注册事件监听器
  registerEventListeners();

  // 加载模型列表
  loadModels();

  console.log(`[${extensionName}] 扩展初始化完成`);
}

// 加载设置
function loadSettings() {
  if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
  }

  // 从localStorage恢复缓存数据
  try {
    const cachedText = localStorage.getItem(SETTINGS_KEYS.LS_KEY_TEXT);
    if (cachedText) {
      extension_settings[extensionName].cachedText = cachedText;
    }

    const cachedPrompt = localStorage.getItem(SETTINGS_KEYS.LS_KEY_PROMPT);
    if (cachedPrompt) {
      extension_settings[extensionName].systemPrompt = cachedPrompt;
    }

    const cachedBody = localStorage.getItem(SETTINGS_KEYS.LS_KEY_BODY);
    if (cachedBody) {
      extension_settings[extensionName].body = cachedBody;
    }

    const cachedTasks = localStorage.getItem(SETTINGS_KEYS.LS_KEY_TASKS);
    if (cachedTasks) {
      try {
        tasks = JSON.parse(cachedTasks);
        if (tasks.length > 0) {
          activeTaskId = tasks[0].id;
        }
      } catch (e) {
        console.warn('解析任务缓存失败:', e);
        tasks = [{ id: generateId(), name: '默认任务', prompt: '', rules: [] }];
        activeTaskId = tasks[0].id;
      }
    } else {
      tasks = [{ id: generateId(), name: '默认任务', prompt: '', rules: [] }];
      activeTaskId = tasks[0].id;
    }
  } catch (e) {
    console.warn('加载缓存失败:', e);
  }
}

// 保存设置
function saveSettings() {
  saveSettingsDebounced();

  // 保存缓存数据
  try {
    const inputEl = document.getElementById('mvu-input-text');
    if (inputEl) {
      localStorage.setItem(SETTINGS_KEYS.LS_KEY_TEXT, inputEl.value || '');
    }

    const promptEl = document.getElementById('mvu-system-prompt');
    if (promptEl) {
      localStorage.setItem(SETTINGS_KEYS.LS_KEY_PROMPT, promptEl.value || '');
    }

    const bodyEl = document.getElementById('mvu-body');
    if (bodyEl) {
      localStorage.setItem(SETTINGS_KEYS.LS_KEY_BODY, bodyEl.value || '');
    }

    localStorage.setItem(SETTINGS_KEYS.LS_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn('保存缓存失败:', e);
  }
}

// 创建UI
function createUI() {
  // 检查是否已存在UI
  if (document.getElementById('mvu-extension-container')) {
    return;
  }

  // 创建主容器
  const container = document.createElement('div');
  container.id = 'mvu-extension-container';
  container.className = 'mvu-container';
  container.style.display = 'none'; // 默认隐藏

  // 创建UI内容
  container.innerHTML = `
        <div class="mvu-panel">
            <h3>MVU API 矫正助手</h3>
            <div class="mvu-row cols-3">
                <div>
                    <label class="mvu-label">接口地址</label>
                    <input type="text" id="mvu-endpoint" class="mvu-input" placeholder="https://api.openai.com/v1/chat/completions">
                </div>
                <div>
                    <label class="mvu-label">API密钥</label>
                    <input type="password" id="mvu-apikey" class="mvu-input" placeholder="sk-...">
                </div>
                <div>
                    <label class="mvu-label">任务类型</label>
                    <select id="mvu-task" class="mvu-select">
                        <option value="correct">文本矫正</option>
                        <option value="optimize">文本优化</option>
                        <option value="translate">文本翻译</option>
                    </select>
                </div>
            </div>
            
            <div class="mvu-row cols-3">
                <div>
                    <label class="mvu-label">超时时间(ms)</label>
                    <input type="number" id="mvu-timeout" class="mvu-input" value="15000">
                </div>
                <div>
                    <label class="mvu-label">模型</label>
                    <select id="mvu-model" class="mvu-select">
                        <option value="">加载中...</option>
                    </select>
                </div>
                <div>
                    <label class="mvu-label">温度</label>
                    <input type="number" id="mvu-temp" class="mvu-input" step="0.1" min="0" max="2" value="0.2">
                </div>
            </div>
            
            <div class="mvu-row">
                <div>
                    <label class="mvu-label">统一提示词</label>
                    <textarea id="mvu-system-prompt" class="mvu-textarea" placeholder="输入系统级提示词..."></textarea>
                </div>
            </div>
            
            <div class="mvu-row">
                <div>
                    <label class="mvu-label">输入文本</label>
                    <textarea id="mvu-input-text" class="mvu-textarea" placeholder="输入要矫正/优化的文本..."></textarea>
                </div>
            </div>
            
            <div class="mvu-actions">
                <button id="mvu-send" class="mvu-button">发送</button>
                <button id="mvu-clear" class="mvu-button secondary">清空</button>
                <button id="mvu-tasks" class="mvu-button secondary">任务管理</button>
                <div class="mvu-status">
                    <div id="mvu-status-dot" class="mvu-status-dot"></div>
                    <span id="mvu-status-text">空闲</span>
                </div>
            </div>
            
            <div class="mvu-row">
                <div>
                    <label class="mvu-label">输出结果</label>
                    <textarea id="mvu-output" class="mvu-textarea" readonly></textarea>
                </div>
            </div>
        </div>
        
        <!-- 任务管理面板 -->
        <div id="mvu-tasks-panel" class="mvu-tasks-panel">
            <h3>任务管理</h3>
            <div class="mvu-row">
                <select id="mvu-task-select" class="mvu-select">
                    <option value="">选择任务</option>
                </select>
            </div>
            <div class="mvu-row">
                <input type="text" id="mvu-task-name" class="mvu-input" placeholder="任务名称">
            </div>
            <div class="mvu-row">
                <textarea id="mvu-task-prompt" class="mvu-textarea" placeholder="任务专属提示词"></textarea>
            </div>
            <div class="mvu-actions">
                <button id="mvu-task-add" class="mvu-button">添加任务</button>
                <button id="mvu-task-remove" class="mvu-button secondary">删除任务</button>
                <button id="mvu-task-close" class="mvu-button secondary">关闭</button>
            </div>
        </div>
    `;

  // 添加到页面
  document.body.appendChild(container);

  // 绑定事件
  bindUIEvents();

  // 恢复设置值
  restoreSettings();
}

// 绑定UI事件
function bindUIEvents() {
  const sendBtn = document.getElementById('mvu-send');
  const clearBtn = document.getElementById('mvu-clear');
  const tasksBtn = document.getElementById('mvu-tasks');
  const inputEl = document.getElementById('mvu-input-text');
  const promptEl = document.getElementById('mvu-system-prompt');

  if (sendBtn) {
    sendBtn.addEventListener('click', onSend);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (inputEl) inputEl.value = '';
      if (document.getElementById('mvu-output')) {
        document.getElementById('mvu-output').textContent = '';
      }
      setStatus('空闲', '');
    });
  }

  if (tasksBtn) {
    tasksBtn.addEventListener('click', () => {
      const panel = document.getElementById('mvu-tasks-panel');
      if (panel) {
        panel.classList.add('show');
      }
    });
  }

  if (inputEl) {
    inputEl.addEventListener('input', () => {
      try {
        localStorage.setItem(SETTINGS_KEYS.LS_KEY_TEXT, inputEl.value || '');
      } catch (e) {
        console.warn('输入缓存失败', e);
      }
    });
  }

  if (promptEl) {
    promptEl.addEventListener('input', () => {
      try {
        localStorage.setItem(SETTINGS_KEYS.LS_KEY_PROMPT, promptEl.value || '');
      } catch (e) {
        console.warn('提示词缓存失败', e);
      }
    });
  }

  // 绑定其他表单元素
  ['mvu-endpoint', 'mvu-apikey', 'mvu-task', 'mvu-timeout', 'mvu-temp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', saveSettings);
    }
  });

  // 任务管理事件
  bindTaskEvents();
}

// 绑定任务管理事件
function bindTaskEvents() {
  const taskAdd = document.getElementById('mvu-task-add');
  const taskRemove = document.getElementById('mvu-task-remove');
  const taskClose = document.getElementById('mvu-task-close');
  const taskSelect = document.getElementById('mvu-task-select');
  const taskName = document.getElementById('mvu-task-name');
  const taskPrompt = document.getElementById('mvu-task-prompt');

  if (taskAdd) {
    taskAdd.addEventListener('click', () => {
      const t = { id: generateId(), name: `任务${tasks.length + 1}`, prompt: '', rules: [] };
      tasks.push(t);
      activeTaskId = t.id;
      saveSettings();
      renderTaskSelect();
      renderTaskDetails();
    });
  }

  if (taskRemove) {
    taskRemove.addEventListener('click', () => {
      if (tasks.length <= 1) {
        toastr.warning('至少需要保留一个任务');
        return;
      }
      tasks = tasks.filter(t => t.id !== activeTaskId);
      activeTaskId = tasks[0].id;
      saveSettings();
      renderTaskSelect();
      renderTaskDetails();
    });
  }

  if (taskClose) {
    taskClose.addEventListener('click', () => {
      const panel = document.getElementById('mvu-tasks-panel');
      if (panel) {
        panel.classList.remove('show');
      }
    });
  }

  if (taskSelect) {
    taskSelect.addEventListener('change', () => {
      activeTaskId = taskSelect.value;
      renderTaskDetails();
    });
  }

  if (taskName) {
    taskName.addEventListener('input', () => {
      const t = getActiveTask();
      if (t) {
        t.name = taskName.value || '';
        saveSettings();
        renderTaskSelect();
      }
    });
  }

  if (taskPrompt) {
    taskPrompt.addEventListener('input', () => {
      const t = getActiveTask();
      if (t) {
        t.prompt = taskPrompt.value || '';
        saveSettings();
      }
    });
  }
}

// 恢复设置值
function restoreSettings() {
  const settings = extension_settings[extensionName];
  if (!settings) return;

  const endpointEl = document.getElementById('mvu-endpoint');
  const apikeyEl = document.getElementById('mvu-apikey');
  const taskEl = document.getElementById('mvu-task');
  const timeoutEl = document.getElementById('mvu-timeout');
  const tempEl = document.getElementById('mvu-temp');
  const inputEl = document.getElementById('mvu-input-text');
  const promptEl = document.getElementById('mvu-system-prompt');

  if (endpointEl && settings.endpoint) endpointEl.value = settings.endpoint;
  if (apikeyEl && settings.apiKey) apikeyEl.value = settings.apiKey;
  if (taskEl && settings.task) taskEl.value = settings.task;
  if (timeoutEl && settings.timeoutMs) timeoutEl.value = String(settings.timeoutMs);
  if (tempEl && settings.temperature) tempEl.value = String(settings.temperature);
  if (inputEl && settings.cachedText) inputEl.value = settings.cachedText;
  if (promptEl && settings.systemPrompt) promptEl.value = settings.systemPrompt;
}

// 设置状态
function setStatus(text, type) {
  const statusText = document.getElementById('mvu-status-text');
  const statusDot = document.getElementById('mvu-status-dot');

  if (statusText) statusText.textContent = text || '';
  if (statusDot) {
    statusDot.classList.remove('ok', 'err');
    if (type === 'ok') statusDot.classList.add('ok');
    if (type === 'err') statusDot.classList.add('err');
  }
}

// 发送请求
async function onSend() {
  if (isSending) {
    // 终止当前请求
    try {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    } finally {
      isSending = false;
      const sendBtn = document.getElementById('mvu-send');
      if (sendBtn) sendBtn.textContent = '发送';
      setStatus('已终止', 'err');
    }
    return;
  }

  // 发送逻辑
  setStatus('发送中...', '');
  const outputEl = document.getElementById('mvu-output');
  if (outputEl) outputEl.textContent = '';

  try {
    const settings = extension_settings[extensionName];
    const inputEl = document.getElementById('mvu-input-text');
    const text = (inputEl?.value || '').toString();

    if (!settings.endpoint) {
      throw new Error('请填写接口地址');
    }
    if (!text || text.trim().length === 0) {
      throw new Error('请输入要矫正/优化的文本');
    }

    // 记录发送日志
    console.info(`[${extensionName}] 发送请求`, {
      timestamp: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      endpoint: settings.endpoint,
      task: settings.task,
      textLength: text.length,
      temperature: settings.temperature,
    });

    // 创建终止控制器
    currentAbortController = new AbortController();
    isSending = true;
    const sendBtn = document.getElementById('mvu-send');
    if (sendBtn) sendBtn.textContent = '终止';

    // 这里应该调用实际的API请求函数
    // 由于这是扩展版本，需要根据实际情况实现
    const result = await mockRequest(text, settings);

    if (result && result.success) {
      if (outputEl) outputEl.textContent = result.text;
      setStatus('完成', 'ok');

      // 记录成功日志
      console.info(`[${extensionName}] 接收成功`, {
        timestamp: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        preview: result.text.slice(0, 200),
        length: result.text.length,
      });

      if (typeof toastr !== 'undefined') {
        toastr.success('已成功接收响应');
      }
    } else {
      if (outputEl) outputEl.textContent = JSON.stringify(result, null, 2);
      setStatus('响应格式未识别', 'err');
      console.warn(`[${extensionName}] 接收但格式未识别`, result);
    }
  } catch (err) {
    // 区分终止错误和真实错误
    if (err.name === 'AbortError') {
      setStatus('已终止', 'err');
      if (outputEl) outputEl.textContent = '请求已被用户终止';
      console.info(`[${extensionName}] 请求已终止`);
    } else {
      setStatus('失败', 'err');
      if (outputEl) outputEl.textContent = String(err && err.message ? err.message : err);
      if (typeof toastr !== 'undefined') {
        toastr.error(outputEl?.textContent || '请求失败', '请求失败');
      }
      console.error(`[${extensionName}] 请求失败`, err);
    }
  } finally {
    // 恢复按钮与状态
    isSending = false;
    const sendBtn = document.getElementById('mvu-send');
    if (sendBtn) sendBtn.textContent = '发送';
    currentAbortController = null;
  }
}

// 模拟请求（扩展版本需要根据实际情况实现）
async function mockRequest(text, settings) {
  // 模拟API请求延迟
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 模拟响应
  return {
    success: true,
    text: `[模拟响应] 已处理文本: ${text.slice(0, 50)}...`,
  };
}

// 加载模型列表
async function loadModels() {
  try {
    const settings = extension_settings[extensionName];
    if (!settings.endpoint) return;

    const modelEl = document.getElementById('mvu-model');
    if (modelEl) {
      modelEl.innerHTML = '<option value="" disabled selected>加载中...</option>';
    }

    // 这里应该调用实际的模型获取函数
    // 由于这是扩展版本，需要根据实际情况实现
    const models = [
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', label: 'GPT-4' },
    ];

    if (modelEl) {
      modelEl.innerHTML = '';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label || m.id;
        modelEl.appendChild(opt);
      });

      if (settings.model && modelEl.querySelector(`option[value="${settings.model}"]`)) {
        modelEl.value = settings.model;
      } else if (modelEl.options.length > 0) {
        modelEl.selectedIndex = 0;
      }
    }

    saveSettings();
  } catch (err) {
    console.error('加载模型列表失败', err);
    const modelEl = document.getElementById('mvu-model');
    if (modelEl) modelEl.innerHTML = '<option value="" disabled selected>加载失败</option>';
  }
}

// 任务管理相关函数
function getActiveTask() {
  return tasks.find(t => t.id === activeTaskId);
}

function renderTaskSelect() {
  const selectEl = document.getElementById('mvu-task-select');
  if (!selectEl) return;

  selectEl.innerHTML = '';
  tasks.forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.name;
    selectEl.appendChild(opt);
  });

  if (activeTaskId) {
    selectEl.value = activeTaskId;
  }
}

function renderTaskDetails() {
  const task = getActiveTask();
  if (!task) return;

  const nameEl = document.getElementById('mvu-task-name');
  const promptEl = document.getElementById('mvu-task-prompt');

  if (nameEl) nameEl.value = task.name || '';
  if (promptEl) promptEl.value = task.prompt || '';
}

function generateId() {
  return 't_' + Math.random().toString(36).slice(2, 10);
}

// 注册事件监听器
function registerEventListeners() {
  // 监听聊天切换事件
  eventSource.on(event_types.CHAT_CHANGED, () => {
    console.log(`[${extensionName}] 聊天已切换`);
  });

  // 监听应用就绪事件
  eventSource.on(event_types.APP_READY, () => {
    console.log(`[${extensionName}] 应用已就绪`);
  });
}

// 显示/隐藏扩展界面
function toggleExtension() {
  const container = document.getElementById('mvu-extension-container');
  if (container) {
    const isVisible = container.style.display !== 'none';
    container.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      // 显示时刷新任务列表
      renderTaskSelect();
      renderTaskDetails();
    }
  }
}

// 扩展初始化
jQuery(async () => {
  // 等待SillyTavern加载完成
  if (typeof eventSource === 'undefined') {
    console.log(`[${extensionName}] 等待SillyTavern加载...`);
    return;
  }

  // 初始化扩展
  initExtension();

  // 注册斜杠命令
  if (typeof registerSlashCommand === 'function') {
    registerSlashCommand('mvu', '打开MVU API矫正助手', () => {
      toggleExtension();
    });
  }

  console.log(`[${extensionName}] 扩展加载完成`);
});

// 导出扩展信息
export const info = {
  name: extensionName,
  display_name: 'MVU API 矫正助手',
  version: '1.7.001',
  author: 'LiuLi',
  description: '一个强大的API测试和文本矫正工具',
};
