// ==================================================================
// == MVU 变量转换器模块
// ==================================================================
// 作者: LiuLi 25_08_05
// 版本: 8.620 (对象键仅在存在注释时才输出注释) //{8.620}: 不为无注释对象键添加默认注释
// 描述: 一个独立的工具模块，用于将MVU混合格式JSON转换为纯数据JSON和Yaml描述文档。
//       - 8.048版本修改：添加日志接口，封装所有console.log调用，支持测试时禁用日志输出。
//       - 8.047版本修改：兼容测试用例，同时修复网页显示格式
//       - 8.045版本修改：移除零宽空格，简化YAML输出格式
//       - 8.041版本修改：添加编辑功能，支持手动编辑变量结构和描述，提供弹窗编辑界面，自动保存编辑内容。
//       - 8.040版本修改：修复赋值API调用，简化逻辑，直接使用replaceVariables和insertOrAssignVariables，参考历史版本确保正确性。
//       - 8.039版本修改：创建两个版本的数据，结构版本用于显示（删除实例），完整版本用于赋值（保留实例）。
//       - 8.038版本修改：缓存转换后的JSON数据，赋值时优先使用转换后的数据，保留增删列表结构中的实例。
//       - 8.037版本修改：智能合并变量，先获取现有变量数据，然后合并新的stat_data，避免清空其他变量如scheme等。
//       - 8.036版本修改：隐藏强制刷新按钮，支持同时赋值到最新楼层和Chat变量，提供更详细的赋值结果反馈。
//       - 8.035版本修改：修复iframe环境下的URL修改安全错误，添加环境检测和错误处理。
//       - 8.034版本修改：动态缓存破坏机制，每次访问都生成新的时间戳和缓存破坏符，解决浏览器缓存问题。
//       - 8.033版本修改：支持中文变量名，当路径包含中文时使用中文变量名，否则使用英文变量名。
//       - 8.032版本修改：修复EJS代码中items变量重复声明问题，为每个可增删列表生成唯一的变量名。
//       - 8.031版本修改：修复格式识别逻辑，避免格式1和格式2的误识别，确保正确的数据提取。
//       - 8.03版本修改：修复数据提取逻辑，从[[数据, 描述], 更新说明]格式中只提取数据部分，去除描述信息；强制重新初始化机制，确保每次点击都使用最新版本。
//       - 8.02版本修改：修复{{user}}等复杂嵌套对象的数组格式识别问题，支持[数组, 描述]格式。
//       - 8.01版本修改：修复{{user}}等复杂嵌套对象的数组格式识别问题，支持[对象, 描述]格式。
//       - 8.0版本修改：重构模块初始化策略，每次点击都重新初始化，修复processNode递归判定漏洞，增强数组格式识别能力，优化界面响应式设计。
//       - 7.95版本修改：删除根节点防护等多余条件，所有节点同等对待，优化节点处理逻辑。
//       - 7.85版本修改：实现按需加载和自动卸载机制，点击按钮时初始化模块，关闭弹窗时完全卸载模块，优化内存占用和性能。
//       - 7.84版本修改：优化可增删列表结构判断逻辑，支持value.$meta?.extensible属性检测和智能判断规则，添加输入预处理功能。
//       - 7.83版本修改：使用replaceVariables和insertOrAssignVariables API，结合DOM操作作为回退方案，实现"赋值最新楼层"功能。
//       - 7.8版本修改：在弹窗右上角添加常驻关闭按钮，在"开始转换"按钮左边添加"赋值最新楼层"按钮，用于快速将转换结果赋值给最新楼层的stat_data变量。
//       - 7.7版本修改：根据用户反馈，将世界书条目的匹配逻辑从检查条目内容(content)改为检查条目注释/标题(comment)。这修复了更新一次后因关键词被覆盖而无法再次同步的逻辑缺陷，使同步功能更加健壮和持久。
//       - 集成所有先前版本的功能。
// ==================================================================

// 8.048版本修改：日志接口 - 支持测试时禁用日志输出
const Logger = {
  // 全局日志开关，测试时可以设置为false
  enabled: true,

  // 设置日志开关
  setEnabled: function (enabled) {
    this.enabled = enabled;
  },

  // 日志输出函数
  log: function (...args) {
    if (this.enabled) {
      console.log(...args);
    }
  },

  // 错误日志输出函数
  error: function (...args) {
    if (this.enabled) {
      console.error(...args);
    }
  },

  // 警告日志输出函数
  warn: function (...args) {
    if (this.enabled) {
      console.warn(...args);
    }
  },

  // 调试日志输出函数
  debug: function (...args) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  },
};

const mvuConverter = {
  // --- 配置项 ---
  VERSION: '8.620 (对象键仅在存在注释时才输出注释)', //{8.620}: 不为无注释对象键添加默认注释
  // 8.045版本修改：移除零宽空格，简化YAML输出格式
  ROOT_VARIABLE_NAME: 'stat_data', // SillyTavern中变量的根路径名
  WI_JSON_KEY: '[InitVar]', // 世界书中用于存放JSON数据的条目关键词
  WI_YAML_KEY: '[InitVar_YAML]', // 世界书中用于存放Yaml描述的条目关键词

  // 8.0版本修改：模块状态管理 - 每次点击都重新初始化
  isModuleLoaded: false, // 模块是否已加载
  eventListeners: [], // 存储事件监听器引用
  domElements: [], // 存储DOM元素引用

  // 7.83版本修改：缓存最新消息ID，用于DOM操作赋值
  cachedLastMessageId: null,

  // 8.038版本修改：缓存转换后的JSON数据
  convertedJsonData: null, // 缓存转换后的JSON数据，用于赋值操作（保留实例）
  convertedStructureData: null, // 缓存转换后的结构数据，用于显示（删除实例）
  // v8.321: 缓存原始输入数据，用于YAML生成
  originalInputData: null, // 缓存原始输入数据，用于生成完整的YAML模板
  currentEditTarget: null, // 当前编辑的目标元素ID
  // v8.517: 输入框焦点时的快照，用于判断是否修改 //8.517: 新增用于变更检测
  _inputSnapshotOnFocus: '', // v8.517: 记录mvu-input获取焦点时的内容
  // v8.619: 缓存原始YAML世界书内容，用于"隐藏代码"功能兼容 //{8.619}: 兼容隐藏代码功能
  _originalWorldBookYaml: '', // v8.619: 缓存原始世界书YAML内容

  // 8.034版本修改：动态缓存破坏和版本管理
  BUILD_TIME: Date.now(), // 构建时间戳，用于缓存破坏
  CACHE_BUSTER: Math.random().toString(36).substring(7), // 随机缓存破坏符

  /**
   * 8.031版本修改：版本检查函数
   * @private
   */
  checkVersion: function () {
    Logger.log(`[MVU Converter] 版本检查:`);
    Logger.log(`  - 当前版本: ${this.VERSION}`);
    Logger.log(`  - 构建时间: ${new Date(this.BUILD_TIME).toLocaleString()}`);
    Logger.log(`  - 缓存破坏符: ${this.CACHE_BUSTER}`);
    Logger.log(`  - 页面URL: ${window.location.href}`);
    Logger.log(`  - 用户代理: ${navigator.userAgent.substring(0, 100)}...`);
  },

  /**
   * 8.033版本修改：生成唯一的变量名 - 支持中文和英文
   * @private
   * @param {Array} path 路径数组
   * @returns {string} 唯一的变量名
   */
  generateUniqueVariableName: function (path) {
    // 尝试使用中文变量名
    const chineseVar = `items_${path.join('_')}`;

    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fff]/.test(chineseVar);

    if (hasChinese) {
      // 如果有中文，直接使用中文变量名
      return chineseVar;
    } else {
      // 如果全是英文，使用原来的逻辑
      return `items_${path.join('_').replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
  },

  /**
   * 8.039版本修改：创建保留实例的完整数据版本
   * @private
   * @param {Object} inputJson 原始输入JSON
   * @returns {Object} 保留实例的完整数据
   */
  createFullDataVersion: function (inputJson) {
    Logger.log('[MVU Converter] 开始创建完整数据版本...');

    // 深拷贝原始数据
    const fullData = structuredClone(inputJson);

    // 递归处理，保留增删列表中的实例
    this.processFullData(fullData);

    Logger.log('[MVU Converter] 完整数据版本创建完成:', fullData);
    return fullData;
  },

  /**
   * 8.042版本修改：调试函数 - 检查数据结构中的$meta.extensible
   * @private
   * @param {Object} data 要检查的数据
   */
  debugExtensibleMeta: function (data) {
    Logger.log('[MVU Converter] 调试：开始检查数据结构中的$meta.extensible');

    const checkNode = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.$meta) {
        Logger.log(`[MVU Converter] 调试：在路径 "${path}" 发现$meta:`, obj.$meta);
        if (obj.$meta.extensible !== undefined) {
          Logger.log(
            `[MVU Converter] 调试：在路径 "${path}" 发现$meta.extensible: ${obj.$meta.extensible} (类型: ${typeof obj
              .$meta.extensible})`,
          );
        }
      }

      for (const key in obj) {
        if (key === '$meta') continue;
        const newPath = path ? `${path}.${key}` : key;
        checkNode(obj[key], newPath);
      }
    };

    checkNode(data);
    Logger.log('[MVU Converter] 调试：$meta.extensible检查完成');
  },

  /**
   * 8.2版本修改：递归处理完整数据，保留实例
   * 统一处理可增删列表结构，不再区分extensible和recursiveExtensible
   * @private
   * @param {Object} node 当前节点
   */
  processFullData: function (node) {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      return;
    }

    for (const key in node) {
      if (key === '$meta') continue;

      const value = node[key];

      // 8.2版本修改：统一处理可增删列表逻辑

      // 1. 有明确$meta标识的可增删列表（统一识别）
      if (value.$meta && (value.$meta.extensible || value.$meta.recursiveExtensible)) {
        Logger.log(`[MVU Converter] 处理明确标识的可增删列表: ${key}, $meta:`, value.$meta);
        // 已经有$meta，直接递归处理子节点即可
        this.processFullData(value);
      }
      // 2. 无$meta但智能识别为可增删列表的情况
      else if (this.isExtensibleListStructure(value, this.getDescriptionForKey(key, node))) {
        Logger.log(`[MVU Converter] 智能识别为可增删列表: ${key}`);

        // 8.2版本修改：统一设置为extensible，不再区分类型
        value.$meta = { extensible: true };
        Logger.log(`[MVU Converter] 设置可增删列表$meta: ${key}`);

        // 递归处理子节点
        this.processFullData(value);
      }
      // 3. 普通对象
      else if (typeof value === 'object' && value !== null) {
        // 普通对象，递归处理
        this.processFullData(value);
      }
    }
  },

  /**
   * v8.416: 移除数据中的$meta属性，用于赋值操作
   * 确保赋值给其他模块的数据不包含内部元数据
   * @private
   * @param {Object} data - 要处理的数据
   * @returns {Object} 移除$meta属性后的数据
   */
  removeMetaProperties: function (data) {
    Logger.log('[MVU Converter] 开始移除$meta属性...');

    // 深拷贝数据，避免修改原始数据
    const cleanedData = structuredClone(data);

    // 递归移除$meta属性
    const removeMeta = node => {
      if (typeof node !== 'object' || node === null || Array.isArray(node)) {
        return;
      }

      // 移除当前节点的$meta属性
      if (node.$meta) {
        delete node.$meta;
        Logger.log('[MVU Converter] 已移除$meta属性');
      }

      // 递归处理所有子节点
      for (const key in node) {
        if (key === '$meta') continue; // 跳过已处理的$meta
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
          removeMeta(value);
        }
      }
    };

    removeMeta(cleanedData);
    Logger.log('[MVU Converter] $meta属性移除完成');
    return cleanedData;
  },

  /**
   * 8.03版本修改：显示转换器的主界面 (Modal窗口)
   * 这是模块的唯一公共入口点，现在每次点击都强制重新初始化。
   */
  showModal: async function () {
    Logger.log('[MVU Converter] 接口触发：showModal()');

    // 8.034版本修改：每次调用都更新缓存破坏值
    this.BUILD_TIME = Date.now();
    this.CACHE_BUSTER = Math.random().toString(36).substring(7);

    Logger.log(`[MVU Converter] 当前代码版本: ${this.VERSION}`);
    Logger.log(`[MVU Converter] 构建时间: ${new Date(this.BUILD_TIME).toLocaleString()}`);
    Logger.log(`[MVU Converter] 缓存破坏符: ${this.CACHE_BUSTER}`);

    // 8.034版本修改：添加URL缓存破坏参数（仅在安全环境下）
    try {
      const currentUrl = new URL(window.location.href);
      // 只在非iframe环境下修改URL
      if (currentUrl.protocol !== 'about:' && currentUrl.hostname !== 'about') {
        currentUrl.searchParams.set('_t', Date.now());
        currentUrl.searchParams.set('_v', this.CACHE_BUSTER);
        if (window.history.replaceState) {
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    } catch (error) {
      Logger.warn('[MVU Converter] URL缓存破坏失败（在iframe环境中），这是正常的:', error.message);
    }

    // 8.031版本修改：执行版本检查
    this.checkVersion();

    // 8.031版本修改：强制重新初始化模块
    Logger.log('[MVU Converter] 分支逻辑：强制重新初始化模块。');

    // 强制卸载模块，无论是否已加载
    Logger.log('[MVU Converter] 分支逻辑：强制卸载模块。');
    this.unloadModule();

    // 清除可能的缓存
    Logger.log('[MVU Converter] 分支逻辑：清除缓存。');
    if (typeof window.parent !== 'undefined' && window.parent.document) {
      const parentDoc = window.parent.document;
      const oldModal = parentDoc.getElementById('mvu-converter-modal');
      if (oldModal) {
        Logger.log('[MVU Converter] 分支逻辑：移除旧的Modal元素。');
        oldModal.remove();
      }
    }

    // 8.031版本修改：强制清除浏览器缓存
    Logger.log('[MVU Converter] 分支逻辑：强制清除浏览器缓存。');
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('mvu') || cacheName.includes('converter')) {
            await caches.delete(cacheName);
            Logger.log(`[MVU Converter] 分支逻辑：清除缓存: ${cacheName}`);
          }
        }
      } catch (error) {
        Logger.warn('[MVU Converter] 清除缓存失败:', error);
      }
    }

    // 重新初始化整个模块
    Logger.log('[MVU Converter] 分支逻辑：开始初始化模块。');
    await this.initializeModule();
    Logger.log('[MVU Converter] 接口结束：showModal() - 模块强制重新初始化完成');
  },

  /**
   * 8.0版本修改：模块初始化函数
   * @private
   */
  initializeModule: async function () {
    Logger.log('[MVU Converter] 接口触发：initializeModule()');

    // 8.044版本新增：测试环境屏蔽
    if (typeof module !== 'undefined' && module.exports) {
      Logger.log('[MVU Converter] Node.js测试环境检测到，跳过UI初始化。');
      return;
    }

    const parentDoc = window.parent.document;

    try {
      // 第一阶段：创建CSS样式
      Logger.log('[MVU Converter] 分支逻辑：创建CSS样式。');
      const style = parentDoc.createElement('style');
      style.textContent = `
            #mvu-converter-modal { display: flex; justify-content: center; align-items: center; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); }
            .mvu-modal-content { background-color: #2e2e3e; margin: auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 1200px; border-radius: 8px; color: #eee; display: flex; flex-direction: column; gap: 15px; aspect-ratio: 16/10; max-height: 80%; position: relative; }
            .mvu-modal-content h2 { text-align: center; border-bottom: 1px solid #555; padding-bottom: 10px; margin-top: 0; }
            .mvu-modal-content textarea, .mvu-modal-content pre { width: 100%; background-color: #1e1e2e; color: #ddd; border: 1px solid #555; border-radius: 4px; padding: 10px; box-sizing: border-box; font-family: monospace; }
            .mvu-input-section { flex: 1; display: flex; flex-direction: column; min-height: 150px; }
            .mvu-input-section textarea { flex-grow: 1; resize: vertical; }
            .mvu-input-label-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .mvu-input-controls { display: flex; align-items: center; gap: 5px; }
            .mvu-results-section { display: none; flex: 2; gap: 20px; min-height: 0; }
            .mvu-output-column { flex: 1; display: flex; flex-direction: column; min-height: 0; }
            .mvu-output-column h3 { display: flex; justify-content: center; align-items: center; margin: 0 0 10px 0; }
            .mvu-output-column .mvu-wi-status { font-size: 0.8em; margin-left: 8px; font-style: italic; }
            .mvu-output-column pre { flex-grow: 1; overflow: auto; white-space: pre-wrap; word-break: break-all; }
            .mvu-copy-btn { margin-left: 10px; padding: 5px 10px; font-size: 12px; cursor: pointer; border: 1px solid #666; background-color: #444; color: #eee; border-radius: 4px; transition: background-color 0.2s; }
            .mvu-copy-btn:hover { background-color: #555; }
            .mvu-copy-btn.success { background-color: #28a745; color: white; border-color: #28a745; }
            .mvu-edit-btn { margin-left: 5px; padding: 5px 8px; font-size: 12px; cursor: pointer; border: 1px solid #666; background-color: #444; color: #eee; border-radius: 4px; transition: background-color 0.2s; }
            .mvu-edit-btn:hover { background-color: #555; }
            .mvu-edit-btn:active { background-color: #666; }
            .mvu-button-bar { display: flex; justify-content: center; align-items: center; gap: 20px; }
            .mvu-button-bar button { padding: 10px 20px; color: white; border: none; border-radius: 5px; cursor: pointer; }
            #mvu-convert-btn { background-color: #4a90e2; }
            #mvu-clear-btn { background-color: #c94c4c; }
            #mvu-close-btn { background-color: #777; }
            #mvu-assign-btn { background-color: #6c757d; }
            #mvu-assign-btn:hover { background-color: #5a6268; }
            #mvu-assign-btn:disabled { background-color: #495057; cursor: not-allowed; }
            #mvu-wi-sync-container { display: none; }
            #mvu-status-bar { margin-top: 10px; text-align: center; color: #ccc; min-height: 1.2em; font-style: italic; }
            #mvu-status-bar.error { color: #dc3545; }
            .mvu-close-x-btn { position: absolute; top: 10px; right: 15px; width: 30px; height: 30px; background-color: #dc3545; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
            .mvu-close-x-btn:hover { background-color: #c82333; }
            .mvu-edit-overlay { display: none; position: absolute; z-index: 10001; background-color: rgba(0,0,0,0.8); border-radius: 8px; overflow: visible; }
            .mvu-edit-content { background-color: #2e2e3e; padding: 20px; border: 2px solid #4a90e2; border-radius: 8px; color: #eee; display: flex; flex-direction: column; position: relative; box-shadow: 0 5px 20px rgba(0,0,0,0.5); height: 100%; box-sizing: border-box; }
            .mvu-edit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #555; padding-bottom: 12px; }
            .mvu-edit-title { font-size: 20px; font-weight: bold; }
            .mvu-edit-header-controls { display: flex; align-items: center; gap: 10px; }
            .mvu-edit-close { background-color: #dc3545; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 18px; }
            .mvu-edit-close:hover { background-color: #c82333; }
            .mvu-edit-textarea { flex: 1; background-color: #1e1e2e; color: #ddd; border: 1px solid #555; border-radius: 4px; padding: 15px; font-family: monospace; font-size: 15px; resize: none; min-height: 300px; }
            .mvu-edit-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 15px; }
            .mvu-edit-btn-save { background-color: #28a745; color: white; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; font-size: 16px; }
            .mvu-edit-btn-save:hover { background-color: #218838; }
            .mvu-edit-btn-cancel { background-color: #6c757d; color: white; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; font-size: 16px; }
            .mvu-edit-btn-cancel:hover { background-color: #5a6268; }
            
            .mvu-edit-controls {
                margin: 10px 0;
                padding: 8px;
                background: #3e3e4e;
                border-radius: 4px;
                border: 1px solid #555;
            }
            
            .mvu-edit-header .mvu-edit-controls {
                margin: 0;
                padding: 4px 8px;
                background: transparent;
                border: none;
            }
            
            .mvu-output-controls {
                margin-bottom: 10px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            
            .mvu-output-column h3 .mvu-output-controls {
                margin: 0;
                padding: 4px 8px;
                background: transparent;
                border: none;
                vertical-align: middle;
            }

            .mvu-checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
                user-select: none;
            }

            .mvu-checkbox {
                margin-right: 8px;
                width: 16px;
                height: 16px;
                cursor: pointer;
            }

            .mvu-checkbox-text {
                color: #333;
                font-weight: 500;
            }
            
            .mvu-edit-controls .mvu-checkbox-text {
                color: #eee;
            }
            
            .mvu-output-column h3 .mvu-checkbox-text {
                color: #eee;
            }

            .yaml-output {
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 12px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 13px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
                max-height: 400px;
                overflow-y: auto;
                color: #333;
            }
        `;
      parentDoc.head.appendChild(style);
      this.domElements.push(style);

      // 第二阶段：创建Modal DOM结构
      Logger.log('[MVU Converter] 分支逻辑：创建Modal DOM结构。');
      const modal = parentDoc.createElement('div');
      modal.id = 'mvu-converter-modal';
      modal.innerHTML = `
            <div class="mvu-modal-content">
                <button class="mvu-close-x-btn" id="mvu-close-x-btn" title="关闭">×</button>
                <h2>MVU 变量转换器 v${this.VERSION} (构建时间: ${new Date(this.BUILD_TIME).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })})</h2>
                <div class="mvu-input-section">
                    <div class="mvu-input-label-container">
                        <label for="mvu-input">输入stat_data格式JSON数据:</label>
                        <div class="mvu-input-controls">
                            <button class="mvu-copy-btn" id="mvu-copy-input-btn" data-target="mvu-input">复制</button>
                            <button class="mvu-edit-btn" data-target="mvu-input" title="编辑">✏️</button>
                        </div>
                    </div>
                    <textarea id="mvu-input" placeholder="在此处粘贴包含 [数据, '描述'] 格式的JSON..."></textarea>
                </div>
                <div class="mvu-button-bar">
                    <!-- v8.617: 新版输入专用复选框：在赋值按钮左侧，用于开关"对比世界书YAML补齐"，默认勾选；仅新版时显示 -->
                    <div id="mvu-compare-wi-container" style="display: none; vertical-align: middle; margin-right: 8px;">
                        <input type="checkbox" id="mvu-compare-wi-checkbox" style="vertical-align: middle;" checked>
                        <label for="mvu-compare-wi-checkbox" style="vertical-align: middle;">对比世界书YAML补齐</label>
                    </div>
                    <button id="mvu-assign-btn">赋值最新楼层+Chat变量</button>
                    <button id="mvu-convert-btn">开始转换</button>
                    <button id="mvu-clear-btn">清空输入</button>
                    <div id="mvu-wi-sync-container">
                        <input type="checkbox" id="mvu-update-wi-checkbox" style="vertical-align: middle;">
                        <label for="mvu-update-wi-checkbox" style="vertical-align: middle;">同时更新世界书</label>
                    </div>
                    <button id="mvu-refresh-btn" style="background-color: #ffc107; color: #000; display: none;">强制刷新</button>
                    <button id="mvu-close-btn">关闭</button>
                </div>
                <div id="mvu-results" class="mvu-results-section">
                    <div class="mvu-output-column">
                        <h3>新版JSON结构<span class="mvu-wi-status" id="mvu-wi-status-json" style="display:none;"></span>
                            <button class="mvu-copy-btn" data-target="mvu-output-json">复制</button>
            <button class="mvu-edit-btn" data-target="mvu-output-json" title="编辑">✏️</button>
            <button class="mvu-copy-btn" id="mvu-use-input-structure-btn" title="将输入数据转为结构填入InitVar">重置为输入数据的数据结构</button>
            <!-- v8.414: 新增按钮，使用输入数据的结构更新InitVar输出 -->
                        </h3>
                        <pre id="mvu-output-json" contenteditable="true"></pre>
                    </div>
                    <div class="mvu-output-column">
                        <h3>变量描述 (YAML)<span class="mvu-wi-status" id="mvu-wi-status-md" style="display:none;"></span>
                            <button class="mvu-copy-btn" data-target="mvu-output-yaml">复制</button>
                            <button class="mvu-edit-btn" data-target="mvu-output-yaml" title="编辑">✏️</button>
                            <div class="mvu-output-controls" style="display: inline-block; margin-left: 10px;">
                                <label class="mvu-checkbox-label">
                                    <input type="checkbox" id="hide-code-checkbox" class="mvu-checkbox">
                                    <span class="mvu-checkbox-text">隐藏代码部分</span>
                                </label>
                            </div>
                        </h3>
                        <pre id="mvu-output-yaml" contenteditable="true" class="yaml-output"></pre>
                    </div>
                </div>
                <div id="mvu-status-bar"></div>
            </div>
        `;

      // 添加编辑覆盖层
      const editOverlay = parentDoc.createElement('div');
      editOverlay.id = 'mvu-edit-modal';
      editOverlay.className = 'mvu-edit-overlay';
      editOverlay.innerHTML = `
            <div class="mvu-edit-content">
                <div class="mvu-edit-header">
                    <div class="mvu-edit-title" id="mvu-edit-title">编辑内容</div>
                    <div class="mvu-edit-header-controls">
                        <div class="mvu-edit-controls" id="mvu-edit-controls" style="display: none;">
                            <label class="mvu-checkbox-label">
                                <input type="checkbox" id="mvu-edit-hide-code-checkbox" class="mvu-checkbox">
                                <span class="mvu-checkbox-text">隐藏代码部分</span>
                            </label>
                        </div>
                        <button class="mvu-edit-close" id="mvu-edit-close">×</button>
                    </div>
                </div>
                <textarea class="mvu-edit-textarea" id="mvu-edit-textarea" placeholder="在此处编辑内容..."></textarea>
                <div class="mvu-edit-footer">
                    <button class="mvu-edit-btn-save" id="mvu-edit-btn-save">保存</button>
                    <button class="mvu-edit-btn-cancel" id="mvu-edit-btn-cancel">取消</button>
                </div>
            </div>
        `;
      parentDoc.body.appendChild(editOverlay);
      this.domElements.push(editOverlay);
      parentDoc.body.appendChild(modal);
      this.domElements.push(modal);

      // 第三阶段：绑定事件监听器
      Logger.log('[MVU Converter] 分支逻辑：绑定事件监听器。');
      this.bindEventListeners(parentDoc, modal);

      // 第四阶段：加载默认数据
      Logger.log('[MVU Converter] 分支逻辑：加载默认数据。');
      await this.loadDefaultInputValue();

      // 设置模块为已加载状态
      this.isModuleLoaded = true;
      Logger.log(`[MVU Converter] 日志：模块初始化完成，当前版本: ${this.VERSION}`);
      Logger.log('[MVU Converter] 接口结束：initializeModule()');
    } catch (error) {
      Logger.error('[MVU Converter] 模块初始化失败:', error);
      // 如果初始化失败，清理已创建的元素
      this.unloadModule();
      throw error;
    }
  },

  /**
   * 8.0版本修改：绑定事件监听器
   * @private
   * @param {Document} parentDoc - 父文档对象
   * @param {HTMLElement} modal - Modal元素
   */
  bindEventListeners: function (parentDoc, modal) {
    Logger.log('[MVU Converter] 接口触发：bindEventListeners()');

    // 关闭Modal的事件处理
    const closeModal = () => {
      Logger.log('[MVU Converter] 分支逻辑：关闭Modal，开始卸载模块。');
      this.unloadModule();
    };

    // 8.0版本修改：使用mousedown/mouseup事件组合实现完整点击检测
    let mouseDownTarget = null;

    const modalMouseDownListener = event => {
      if (event.target === modal) {
        mouseDownTarget = event.target;
        Logger.log('[MVU Converter] 分支逻辑：鼠标在弹窗背景按下');
      }
    };
    modal.addEventListener('mousedown', modalMouseDownListener);
    this.eventListeners.push({ element: modal, event: 'mousedown', listener: modalMouseDownListener });

    const modalMouseUpListener = event => {
      if (mouseDownTarget === modal && event.target === modal) {
        Logger.log('[MVU Converter] 分支逻辑：在弹窗背景完成完整点击，关闭Modal');
        closeModal();
      }
      mouseDownTarget = null; // 重置状态
    };
    modal.addEventListener('mouseup', modalMouseUpListener);
    this.eventListeners.push({ element: modal, event: 'mouseup', listener: modalMouseUpListener });

    const closeBtnListener = closeModal;
    parentDoc.getElementById('mvu-close-btn').addEventListener('click', closeBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-close-btn'),
      event: 'click',
      listener: closeBtnListener,
    });

    const closeXBtnListener = closeModal;
    parentDoc.getElementById('mvu-close-x-btn').addEventListener('click', closeXBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-close-x-btn'),
      event: 'click',
      listener: closeXBtnListener,
    });

    const convertBtnListener = this.handleConversion.bind(this);
    parentDoc.getElementById('mvu-convert-btn').addEventListener('click', convertBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-convert-btn'),
      event: 'click',
      listener: convertBtnListener,
    });

    const assignBtnListener = this.handleAssignToLatest.bind(this);
    parentDoc.getElementById('mvu-assign-btn').addEventListener('click', assignBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-assign-btn'),
      event: 'click',
      listener: assignBtnListener,
    });

    const clearBtnListener = () => {
      parentDoc.getElementById('mvu-input').value = '';
    };
    parentDoc.getElementById('mvu-clear-btn').addEventListener('click', clearBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-clear-btn'),
      event: 'click',
      listener: clearBtnListener,
    });

    // 8.034版本修改：强制刷新按钮事件 - 增强缓存清除
    const refreshBtnListener = async () => {
      Logger.log('[MVU Converter] 强制刷新按钮被点击');

      // 强制清除所有可能的缓存
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            Logger.log(`[MVU Converter] 强制刷新：清除缓存: ${cacheName}`);
          }
        } catch (error) {
          Logger.warn('[MVU Converter] 强制刷新：清除缓存失败:', error);
        }
      }

      // 强制重新加载模块
      this.showModal();
    };
    parentDoc.getElementById('mvu-refresh-btn').addEventListener('click', refreshBtnListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-refresh-btn'),
      event: 'click',
      listener: refreshBtnListener,
    });

    // 复制按钮事件
    parentDoc.querySelectorAll('.mvu-copy-btn').forEach(button => {
      const copyListener = event => this.copyContent(event.target);
      button.addEventListener('click', copyListener);
      this.eventListeners.push({ element: button, event: 'click', listener: copyListener });
    });

    // 编辑按钮事件
    parentDoc.querySelectorAll('.mvu-edit-btn').forEach(button => {
      const editListener = event => this.showEditModal(event.target);
      button.addEventListener('click', editListener);
      this.eventListeners.push({ element: button, event: 'click', listener: editListener });
    });

    // v8.414: "InitVar使用输入数据的数据结构格式"按钮事件
    const useInputStructureBtn = parentDoc.getElementById('mvu-use-input-structure-btn');
    if (useInputStructureBtn) {
      const useInputStructureListener = () => {
        try {
          const inputEl = parentDoc.getElementById('mvu-input');
          const jsonOutEl = parentDoc.getElementById('mvu-output-json');
          if (!inputEl || !jsonOutEl) return;
          const inputText = inputEl.value || '';
          if (!inputText.trim()) return;
          const parsed = JSON.parse(inputText);
          const structured = this.convertToJsonStructure(parsed);
          jsonOutEl.textContent = JSON.stringify(structured, null, 2);
          const resultsDiv = parentDoc.getElementById('mvu-results');
          if (resultsDiv) resultsDiv.style.display = 'flex';
        } catch (err) {
          Logger.error('[MVU Converter] 使用输入数据结构更新InitVar失败:', err);
        }
      };
      useInputStructureBtn.addEventListener('click', useInputStructureListener);
      this.eventListeners.push({ element: useInputStructureBtn, event: 'click', listener: useInputStructureListener });
    }

    // v8.517: 输入框焦点与失焦事件，用于检测修改并在新版JSON时补齐YAML字段与同步顺序
    const inputEl = parentDoc.getElementById('mvu-input'); // v8.517: 绑定输入框事件
    if (inputEl) {
      const inputFocusListener = () => {
        // v8.517: 记录焦点时快照 //8.517: 记录焦点时用于比较
        this._inputSnapshotOnFocus = inputEl.value || '';
      };
      inputEl.addEventListener('focus', inputFocusListener);
      this.eventListeners.push({ element: inputEl, event: 'focus', listener: inputFocusListener });

      const inputBlurListener = () => {
        try {
          const current = inputEl.value || '';
          // v8.517: 未变化则不处理 //8.517: 避免不必要的计算
          if (current === this._inputSnapshotOnFocus) return;

          // v8.617: 仅在界面2（转换后）才执行失焦同步逻辑 //{8.617}: 界面1不触发
          const parentDocRef = window.parent.document; //{8.618}: 将定义提前，避免未初始化引用
          const resultsDiv = parentDocRef.getElementById('mvu-results');
          if (!resultsDiv || resultsDiv.style.display === 'none') return;

          // v8.517: 仅用数据结构判断，不使用语义文本 //8.517: 按规则禁止语义判断
          const parsed = JSON.parse(current);
          const version = this.detectJsonVersion(parsed);
          if (version !== 'new') {
            // 旧版隐藏新版专用复选框容器 //{8.617}
            const ctn = window.parent.document.getElementById('mvu-compare-wi-container');
            if (ctn) ctn.style.display = 'none';
            return; // 仅在新版JSON时执行
          }

          //{8.618}: parentDocRef已提前定义
          const yamlEl = parentDocRef.getElementById('mvu-output-yaml');
          if (!yamlEl) return;

          // 新版显示新版专用复选框容器 //{8.617}
          const compareWiContainer = parentDocRef.getElementById('mvu-compare-wi-container');
          if (compareWiContainer) compareWiContainer.style.display = 'inline-block';

          // v8.617: 若用户勾选"对比世界书YAML补齐"，先以世界书YAML作为基准进行比较；否则使用本地现有YAML
          const compareCheckbox = parentDocRef.getElementById('mvu-compare-wi-checkbox');
          let baselineYaml = (yamlEl.textContent || '').toString();
          if (compareCheckbox && compareCheckbox.checked) {
            (async () => {
              try {
                const wiYaml = await this.getYamlFromWorldBook();
                if (wiYaml && typeof wiYaml === 'string' && wiYaml.trim()) {
                  baselineYaml = wiYaml;
                  // v8.619: 缓存原始世界书YAML内容，用于"隐藏代码"功能兼容 //{8.619}
                  this._originalWorldBookYaml = wiYaml;
                }
                const commentMap = this._extractYamlComments(baselineYaml);
                const newYaml = this._generateYamlPreserveCommentsAndOrder(parsed, commentMap);
                yamlEl.textContent = newYaml;
              } catch (err) {
                Logger.warn('[MVU Converter] v8.617: 读取世界书YAML比较失败，退回本地YAML基准', err);
                const commentMap = this._extractYamlComments(baselineYaml);
                const newYaml = this._generateYamlPreserveCommentsAndOrder(parsed, commentMap);
                yamlEl.textContent = newYaml;
              }
            })();
          } else {
            const commentMap = this._extractYamlComments(baselineYaml);
            const newYaml = this._generateYamlPreserveCommentsAndOrder(parsed, commentMap);
            yamlEl.textContent = newYaml;
          }

          // v8.517: 更新lastData，便于"隐藏代码"等功能复用数据
          this.lastData = parsed;
        } catch (e) {
          // v8.517: 忽略解析错误，交由后续手动转换时提示
          Logger.warn('[MVU Converter] v8.517: 输入失焦处理时解析或同步失败(已忽略)：', e);
        }
      };
      inputEl.addEventListener('blur', inputBlurListener);
      this.eventListeners.push({ element: inputEl, event: 'blur', listener: inputBlurListener });
    }

    // 世界书更新复选框事件
    const updateWiListener = event => this.checkWorldInfoStatus(event.target.checked);
    parentDoc.getElementById('mvu-update-wi-checkbox').addEventListener('change', updateWiListener);
    this.eventListeners.push({
      element: parentDoc.getElementById('mvu-update-wi-checkbox'),
      event: 'change',
      listener: updateWiListener,
    });

    // v8.617: 为"对比世界书YAML补齐"复选框绑定占位监听（保留事件队列，便于卸载） //{8.617}
    const compareWiCheckbox = parentDoc.getElementById('mvu-compare-wi-checkbox');
    if (compareWiCheckbox) {
      const noopListener = () => {};
      compareWiCheckbox.addEventListener('change', noopListener);
      this.eventListeners.push({ element: compareWiCheckbox, event: 'change', listener: noopListener });
    }

    // YAML输出模式复选框事件
    const hideCodeCheckbox = parentDoc.getElementById('hide-code-checkbox');
    if (hideCodeCheckbox) {
      const hideCodeListener = event => this.updateOutput(event.target.checked);
      hideCodeCheckbox.addEventListener('change', hideCodeListener);
      this.eventListeners.push({
        element: hideCodeCheckbox,
        event: 'change',
        listener: hideCodeListener,
      });
    }

    // 编辑弹窗事件
    const editModal = parentDoc.getElementById('mvu-edit-modal');
    const editCloseBtn = parentDoc.getElementById('mvu-edit-close');
    const editCancelBtn = parentDoc.getElementById('mvu-edit-btn-cancel');
    const editSaveBtn = parentDoc.getElementById('mvu-edit-btn-save');

    const closeEditModal = () => {
      const editOverlay = parentDoc.getElementById('mvu-edit-modal');
      if (editOverlay) {
        editOverlay.style.display = 'none';
      }
    };

    editCloseBtn.addEventListener('click', closeEditModal);
    editCancelBtn.addEventListener('click', closeEditModal);
    editSaveBtn.addEventListener('click', () => this.saveEditContent());

    // 8.0.001版本修改：编辑弹窗中复选框的事件监听器
    const editHideCodeCheckbox = parentDoc.getElementById('mvu-edit-hide-code-checkbox');
    if (editHideCodeCheckbox) {
      const editHideCodeListener = event => {
        // 同步主界面复选框状态
        const mainHideCodeCheckbox = parentDoc.getElementById('hide-code-checkbox');
        if (mainHideCodeCheckbox) {
          mainHideCodeCheckbox.checked = event.target.checked;
          // 触发主界面复选框的change事件
          const changeEvent = new Event('change', { bubbles: true });
          mainHideCodeCheckbox.dispatchEvent(changeEvent);
        }

        // 8.057版本修改：直接更新编辑弹窗中的textarea内容
        const editTextarea = parentDoc.getElementById('mvu-edit-textarea');
        if (editTextarea && this.lastData) {
          // v8.619: 编辑弹窗中也使用相同的注释基准逻辑，确保一致性 //{8.619}
          let baselineYaml = '';
          if (this._originalWorldBookYaml && this._originalWorldBookYaml.trim()) {
            baselineYaml = this._originalWorldBookYaml;
          } else {
            // 如果没有缓存的世界书YAML，使用当前输出内容作为基准
            const outputElement = parentDoc.getElementById('mvu-output-yaml');
            baselineYaml = outputElement ? outputElement.textContent || '' : '';
          }

          if (baselineYaml.trim()) {
            // 基于原始注释重新生成YAML，然后应用"隐藏代码"过滤
            const commentMap = this._extractYamlComments(baselineYaml);
            const newYaml = this._generateYamlPreserveCommentsAndOrder(this.lastData, commentMap);
            // 应用"隐藏代码"过滤
            const finalYaml = event.target.checked ? this.filterCodeSections(newYaml.split('\n')).join('\n') : newYaml;
            editTextarea.value = finalYaml;
          } else {
            // 回退到原有逻辑
            const yamlContent = this.generateUnifiedYamlOutput(this.lastData, event.target.checked);
            editTextarea.value = yamlContent;
          }
        }
      };
      editHideCodeCheckbox.addEventListener('change', editHideCodeListener);
      this.eventListeners.push({
        element: editHideCodeCheckbox,
        event: 'change',
        listener: editHideCodeListener,
      });
    }

    this.eventListeners.push(
      { element: editCloseBtn, event: 'click', listener: closeEditModal },
      { element: editCancelBtn, event: 'click', listener: closeEditModal },
      { element: editSaveBtn, event: 'click', listener: () => this.saveEditContent() },
    );

    Logger.log('[MVU Converter] 日志：事件监听器绑定完成。');
    Logger.log('[MVU Converter] 接口结束：bindEventListeners()');
  },

  /**
   * 尝试从上一次消息中加载变量作为默认输入
   * @private
   */
  loadDefaultInputValue: async function () {
    Logger.log('[MVU Converter] 接口触发：loadDefaultInputValue()');
    const parentDoc = window.parent.document;
    const statusBar = parentDoc.getElementById('mvu-status-bar');
    const inputTextArea = parentDoc.getElementById('mvu-input');

    try {
      statusBar.textContent = '正在加载最新消息的变量...';
      if (typeof getLastMessageId !== 'function' || typeof getVariables !== 'function') {
        throw new Error('无法访问SillyTavern的变量API函数。');
      }

      // 8.0版本修改：缓存最新消息ID，用于DOM操作赋值
      const lastMessageId = await getLastMessageId();
      this.cachedLastMessageId = lastMessageId;
      Logger.log(`[MVU Converter] 日志：最新消息ID已缓存: ${lastMessageId}`);
      Logger.log(`[MVU Converter] 获取到最新消息ID: ${lastMessageId}`);

      if (lastMessageId >= 0) {
        const messageVariables = await getVariables({ type: 'message', message_id: lastMessageId });
        if (messageVariables && messageVariables[this.ROOT_VARIABLE_NAME]) {
          const defaultData = messageVariables[this.ROOT_VARIABLE_NAME];
          inputTextArea.value = JSON.stringify(defaultData, null, 2);
          statusBar.textContent = '已成功加载最新楼层消息的变量作为默认值。';
        } else {
          statusBar.textContent = `最新楼层消息中未找到根变量 (${this.ROOT_VARIABLE_NAME})，请手动输入。`;
        }
      } else {
        statusBar.textContent = '未找到任何消息，请手动输入。';
      }
    } catch (error) {
      Logger.error('[MVU Converter] 加载默认值时出错:', error);
      statusBar.textContent = `加载默认值失败: ${error.message}`;
    }

    setTimeout(() => {
      if (statusBar.textContent.includes('加载') || statusBar.textContent.includes('找到')) {
        statusBar.textContent = '';
      }
    }, 4000);
    Logger.log('[MVU Converter] 接口结束：loadDefaultInputValue()');
  },

  /**
   * 8.03版本修改：模块卸载函数 - 增强清理能力
   * @private
   */
  unloadModule: function () {
    Logger.log('[MVU Converter] 接口触发：unloadModule()');

    // 8.044版本修改：Node.js环境检测，跳过DOM操作
    if (typeof module !== 'undefined' && module.exports) {
      Logger.log('[MVU Converter] Node.js环境检测到，跳过DOM清理操作。');
      // 只重置模块状态
      this.isModuleLoaded = false;
      this.eventListeners = [];
      this.domElements = [];
      this.cachedLastMessageId = null;
      Logger.log('[MVU Converter] 接口结束：unloadModule()');
      return;
    }

    const parentDoc = window.parent.document;

    try {
      // 第一阶段：清理数据和状态
      Logger.log('[MVU Converter] 分支逻辑：清理数据和状态。');
      this.resetModalState();

      // 第二阶段：移除所有事件监听器
      Logger.log('[MVU Converter] 分支逻辑：移除事件监听器。');
      this.eventListeners.forEach(({ element, event, listener }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, listener);
        }
      });

      // 第三阶段：移除所有DOM元素
      Logger.log('[MVU Converter] 分支逻辑：移除DOM元素。');
      this.domElements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // 8.03版本修改：第四阶段：强制清理所有相关元素
      Logger.log('[MVU Converter] 分支逻辑：强制清理所有相关元素。');
      const allRelatedElements = parentDoc.querySelectorAll(
        '#mvu-converter-modal, .mvu-modal-content, .mvu-close-x-btn',
      );
      allRelatedElements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // 第五阶段：重置模块状态
      Logger.log('[MVU Converter] 分支逻辑：重置模块状态。');
      this.isModuleLoaded = false;
      this.eventListeners = [];
      this.domElements = [];
      this.cachedLastMessageId = null;

      Logger.log('[MVU Converter] 日志：模块强制卸载完成，所有资源已清理。');
    } catch (error) {
      Logger.error('[MVU Converter] 模块卸载时发生错误:', error);
      // 即使出错也要重置状态
      this.isModuleLoaded = false;
      this.eventListeners = [];
      this.domElements = [];
      this.cachedLastMessageId = null;
    }
    Logger.log('[MVU Converter] 接口结束：unloadModule()');
  },

  /**
   * 8.0版本修改：重置并清理弹窗界面的所有状态
   * @private
   */
  resetModalState: function () {
    Logger.log('[MVU Converter] 接口触发：resetModalState()');

    // 8.044版本修改：Node.js环境检测，跳过DOM操作
    if (typeof module !== 'undefined' && module.exports) {
      Logger.log('[MVU Converter] Node.js环境检测到，跳过界面状态重置。');
      // 只清除缓存的最新消息ID
      this.cachedLastMessageId = null;
      Logger.log('[MVU Converter] 接口结束：resetModalState()');
      return;
    }

    const parentDoc = window.parent.document;

    try {
      const inputTextArea = parentDoc.getElementById('mvu-input');
      if (inputTextArea) inputTextArea.value = '';
      const jsonOutputArea = parentDoc.getElementById('mvu-output-json');
      if (jsonOutputArea) jsonOutputArea.textContent = '';
      const mdOutputArea = parentDoc.getElementById('mvu-output-yaml');
      if (mdOutputArea) mdOutputArea.textContent = '';
      const resultsDiv = parentDoc.getElementById('mvu-results');
      if (resultsDiv) resultsDiv.style.display = 'none';
      const updateWiCheckbox = parentDoc.getElementById('mvu-update-wi-checkbox');
      if (updateWiCheckbox) updateWiCheckbox.checked = false;
      const wiSyncContainer = parentDoc.getElementById('mvu-wi-sync-container');
      if (wiSyncContainer) wiSyncContainer.style.display = 'none';
      // v8.617: 重置并隐藏"对比世界书YAML补齐"复选框容器 //{8.617}
      const compareWiContainerReset = parentDoc.getElementById('mvu-compare-wi-container');
      if (compareWiContainerReset) {
        compareWiContainerReset.style.display = 'none';
        const cb = parentDoc.getElementById('mvu-compare-wi-checkbox');
        if (cb) cb.checked = true;
      }
      const jsonStatusEl = parentDoc.getElementById('mvu-wi-status-json');
      if (jsonStatusEl) jsonStatusEl.style.display = 'none';
      const mdStatusEl = parentDoc.getElementById('mvu-wi-status-md');
      if (mdStatusEl) mdStatusEl.style.display = 'none';
      const statusBar = parentDoc.getElementById('mvu-status-bar');
      if (statusBar) statusBar.textContent = '';

      // 8.0版本修改：清除缓存的最新消息ID
      this.cachedLastMessageId = null;
      Logger.log('[MVU Converter] 日志：界面状态和消息ID缓存已成功重置。');
    } catch (error) {
      Logger.error('[MVU Converter] 重置界面状态时发生错误:', error);
    }
    Logger.log('[MVU Converter] 接口结束：resetModalState()');
  },

  /**
   * 健壮地获取当前角色的主要世界书名称。
   * @private
   * @returns {Promise<string>} 世界书名称
   * @throws {Error} 如果API不可用或角色未绑定世界书
   */
  _getCharacterWorldBook: async function () {
    Logger.log('[MVU Converter] 接口触发：_getCharacterWorldBook()');

    if (typeof getCurrentCharPrimaryLorebook !== 'function') {
      Logger.error('[MVU Converter] 错误：核心API `getCurrentCharPrimaryLorebook` 不存在。');
      throw new Error('无法访问SillyTavern的世界书API。请检查您的SillyTavern版本。');
    }

    Logger.log('[MVU Converter] 分支逻辑：尝试使用 getCurrentCharPrimaryLorebook() API。');
    const bookName = await getCurrentCharPrimaryLorebook();

    if (bookName && typeof bookName === 'string') {
      Logger.log(`[MVU Converter] 日志：通过API成功获取世界书名称: ${bookName}`);
      return bookName;
    } else {
      Logger.warn('[MVU Converter] 警告：API返回为空，角色可能未绑定主要世界书。');
      throw new Error('当前角色未绑定或启用主要世界书。');
    }
  },

  /**
   * 检查世界书同步目标的状态并更新UI
   * @private
   */
  checkWorldInfoStatus: async function (isChecked) {
    Logger.log('[MVU Converter] 接口触发：checkWorldInfoStatus()');
    const parentDoc = window.parent.document;
    const jsonStatusEl = parentDoc.getElementById('mvu-wi-status-json');
    const mdStatusEl = parentDoc.getElementById('mvu-wi-status-md');

    if (!isChecked) {
      jsonStatusEl.style.display = 'none';
      mdStatusEl.style.display = 'none';
      return;
    }

    jsonStatusEl.style.display = 'inline';
    mdStatusEl.style.display = 'inline';
    jsonStatusEl.textContent = '检查中...';
    mdStatusEl.textContent = '检查中...';

    try {
      const bookName = await this._getCharacterWorldBook();

      Logger.log(`[MVU Converter] 分支逻辑：使用 getLorebookEntries API 加载世界书 '${bookName}'`);
      const entries = await getLorebookEntries(bookName);
      if (!entries) {
        throw new Error(`无法加载世界书 '${bookName}' 的条目。`);
      }

      // 7.7版本修改：将匹配逻辑从检查条目内容(content)改为检查条目注释/标题(comment)，以避免更新后关键词丢失。
      Logger.log(`[MVU Converter] 分支逻辑(7.7)：在条目注释(comment)中查找关键词。`);
      const jsonEntry = entries.find(e => e.comment.includes(this.WI_JSON_KEY));
      const yamlEntry = entries.find(e => e.comment.includes(this.WI_YAML_KEY));

      if (jsonEntry) {
        jsonStatusEl.textContent = `(《${jsonEntry.comment}》已找到)`;
        jsonStatusEl.style.color = '#28a745';
      } else {
        jsonStatusEl.textContent = `(未找到含《${this.WI_JSON_KEY}》条目!)`;
        jsonStatusEl.style.color = '#dc3545';
      }

      if (yamlEntry) {
        mdStatusEl.textContent = `(《${yamlEntry.comment}》已找到)`;
        mdStatusEl.style.color = '#28a745';
      } else {
        mdStatusEl.textContent = `(未找到含《${this.WI_YAML_KEY}》条目!)`;
        mdStatusEl.style.color = '#dc3545';
      }
    } catch (error) {
      Logger.error('[MVU Converter] 检查世界书状态时出错:', error);
      const errorText = `(检查失败: ${error.message})`;
      jsonStatusEl.textContent = errorText;
      mdStatusEl.textContent = errorText;
      jsonStatusEl.style.color = '#dc3545';
      mdStatusEl.style.color = '#dc3545';
    }
    Logger.log('[MVU Converter] 接口结束：checkWorldInfoStatus()');
  },

  /**
   * 显示编辑弹窗
   * @private
   * @param {HTMLElement} button - 编辑按钮
   */
  showEditModal: function (button) {
    Logger.log('[MVU Converter] 显示编辑覆盖层');
    const parentDoc = window.parent.document;
    const targetId = button.getAttribute('data-target');
    const targetElement = parentDoc.getElementById(targetId);
    const editOverlay = parentDoc.getElementById('mvu-edit-modal');
    const editTitle = parentDoc.getElementById('mvu-edit-title');
    const editTextarea = parentDoc.getElementById('mvu-edit-textarea');

    if (!targetElement) {
      Logger.error('[MVU Converter] 找不到目标元素:', targetId);
      return;
    }

    // 设置标题
    let title = '编辑内容';
    if (targetId === 'mvu-input') {
      title = '编辑输入JSON';
    } else if (targetId === 'mvu-output-json') {
      title = '编辑新版JSON结构';
    } else if (targetId === 'mvu-output-yaml') {
      title = '编辑变量描述 (Yaml)';
    }
    editTitle.textContent = title;

    // 获取当前内容
    let content = '';
    if (targetElement.tagName === 'TEXTAREA') {
      content = targetElement.value;
    } else {
      content = targetElement.textContent;
    }

    // 设置编辑内容
    editTextarea.value = content;
    editTextarea.focus();

    // 8.0.001版本修改：处理编辑弹窗中的复选框显示和状态同步
    const editControls = parentDoc.getElementById('mvu-edit-controls');
    const editHideCodeCheckbox = parentDoc.getElementById('mvu-edit-hide-code-checkbox');

    if (targetId === 'mvu-output-yaml') {
      // 显示复选框
      editControls.style.display = 'block';

      // 同步复选框状态
      const mainHideCodeCheckbox = parentDoc.getElementById('hide-code-checkbox');
      if (mainHideCodeCheckbox && editHideCodeCheckbox) {
        editHideCodeCheckbox.checked = mainHideCodeCheckbox.checked;
      }
    } else {
      // 隐藏复选框
      editControls.style.display = 'none';
    }

    // 计算目标元素的位置和尺寸
    const targetRect = targetElement.getBoundingClientRect();
    const modalRect = parentDoc.getElementById('mvu-converter-modal').getBoundingClientRect();

    // 根据主弹窗尺寸计算编辑面板的合适尺寸（占满大部分屏幕）
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;

    // 编辑面板占主弹窗的85%宽高
    const expandedWidth = Math.floor(modalWidth * 0.85);
    const expandedHeight = Math.floor(modalHeight * 0.85);

    // 计算居中位置（相对于主弹窗）
    const leftOffset = (modalWidth - expandedWidth) / 2;
    const topOffset = (modalHeight - expandedHeight) / 2;

    // 设置覆盖层的位置和尺寸，占满大部分主弹窗
    editOverlay.style.position = 'absolute';
    editOverlay.style.left = leftOffset + 'px';
    editOverlay.style.top = topOffset + 'px';
    editOverlay.style.width = expandedWidth + 'px';
    editOverlay.style.height = expandedHeight + 'px';
    editOverlay.style.display = 'block';

    // 存储目标元素ID
    this.currentEditTarget = targetId;
  },

  /**
   * 保存编辑内容
   * @private
   */
  saveEditContent: function () {
    Logger.log('[MVU Converter] 保存编辑内容');
    const parentDoc = window.parent.document;
    const editModal = parentDoc.getElementById('mvu-edit-modal');
    const editTextarea = parentDoc.getElementById('mvu-edit-textarea');
    const targetId = this.currentEditTarget;

    if (!targetId) {
      Logger.error('[MVU Converter] 没有当前编辑目标');
      return;
    }

    const targetElement = parentDoc.getElementById(targetId);
    if (!targetElement) {
      Logger.error('[MVU Converter] 找不到目标元素:', targetId);
      return;
    }

    // 保存内容
    const newContent = editTextarea.value;
    if (targetElement.tagName === 'TEXTAREA') {
      targetElement.value = newContent;
    } else {
      targetElement.textContent = newContent;
    }

    // 如果是JSON输出，尝试更新缓存数据
    if (targetId === 'mvu-output-json') {
      try {
        const jsonData = JSON.parse(newContent);
        this.convertedStructureData = jsonData;
        Logger.log('[MVU Converter] 已更新结构数据缓存');
      } catch (error) {
        Logger.warn('[MVU Converter] 更新的JSON格式无效:', error);
      }
    }

    // 关闭覆盖层
    const editOverlay = parentDoc.getElementById('mvu-edit-modal');
    if (editOverlay) {
      editOverlay.style.display = 'none';
    }
    this.currentEditTarget = null;

    // 显示成功提示
    if (typeof toastr !== 'undefined') {
      toastr.success('内容已保存', '编辑成功');
    }
  },

  /**
   * 健壮的复制功能实现
   * @private
   */
  copyContent: function (button) {
    Logger.log('[MVU Converter] 接口触发：copyContent()');
    const parentDoc = window.parent.document;
    const targetId = button.getAttribute('data-target');
    const targetElement = parentDoc.getElementById(targetId);

    const content =
      targetElement.tagName.toLowerCase() === 'textarea' ? targetElement.value : targetElement.textContent;

    const tempTextarea = parentDoc.createElement('textarea');
    tempTextarea.value = content;
    tempTextarea.style.position = 'absolute';
    tempTextarea.style.left = '-9999px';
    parentDoc.body.appendChild(tempTextarea);

    let success = false;
    try {
      tempTextarea.select();
      tempTextarea.focus();
      success = parentDoc.execCommand('copy');
    } catch (err) {
      Logger.error('[MVU Converter] 复制时发生错误:', err);
    }

    parentDoc.body.removeChild(tempTextarea);

    const originalText = button.textContent;
    if (success) {
      button.textContent = '复制成功!';
      button.classList.add('success');
    } else {
      button.textContent = '复制失败!';
    }

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('success');
    }, 2000);
    Logger.log('[MVU Converter] 接口结束：copyContent()');
  },

  /**
   * 转换逻辑和世界书更新的入口点
   * @private
   */
  handleConversion: async function () {
    Logger.log('[MVU Converter] 接口触发：handleConversion()');

    // 8.044版本修改：Node.js环境检测，跳过DOM操作
    if (typeof module !== 'undefined' && module.exports) {
      Logger.log('[MVU Converter] Node.js环境检测到，跳过DOM操作。');
      Logger.log('[MVU Converter] 接口结束：handleConversion()');
      return;
    }

    const parentDoc = window.parent.document;
    const inputTextArea = parentDoc.getElementById('mvu-input');
    const jsonOutputArea = parentDoc.getElementById('mvu-output-json');
    const mdOutputArea = parentDoc.getElementById('mvu-output-yaml');
    const resultsDiv = parentDoc.getElementById('mvu-results');
    const statusBar = parentDoc.getElementById('mvu-status-bar');
    const updateWiCheckbox = parentDoc.getElementById('mvu-update-wi-checkbox');
    const wiSyncContainer = parentDoc.getElementById('mvu-wi-sync-container');
    const compareWiContainer = parentDoc.getElementById('mvu-compare-wi-container'); // v8.617: 新版输入时显示对比选项

    statusBar.textContent = '';

    try {
      // 8.052版本修改：预处理输入，移除$meta属性但不更新输入窗口，保留原始数据
      const preprocessedInput = this.preprocessInput(inputTextArea.value);

      const inputJson = JSON.parse(preprocessedInput);

      // 8.1版本新增：检测JSON版本并选择处理逻辑
      // 8.1版本修复：使用原始输入进行版本检测，而不是预处理后的数据
      const originalInputJson = JSON.parse(inputTextArea.value);
      const version = this.detectJsonVersion(originalInputJson);
      Logger.log(`[MVU Converter] 分支逻辑：检测到JSON版本: ${version}`);

      let finalJsonString, finalYamlString; // v8.414: {版本}: 新版分支UI联动与世界书读取

      if (version === 'old') {
        // 旧版本处理逻辑
        Logger.log('[MVU Converter] 分支逻辑：执行旧版JSON转换逻辑');
        finalJsonString = await this.processOldVersion(inputJson);
        // v8.314: 直接使用统一接口生成YAML，无需依赖lastYaml
        finalYamlString = this.generateUnifiedYamlOutput(inputJson, false);
      } else if (version === 'new') {
        // 新版本处理逻辑
        Logger.log('[MVU Converter] 分支逻辑：执行新版JSON转换逻辑');
        // v8.415: 新版数据时，JSON和YAML都完全从世界书读取
        // v8.415: 新版数据时，JSON和YAML都完全从世界书读取
        try {
          const wiJson = await this.getJsonFromWorldBook(); // v8.414: {版本}: 从世界书读取JSON
          if (wiJson && typeof wiJson === 'string' && wiJson.trim()) {
            finalJsonString = wiJson; // v8.414: {版本}: 以世界书为准
          } else {
            finalJsonString = '未找到世界书InitVar内容';
            // v8.415: 新版数据时，如果世界书没有JSON内容，则使用输入数据的结构
            // const structured = this.convertToJsonStructure(inputJson);
            // finalJsonString = JSON.stringify(structured, null, 2);
          }
        } catch (_) {
          // v8.415: 异常时也使用输入数据的结构
          // const structured = this.convertToJsonStructure(inputJson);
          // finalJsonString = JSON.stringify(structured, null, 2);
        }
        // v8.415: 新版数据时，YAML也完全从世界书读取
        try {
          const wiYaml = await this.getYamlFromWorldBook();
          finalYamlString = wiYaml || '未找到世界书YAML内容';
        } catch (_) {
          finalYamlString = '未找到世界书YAML内容';
        }
      } else {
        // 未知版本处理，使用旧版逻辑作为后备
        Logger.log('[MVU Converter] 分支逻辑：执行未知版本转换逻辑，使用旧版逻辑作为后备');
        finalJsonString = await this.processOldVersion(inputJson);
        // v8.314: 直接使用统一接口生成YAML，无需依赖lastYaml
        finalYamlString = this.generateUnifiedYamlOutput(inputJson, false);
      }

      Logger.log('[MVU Converter] 调试：转换后的JSON数据:');
      Logger.log(finalJsonString);
      Logger.log('[MVU Converter] 调试：转换后的Yaml数据:');
      Logger.log(finalYamlString);

      jsonOutputArea.textContent = finalJsonString;
      // v8.414: 新版分支直接使用result.yamlString，其余分支仍用统一生成接口
      if (version === 'new') {
        mdOutputArea.textContent = finalYamlString; // v8.414
      } else {
        const unifiedYamlOutput = this.generateUnifiedYamlOutput(inputJson, false);
        mdOutputArea.textContent = unifiedYamlOutput;
      }
      resultsDiv.style.display = 'flex';
      wiSyncContainer.style.display = 'inline-block';

      // 8.051版本修改：转换成功后隐藏关闭按钮
      const closeBtn = parentDoc.getElementById('mvu-close-btn');
      if (closeBtn) {
        closeBtn.style.display = 'none';
      }

      Logger.log('[MVU Converter] 日志：核心转换流程成功结束。');

      if (version === 'new') {
        try {
          updateWiCheckbox.checked = true; // v8.414: {版本}: 默认勾选
          updateWiCheckbox.disabled = true; // v8.414: {版本}: 禁用
          this.checkWorldInfoStatus(true); // v8.414: {版本}: 刷新状态

          // v8.617: 新版输入时显示"对比世界书YAML补齐"复选框 //{8.617}
          if (compareWiContainer) compareWiContainer.style.display = 'inline-block';

          // 修改按钮文本与行为
          const convertBtn = parentDoc.getElementById('mvu-convert-btn');
          if (convertBtn) {
            convertBtn.textContent = '更新世界书格式'; // v8.414: {版本}
            // 移除旧监听器
            const idx = this.eventListeners.findIndex(ev => ev.element === convertBtn && ev.event === 'click');
            if (idx >= 0) {
              const old = this.eventListeners[idx];
              try {
                convertBtn.removeEventListener('click', old.listener);
              } catch (e) {
                Logger.warn('[MVU Converter] v8.414: 移除旧监听器失败(可忽略)', e);
              }
              this.eventListeners.splice(idx, 1);
            }
            // 仅更新世界书
            const updateOnlyListener = async () => {
              try {
                const jsonText = (parentDoc.getElementById('mvu-output-json')?.textContent || '').trim();
                const yamlText = (parentDoc.getElementById('mvu-output-yaml')?.textContent || '').trim();
                statusBar.textContent = '正在更新世界书...';
                await this.updateWorldInfo(jsonText, yamlText, statusBar);
              } catch (err) {
                Logger.error('[MVU Converter] 仅更新世界书流程失败:', err);
              }
            };
            convertBtn.addEventListener('click', updateOnlyListener);
            this.eventListeners.push({ element: convertBtn, event: 'click', listener: updateOnlyListener });
          }
        } catch (e) {
          Logger.warn('[MVU Converter] v8.414: 新版UI联动设置失败(可忽略)', e);
        }
      }

      if (updateWiCheckbox.checked && version !== 'new') {
        Logger.log('[MVU Converter] 分支逻辑：开始执行世界书更新。');
        statusBar.textContent = '正在更新世界书...';
        await this.updateWorldInfo(finalJsonString, finalYamlString, statusBar);
      }
    } catch (error) {
      Logger.error('[MVU Converter] 转换过程中发生错误:', error);
      statusBar.textContent = `错误: ${error.message}`;
      jsonOutputArea.textContent = `转换失败: ${error.message}`;
      mdOutputArea.textContent = `请检查输入的JSON格式是否正确。\n\n错误详情:\n${error.stack}`;
      resultsDiv.style.display = 'flex';
      wiSyncContainer.style.display = 'none';
    }
    Logger.log('[MVU Converter] 接口结束：handleConversion()');
  },

  /**
   * 8.1版本新增：处理旧版JSON数据转换
   * 8.059版本修改：确保与测试用例调用一致的接口，使用convertToJsonStructure生成纯结构数据
   * @private
   * @param {Object} inputJson - 输入的JSON数据
   * @returns {string} 转换后的JSON字符串
   */
  processOldVersion: async function (inputJson) {
    Logger.log('[MVU Converter] 接口触发：processOldVersion()');

    // 8.059版本修改：使用与测试用例一致的接口
    // 调用convertToJsonStructure生成纯结构数据（只保留$meta）
    const structureData = this.convertToJsonStructure(inputJson);

    // 保存结构数据引用用于后续YAML生成
    this.convertedStructureData = structureData;

    // 8.039版本修改：创建两个版本的数据
    // 1. 结构版本（用于显示）- 删除增删列表中的实例
    this.convertedStructureData = structureData;

    // 2. 完整版本（用于赋值）- 保留增删列表中的实例
    this.convertedJsonData = this.createFullDataVersion(inputJson);

    // v8.312: 使用统一YAML生成接口，确保与测试用例完全一致
    const unifiedYamlOutput = this.generateUnifiedYamlOutput(inputJson, false);

    // 保存数据引用用于后续YAML生成
    this.lastData = inputJson; // 保存原始输入数据，用于后续YAML生成
    // v8.314: 移除lastYaml赋值，因为现在直接使用generateUnifiedYamlOutput

    Logger.log('[MVU Converter] 已缓存结构数据（用于显示）:', this.convertedStructureData);
    Logger.log('[MVU Converter] 已缓存完整数据（用于赋值）:', this.convertedJsonData);

    const finalJsonString = JSON.stringify(this.convertedStructureData, null, 2);

    Logger.log('[MVU Converter] 接口结束：processOldVersion()');
    return finalJsonString;
  },

  /**
   * 8.1版本新增：处理新版JSON数据转换
   * @private
   * @param {Object} inputJson - 输入的JSON数据
   * @returns {Object} 包含jsonString和yamlString的对象
   */
  processNewVersion: async function (inputJson) {
    Logger.log('[MVU Converter] 接口触发：processNewVersion()');

    try {
      // 1. 从世界书获取YAML内容
      const yamlContent = await this.getYamlFromWorldBook();

      // 2. 处理增删列表结构（$meta、泛化实例）
      // 8.1版本新增：新版JSON基本复制到新版JSON结构窗口，但需要判断增删列表结构
      const processedJson = this.processNewVersionJson(inputJson);

      // 3. 输出到两个窗口
      const jsonString = JSON.stringify(processedJson, null, 2);
      const yamlString = yamlContent || '未找到世界书YAML内容';

      Logger.log('[MVU Converter] 接口结束：processNewVersion()');
      return { jsonString, yamlString };
    } catch (error) {
      Logger.error('[MVU Converter] 新版处理过程中发生错误:', error);
      throw error;
    }
  },

  /**
   * 8.1版本新增：处理新版JSON数据的增删列表结构
   * @private
   * @param {Object} inputJson - 输入的JSON数据
   * @returns {Object} 处理后的JSON数据
   */
  processNewVersionJson: function (inputJson) {
    Logger.log('[MVU Converter] 接口触发：processNewVersionJson()');

    // 8.1版本新增：新版JSON基本复制到新版JSON结构窗口，但需要判断增删列表结构
    // 使用现有的convertToJsonStructure函数来处理可增删列表结构，保持逻辑一致性
    const processedJson = this.convertToJsonStructure(inputJson);

    Logger.log('[MVU Converter] 接口结束：processNewVersionJson()');
    return processedJson;
  },

  /**
   * 8.1版本新增：从世界书获取YAML内容
   * @private
   * @returns {Promise<string>} YAML内容字符串
   */
  getYamlFromWorldBook: async function () {
    Logger.log('[MVU Converter] 接口触发：getYamlFromWorldBook()');

    try {
      // 获取当前角色的主要世界书
      const bookName = await this._getCharacterWorldBook();
      Logger.log(`[MVU Converter] 分支逻辑：获取世界书 '${bookName}' 的条目`);

      // 获取世界书条目
      const entries = await getLorebookEntries(bookName);
      if (!entries || entries.length === 0) {
        Logger.warn('[MVU Converter] 警告：世界书中没有找到条目');
        return null;
      }

      // 查找包含YAML内容的世界书条目
      // 8.1版本新增：使用新的YAML条目关键词
      for (const entry of entries) {
        if (entry.comment.includes(this.WI_YAML_KEY)) {
          Logger.log(`[MVU Converter] comment: ${entry.comment}`);
          return entry.content;
        }
      }

      Logger.warn('[MVU Converter] 警告：在世界书中未找到YAML条目');
      return null;
    } catch (error) {
      Logger.error('[MVU Converter] 获取世界书YAML内容时发生错误:', error);
      return null;
    }
  },

  /**
   * 7.8版本修改：将输入窗口的内容赋值给最新楼层的stat_data变量
   * @private
   */
  handleAssignToLatest: async function () {
    Logger.log('[MVU Converter] 接口触发：handleAssignToLatest()');

    // 8.044版本修改：Node.js环境检测，跳过DOM操作
    if (typeof module !== 'undefined' && module.exports) {
      Logger.log('[MVU Converter] Node.js环境检测到，跳过DOM操作。');
      Logger.log('[MVU Converter] 接口结束：handleAssignToLatest()');
      return;
    }

    const parentDoc = window.parent.document;
    const statusBar = parentDoc.getElementById('mvu-status-bar');
    const assignBtn = parentDoc.getElementById('mvu-assign-btn');
    const inputTextArea = parentDoc.getElementById('mvu-input');

    // v8.416: 优先使用输入窗口的当前数据，确保数据一致性
    let jsonData = null;

    if (!inputTextArea || !inputTextArea.value || inputTextArea.value.trim() === '') {
      Logger.log('[MVU Converter] 分支逻辑：输入窗口为空，显示错误提示。');
      statusBar.textContent = '错误：请先在输入窗口中输入JSON数据。';
      statusBar.classList.add('error');
      return;
    }

    // 优先使用输入窗口的当前数据，确保数据一致性
    Logger.log('[MVU Converter] 分支逻辑：使用输入窗口的当前数据，确保数据一致性。');
    const rawInputData = JSON.parse(inputTextArea.value);

    // 对输入数据进行必要的处理，确保在SillyTavern中正确识别可增删列表
    const processedData = this.createFullDataVersion(rawInputData);

    // v8.416: 赋值前移除$meta属性
    jsonData = this.removeMetaProperties(processedData);
    Logger.log(
      '[MVU Converter] 分支逻辑：已对输入数据进行必要处理，并在赋值前移除$meta属性，确保数据正确性且不影响其他模块。',
    );

    try {
      Logger.log('[MVU Converter] 分支逻辑：开始执行赋值操作。');
      statusBar.textContent = '正在赋值到最新楼层...';
      assignBtn.disabled = true;
      assignBtn.textContent = '赋值中...';

      // 检查运行环境
      Logger.log('[MVU Converter] 分支逻辑：检查运行环境...');
      if (typeof window.parent === 'undefined') {
        throw new Error('无法访问父窗口，可能不在iframe环境中运行。');
      }

      // 8.0版本修改：使用正确的变量设置API
      if (this.cachedLastMessageId === null || this.cachedLastMessageId < 0) {
        throw new Error('未找到任何消息，无法进行赋值操作。请重新打开弹窗。');
      }

      Logger.log(`[MVU Converter] 分支逻辑：使用缓存的最新消息ID: ${this.cachedLastMessageId}`);
      Logger.log('[MVU Converter] 分支逻辑：开始使用replaceVariables API进行赋值...');

      // 8.040版本修改：参考历史版本修复赋值逻辑
      let messageSuccess = false;
      let chatSuccess = false;

      // 检查必要的API函数
      if (typeof getLastMessageId !== 'function') {
        throw new Error('getLastMessageId 函数不可用');
      }

      if (typeof replaceVariables !== 'function') {
        throw new Error('replaceVariables 函数不可用');
      }

      // 获取最新消息ID
      const message_id = getLastMessageId();
      if (message_id < 0) {
        throw new Error('没有找到消息');
      }

      Logger.log(`[MVU Converter] 使用消息ID: ${message_id}`);

      // 设置消息变量
      try {
        Logger.log('[MVU Converter] 开始设置消息变量...');

        // 创建包含stat_data的完整数据结构
        const messageData = {
          [this.ROOT_VARIABLE_NAME]: jsonData,
        };

        await replaceVariables(messageData, {
          type: 'message',
          message_id: message_id,
        });

        messageSuccess = true;
        Logger.log('[MVU Converter] 成功设置消息变量');
      } catch (error) {
        Logger.warn('[MVU Converter] 设置消息变量失败:', error);

        // 尝试使用insertOrAssignVariables作为备选
        try {
          if (typeof insertOrAssignVariables === 'function') {
            await insertOrAssignVariables(
              { [this.ROOT_VARIABLE_NAME]: jsonData },
              { type: 'message', message_id: message_id },
            );
            messageSuccess = true;
            Logger.log('[MVU Converter] 通过insertOrAssignVariables成功设置消息变量');
          }
        } catch (insertError) {
          Logger.warn('[MVU Converter] insertOrAssignVariables也失败:', insertError);
        }
      }

      // 设置Chat变量
      try {
        Logger.log('[MVU Converter] 开始设置Chat变量...');

        // 创建包含stat_data的完整数据结构
        const chatData = {
          [this.ROOT_VARIABLE_NAME]: jsonData,
        };

        await replaceVariables(chatData, {
          type: 'chat',
        });

        chatSuccess = true;
        Logger.log('[MVU Converter] 成功设置Chat变量');
      } catch (error) {
        Logger.warn('[MVU Converter] 设置Chat变量失败:', error);

        // 尝试使用insertOrAssignVariables作为备选
        try {
          if (typeof insertOrAssignVariables === 'function') {
            await insertOrAssignVariables({ [this.ROOT_VARIABLE_NAME]: jsonData }, { type: 'chat' });
            chatSuccess = true;
            Logger.log('[MVU Converter] 通过insertOrAssignVariables成功设置Chat变量');
          }
        } catch (insertError) {
          Logger.warn('[MVU Converter] insertOrAssignVariables也失败:', insertError);
        }
      }

      const success = messageSuccess || chatSuccess;

      if (!success) {
        throw new Error('所有赋值方法都失败了，请尝试手动设置变量。');
      }

      // 8.036版本修改：显示详细的赋值结果
      let successMsg = '';
      if (messageSuccess && chatSuccess) {
        successMsg = `成功将变量赋值到最新楼层 (消息ID: ${this.cachedLastMessageId}) 和 Chat变量！`;
      } else if (messageSuccess) {
        successMsg = `成功将变量赋值到最新楼层 (消息ID: ${this.cachedLastMessageId})！`;
      } else if (chatSuccess) {
        successMsg = `成功将变量赋值到 Chat变量！`;
      }

      statusBar.textContent = successMsg;
      statusBar.classList.remove('error');
      Logger.log(`[MVU Converter] 日志：${successMsg}`);
      Logger.log(`[MVU Converter] 消息变量赋值结果: ${messageSuccess}, Chat变量赋值结果: ${chatSuccess}`);

      // 显示成功提示
      if (typeof toastr !== 'undefined') {
        toastr.success(successMsg, '赋值成功');
      }
    } catch (error) {
      Logger.error('[MVU Converter] 赋值过程中发生错误:', error);
      const errorMsg = `赋值失败: ${error.message}`;
      statusBar.textContent = errorMsg;
      statusBar.classList.add('error');

      // 显示错误提示
      if (typeof toastr !== 'undefined') {
        toastr.error(errorMsg, '赋值失败');
      } else {
        // 如果没有toastr，使用alert作为备选
        alert(errorMsg);
      }
    } finally {
      // 恢复按钮状态
      assignBtn.disabled = false;
      assignBtn.textContent = '赋值最新楼层+Chat变量';
    }

    Logger.log('[MVU Converter] 接口结束：handleAssignToLatest()');
  },

  /**
   * 8.0版本修改：通过DOM操作设置变量
   * @private
   * @param {Object} jsonData - 要设置的JSON数据
   * @returns {Promise<boolean>} 是否成功
   */
  setVariableViaDOM: async function (jsonData) {
    Logger.log('[MVU Converter] 接口触发：setVariableViaDOM()');

    try {
      const parentDoc = window.parent.document;

      // 8.0版本修改：策略1 - 尝试查找并操作变量管理器的输入框
      Logger.log('[MVU Converter] 分支逻辑：策略1 - 查找变量管理器输入框');
      const variableInputs = parentDoc.querySelectorAll(
        'input[placeholder*="变量"], input[placeholder*="variable"], textarea[placeholder*="变量"], textarea[placeholder*="variable"]',
      );

      if (variableInputs.length > 0) {
        Logger.log(`[MVU Converter] 找到 ${variableInputs.length} 个可能的变量输入框`);

        for (const input of variableInputs) {
          try {
            // 尝试设置变量数据
            const jsonString = JSON.stringify(jsonData, null, 2);
            input.value = jsonString;

            // 触发input事件
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            Logger.log('[MVU Converter] 成功通过输入框设置变量');
            return true;
          } catch (error) {
            Logger.warn('[MVU Converter] 通过输入框设置变量失败:', error);
            continue;
          }
        }
      }

      // 策略2：尝试查找变量管理器的数据存储元素
      Logger.log('[MVU Converter] 分支逻辑：策略2 - 查找变量数据存储元素');
      const dataElements = parentDoc.querySelectorAll('[data-variables], [data-vars], [data-chat-variables]');

      if (dataElements.length > 0) {
        Logger.log(`[MVU Converter] 找到 ${dataElements.length} 个数据存储元素`);

        for (const element of dataElements) {
          try {
            // 尝试直接设置data属性
            element.setAttribute('data-variables', JSON.stringify(jsonData));
            element.dataset.variables = JSON.stringify(jsonData);

            // 触发自定义事件
            element.dispatchEvent(
              new CustomEvent('variablesChanged', {
                detail: { variables: jsonData },
                bubbles: true,
              }),
            );

            Logger.log('[MVU Converter] 成功通过数据存储元素设置变量');
            return true;
          } catch (error) {
            Logger.warn('[MVU Converter] 通过数据存储元素设置变量失败:', error);
            continue;
          }
        }
      }

      // 策略3：尝试查找并操作变量管理器的JSON编辑器
      Logger.log('[MVU Converter] 分支逻辑：策略3 - 查找JSON编辑器');
      const jsonEditors = parentDoc.querySelectorAll('.json-editor, .ace_editor, [data-ace-editor], .monaco-editor');

      if (jsonEditors.length > 0) {
        Logger.log(`[MVU Converter] 找到 ${jsonEditors.length} 个JSON编辑器`);

        for (const editor of jsonEditors) {
          try {
            // 尝试通过ACE编辑器API设置内容
            if (editor.aceEditor) {
              editor.aceEditor.setValue(JSON.stringify(jsonData, null, 2));
              Logger.log('[MVU Converter] 成功通过ACE编辑器设置变量');
              return true;
            }

            // 尝试通过Monaco编辑器API设置内容
            if (editor.monacoEditor) {
              editor.monacoEditor.setValue(JSON.stringify(jsonData, null, 2));
              Logger.log('[MVU Converter] 成功通过Monaco编辑器设置变量');
              return true;
            }

            // 尝试直接设置内容
            if (editor.textContent !== undefined) {
              editor.textContent = JSON.stringify(jsonData, null, 2);
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              Logger.log('[MVU Converter] 成功通过文本内容设置变量');
              return true;
            }
          } catch (error) {
            Logger.warn('[MVU Converter] 通过JSON编辑器设置变量失败:', error);
            continue;
          }
        }
      }

      // 策略4：尝试通过全局变量设置
      Logger.log('[MVU Converter] 分支逻辑：策略4 - 尝试设置全局变量');
      try {
        if (window.parent.setGlobalVar && typeof window.parent.setGlobalVar === 'function') {
          await window.parent.setGlobalVar(this.ROOT_VARIABLE_NAME, jsonData);
          Logger.log('[MVU Converter] 成功通过全局变量API设置变量');
          return true;
        }
      } catch (error) {
        Logger.warn('[MVU Converter] 通过全局变量API设置变量失败:', error);
      }

      // 策略5：尝试通过localStorage设置
      Logger.log('[MVU Converter] 分支逻辑：策略5 - 尝试通过localStorage设置');
      try {
        const storageKey = `sillytavern_variables_${this.cachedLastMessageId}`;
        localStorage.setItem(storageKey, JSON.stringify(jsonData));
        Logger.log('[MVU Converter] 成功通过localStorage设置变量');
        return true;
      } catch (error) {
        Logger.warn('[MVU Converter] 通过localStorage设置变量失败:', error);
      }

      Logger.log('[MVU Converter] 所有DOM操作策略都失败了');
      return false;
    } catch (error) {
      Logger.error('[MVU Converter] DOM操作过程中发生错误:', error);
      return false;
    }
  },

  /**
   * 更新世界书的异步函数
   * @private
   */
  updateWorldInfo: async function (jsonContent, mdContent, statusBar) {
    Logger.log('[MVU Converter] 接口触发：updateWorldInfo()');
    try {
      const bookName = await this._getCharacterWorldBook();

      Logger.log(`[MVU Converter] 分支逻辑：使用 getLorebookEntries API 加载世界书 '${bookName}'`);
      const entries = await getLorebookEntries(bookName);
      if (!entries) {
        throw new Error(`无法加载或解析世界书 '${bookName}' 的条目。`);
      }

      let jsonEntryFound = false;
      let yamlEntryFound = false;

      // 7.7版本修改：将匹配逻辑从检查条目内容(content)改为检查条目注释/标题(comment)，以避免更新后关键词丢失。
      Logger.log(`[MVU Converter] 分支逻辑(7.7)：在条目注释(comment)中查找关键词并更新对应内容。`);
      for (const entry of entries) {
        if (entry.comment.includes(this.WI_JSON_KEY)) {
          entry.content = jsonContent;
          jsonEntryFound = true;
        }
        if (entry.comment.includes(this.WI_YAML_KEY)) {
          entry.content = mdContent;
          yamlEntryFound = true;
        }
      }

      if (!jsonEntryFound || !yamlEntryFound) {
        const missingKeys = [];
        if (!jsonEntryFound) missingKeys.push(this.WI_JSON_KEY);
        if (!yamlEntryFound) missingKeys.push(this.WI_YAML_KEY);
        throw new Error(`在世界书条目名称中未找到关键词: ${missingKeys.join(', ')}`);
      }

      Logger.log(`[MVU Converter] 分支逻辑：使用 replaceLorebookEntries API 更新世界书 '${bookName}'`);
      await replaceLorebookEntries(bookName, entries);

      const successMsg = `世界书 '${bookName}' 更新成功！`;
      statusBar.textContent = successMsg;
      Logger.log(`[MVU Converter] 日志：${successMsg}`);
    } catch (error) {
      const errorMsg = `世界书更新失败: ${error.message}`;
      statusBar.textContent = errorMsg;
      Logger.error(`[MVU Converter] ${errorMsg}`, error);
    }
    Logger.log('[MVU Converter] 接口结束：updateWorldInfo()');
  },

  /**
   * 8.052版本修改：预处理输入，移除$meta属性但不更新输入窗口，保留原始数据
   * 8.057版本修改：保留可增删列表中的实例数据用于模板生成
   * @private
   * @param {string} inputText - 输入的JSON字符串
   * @returns {string} 预处理后的JSON字符串
   */
  preprocessInput: function (inputText) {
    Logger.log('[MVU Converter] 接口触发：preprocessInput()');

    try {
      // 解析JSON
      const inputJson = JSON.parse(inputText);

      // 递归移除所有$meta属性，但保留可增删列表中的实例数据
      const cleanedJson = this.removeExtensibleMeta(inputJson);

      // 重新格式化并返回
      const result = JSON.stringify(cleanedJson, null, 2);
      Logger.log('[MVU Converter] 分支逻辑：输入预处理完成');
      Logger.log('[MVU Converter] 接口结束：preprocessInput()');
      return result;
    } catch (error) {
      Logger.error('[MVU Converter] 预处理输入时发生错误:', error);
      Logger.log('[MVU Converter] 接口结束：preprocessInput() - 返回原始输入');
      return inputText; // 如果解析失败，返回原始输入
    }
  },

  /**
   * 7.84版本修改：递归移除$meta属性
   * 8.057版本修改：保留可增删列表中的实例数据用于模板生成
   * @private
   * @param {Object} obj - 要处理的对象
   * @returns {Object} 处理后的对象
   */
  removeExtensibleMeta: function (obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeExtensibleMeta(item));
    }

    const result = {};
    for (const key in obj) {
      if (key === '$meta') {
        // 保留$meta属性，包括extensible
        if (obj[key] && typeof obj[key] === 'object') {
          result[key] = { ...obj[key] };
        }
      } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        // 检查是否为递归可增删列表或普通可增删列表
        if (obj[key].$meta && (obj[key].$meta.recursiveExtensible || obj[key].$meta.extensible)) {
          // 8.057版本修改：对于可增删列表，保留$meta和实例数据用于模板生成
          const cleanedInstance = {};
          for (const instanceKey in obj[key]) {
            if (instanceKey !== '$meta') {
              // 递归处理实例数据
              cleanedInstance[instanceKey] = this.removeExtensibleMeta(obj[key][instanceKey]);
            }
          }
          result[key] = {
            $meta: { ...obj[key].$meta },
            ...cleanedInstance,
          };
        } else {
          result[key] = this.removeExtensibleMeta(obj[key]);
        }
      } else if (Array.isArray(obj[key])) {
        // 8.058版本修复：保留数组格式，不提前转换，确保数据传递完整性
        result[key] = this.removeExtensibleMeta(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }

    return result;
  },

  /**
   * 7.84版本修改：判断是否为可增删列表结构的函数
   * @private
   * @param {Object} node - 要检查的节点
   * @param {string} description - 节点的描述文本
   * @returns {boolean} 是否为可增删列表结构
   */
  isExtensibleListStructure: function (node, description) {
    Logger.log('[MVU Converter] 接口触发：isExtensibleListStructure()');
    Logger.log(
      `[MVU Converter] 分支逻辑：检查节点类型: ${typeof node}, 是否为数组: ${Array.isArray(
        node,
      )}, 描述: "${description}"`,
    );

    // 策略1：检查是否包含 value.$meta?.extensible==true
    if (this.hasExtensibleMeta(node)) {
      Logger.log('[MVU Converter] 分支逻辑：检测到$meta.extensible==true，认定为可增删列表结构');
      return true;
    }

    // 策略2：使用新的判断规则
    const result = this.checkExtensibleListRules(node, description);
    Logger.log(`[MVU Converter] 分支逻辑：新规则判断结果: ${result}`);
    Logger.log('[MVU Converter] 接口结束：isExtensibleListStructure()');
    return result;
  },

  /**
   * 8.2版本修改：检查是否包含 value.$meta?.extensible==true 或 recursiveExtensible==true
   * 统一识别为可增删列表结构，不再区分类型
   * @private
   * @param {Object} node - 要检查的节点
   * @returns {boolean} 是否包含该属性
   */
  hasExtensibleMeta: function (node) {
    Logger.log('[MVU Converter] 接口触发：hasExtensibleMeta()');

    // 8.3版本修复：只检查当前节点的$meta属性，不递归检查子节点
    if (node && node.$meta) {
      Logger.log(`[MVU Converter] 调试：发现$meta对象:`, node.$meta);

      // 8.2版本修改：统一检查extensible或recursiveExtensible属性，都识别为可增删列表
      if (node.$meta.extensible === true || node.$meta.recursiveExtensible === true) {
        Logger.log(
          '[MVU Converter] 分支逻辑：找到$meta.extensible==true或$meta.recursiveExtensible==true，统一识别为可增删列表',
        );
        Logger.log(`[MVU Converter] 分支逻辑：hasExtensibleMeta检查结果: true`);
        Logger.log('[MVU Converter] 接口结束：hasExtensibleMeta()');
        return true;
      }

      // 记录调试信息
      Logger.log(
        `[MVU Converter] 调试：$meta.extensible值: ${node.$meta.extensible} (类型: ${typeof node.$meta.extensible})`,
      );
      Logger.log(
        `[MVU Converter] 调试：$meta.recursiveExtensible值: ${node.$meta.recursiveExtensible} (类型: ${typeof node.$meta
          .recursiveExtensible})`,
      );
    }

    Logger.log(`[MVU Converter] 分支逻辑：hasExtensibleMeta检查结果: false`);
    Logger.log('[MVU Converter] 接口结束：hasExtensibleMeta()');
    return false;
  },

  /**
   * 7.84版本修改：新的可增删列表结构判断规则
   * @private
   * @param {Object} node - 要检查的节点
   * @param {string} description - 节点的描述文本
   * @returns {boolean} 是否为可增删列表结构
   */
  checkExtensibleListRules: function (node, description) {
    Logger.log('[MVU Converter] 接口触发：checkExtensibleListRules()');
    Logger.log(`[MVU Converter] 分支逻辑：检查节点键: ${Object.keys(node).join(', ')}`);

    // 规则1：空容器且描述暗示动态添加
    const isEmpty = this.isEmptyContainer(node);
    const hasDynamic = this.hasDynamicKeywords(description);
    Logger.log(`[MVU Converter] 分支逻辑：空容器检查: ${isEmpty}, 动态关键词检查: ${hasDynamic}`);

    if (isEmpty && hasDynamic) {
      Logger.log('[MVU Converter] 分支逻辑：空容器且描述暗示动态添加');
      Logger.log('[MVU Converter] 接口结束：checkExtensibleListRules()');
      return true;
    }

    // 规则2：非空容器且元素展现清晰可重复结构模式
    const hasRepeating = this.hasRepeatingStructure(node);
    Logger.log(`[MVU Converter] 分支逻辑：可重复结构检查: ${hasRepeating}`);

    if (!isEmpty && hasRepeating) {
      Logger.log('[MVU Converter] 分支逻辑：非空容器且元素展现清晰可重复结构模式');
      Logger.log('[MVU Converter] 接口结束：checkExtensibleListRules()');
      return true;
    }

    Logger.log('[MVU Converter] 分支逻辑：不满足可增删列表结构条件');
    Logger.log('[MVU Converter] 接口结束：checkExtensibleListRules()');
    return false;
  },

  /**
   * 7.84版本修改：检查是否为空容器
   * @private
   * @param {Object} node - 要检查的节点
   * @returns {boolean} 是否为空容器
   */
  isEmptyContainer: function (node) {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.length === 0;
    return Object.keys(node).length === 0;
  },

  /**
   * 7.84版本修改：检查描述是否包含动态添加的关键词
   * @private
   * @param {string} description - 描述文本
   * @returns {boolean} 是否包含动态关键词
   */
  hasDynamicKeywords: function (description) {
    if (!description || typeof description !== 'string') return false;

    // 使用正则匹配暗示动态添加的词汇
    const dynamicKeywords =
      /(记录所有|存放各种|添加新时|动态添加|新增|添加|插入|追加|收集|累积|积累|存储|保存|记录|登记|注册|收录|收纳|容纳|包含|涵盖|涉及|包括|等等|各种|多种|多个|若干|一些|若干|若干种|若干类|若干项|若干条|若干个|若干种|若干类|若干项|若干条|若干个)/;

    return dynamicKeywords.test(description);
  },

  /**
   * 8.042版本新增：检查对象中是否包含旧版Json数据结构([值,描述])
   * @private
   * @param {Object} obj - 要检查的对象
   * @param {Function} callback - 发现旧版结构时的回调函数(path, arrayValue)
   */
  checkObjectForOldJsonStructure: function (obj, callback) {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (this.isArrayDataFormat(value)) {
        callback(key, value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.checkObjectForOldJsonStructure(value, callback);
      }
    });
  },

  /**
   * 8.043版本新增：判断是否应该被识别为递归可增删列表
   * @private
   * @param {Object} listNode - 列表节点
   * @returns {boolean} 是否为递归可增删列表
   */
  shouldBeRecursiveExtensible: function (listNode) {
    if (!listNode || typeof listNode !== 'object') return false;

    const keys = Object.keys(listNode).filter(k => k !== '$meta');

    // 如果少于2个实例，不是递归结构
    if (keys.length < 2) return false;

    // 8.1版本修改：检查子对象的复杂程度
    // 递归可增删列表应该包含复杂的嵌套对象，而不是简单的属性
    let hasComplexStructure = false;
    let hasSimpleStructure = false;
    let totalSubKeys = 0;
    let complexInstanceCount = 0;

    for (const key of keys) {
      const value = listNode[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const subKeys = Object.keys(value);
        totalSubKeys += subKeys.length;

        // 检查是否有嵌套对象（递归结构）
        let hasNestedObjects = false;
        for (const subKey of subKeys) {
          const subValue = value[subKey];
          if (
            subValue &&
            typeof subValue === 'object' &&
            !Array.isArray(subValue) &&
            Object.keys(subValue).length > 0
          ) {
            hasNestedObjects = true;
            break;
          }
        }

        // 如果子对象包含嵌套对象，认为是复杂结构
        if (hasNestedObjects) {
          hasComplexStructure = true;
          complexInstanceCount++;
        } else {
          hasSimpleStructure = true;
        }
      }
    }

    // 如果大部分实例都有复杂结构（包含嵌套对象），则认为是递归可增删列表
    if (hasComplexStructure && complexInstanceCount >= keys.length * 0.6) {
      Logger.log(`[MVU Converter] 分支逻辑：检测到${complexInstanceCount}个复杂结构实例，判断为递归可增删列表`);
      return true;
    }

    // 如果所有实例都是简单结构（不包含嵌套对象），则认为是普通可增删列表
    if (hasSimpleStructure && !hasComplexStructure) {
      Logger.log(`[MVU Converter] 分支逻辑：检测到简单结构实例，判断为普通可增删列表`);
      return false;
    }

    // 检查是否所有的键都是角色/实例名称（非结构性键名）
    const nonStructuralKeys = keys.filter(k => !k.endsWith('列表') && k !== '模板');

    // 如果大部分键都是非结构性的（可能是角色名），则认为是递归可增删列表
    if (nonStructuralKeys.length >= keys.length * 0.8) {
      Logger.log(`[MVU Converter] 分支逻辑：检测到${nonStructuralKeys.length}个非结构性键，判断为递归可增删列表`);
      return true;
    }

    return false;
  },

  /**
   * 7.84版本修改：检查是否具有可重复的结构模式
   * 8.042版本修改：增加旧版Json数据结构([值,描述])检测，增强可增删列表识别
   * 8.1版本修改：增强深度结构分析和实例独立性判断
   * @private
   * @param {Object} node - 要检查的节点
   * @returns {boolean} 是否具有可重复结构
   */
  hasRepeatingStructure: function (node) {
    Logger.log('[MVU Converter] 接口触发：hasRepeatingStructure()');

    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      Logger.log('[MVU Converter] 分支逻辑：节点不是有效对象，返回false');
      return false;
    }

    const keys = Object.keys(node);
    Logger.log(`[MVU Converter] 分支逻辑：节点键: ${keys.join(', ')}`);

    if (keys.length < 2) {
      Logger.log('[MVU Converter] 分支逻辑：键数量少于2，返回false');
      return false; // 至少需要2个元素才能判断模式
    }

    // 8.303版本重构：直接检查当前节点是否具有可增删列表特征
    // 方法1：检查键名是否具有实例特征
    if (this.hasInstanceKeyPattern(keys, node)) {
      Logger.log('[MVU Converter] 分支逻辑：检测到键名具有实例特征');
      return true;
    }

    // 方法2：检查子项结构是否一致（可增删列表特征）
    if (this.checkStructuralConsistency(keys, node)) {
      Logger.log('[MVU Converter] 分支逻辑：检测到子项结构一致性，具有可增删列表特征');
      return true;
    }

    // 方法3：检查是否有足够的候选项（传统方法）
    const candidates = keys
      .map(key => ({ key, value: node[key] }))
      .filter(({ value }) => {
        // 必须是对象且非数组
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

        // 必须是非空对象
        if (Object.keys(value).length === 0) return false;

        // 检查子项的子项是否具有实例特征
        const subKeys = Object.keys(value);
        return this.hasInstanceKeyPattern(subKeys, value);
      });

    Logger.log(`[MVU Converter] 分支逻辑：候选项数量: ${candidates.length}`);

    if (candidates.length < 2) {
      Logger.log('[MVU Converter] 分支逻辑：严格过滤后的候选项少于2个，返回false');
      return false;
    }

    // 8.1版本新增：深度结构分析
    const structureAnalysis = this.analyzeDeepStructure(candidates);
    Logger.log(`[MVU Converter] 分支逻辑：深度结构分析结果:`, structureAnalysis);

    // 8.1版本新增：实例独立性判断
    const instanceIndependence = this.checkInstanceIndependence(candidates);
    Logger.log(`[MVU Converter] 分支逻辑：实例独立性判断结果: ${instanceIndependence}`);

    // 8.042版本新增：检查是否包含旧版Json数据结构([值,描述])
    let oldJsonStructureCount = 0;
    candidates.forEach(({ key, value }) => {
      let hasOldJsonStructure = false;
      this.checkObjectForOldJsonStructure(value, (path, arrayValue) => {
        hasOldJsonStructure = true;
      });
      if (hasOldJsonStructure) {
        oldJsonStructureCount++;
        Logger.log(`[MVU Converter] 分支逻辑：检测到候选项 "${key}" 包含旧版Json数据结构`);
      }
    });

    const oldJsonRatio = oldJsonStructureCount / candidates.length;
    Logger.log(
      `[MVU Converter] 分支逻辑：旧版Json数据结构比例: ${oldJsonRatio.toFixed(2)} (${(oldJsonRatio * 100).toFixed(
        0,
      )}%)`,
    );

    // 8.301版本修复：调整相似度阈值，平衡准确性和识别能力
    // 条件1：深度结构相似度达到要求（从0.85调整到0.7）
    const structureSimilar = structureAnalysis.similarity >= 0.7;
    // 条件2：实例独立性判断通过
    const hasInstanceIndependence = instanceIndependence;
    // 条件3：80%以上的候选项包含旧版Json数据结构，或者结构相似度达到100%（新版JSON数据）
    const hasOldJsonStructures = oldJsonRatio >= 0.8;
    const isNewJsonWithPerfectStructure = structureAnalysis.similarity >= 1.0; // 新版JSON数据，结构完全一致
    // 8.301版本修复：对于新版JSON数据，要求更高的相似度
    const isNewJsonWithHighSimilarity = structureAnalysis.similarity >= 0.9 && hasInstanceIndependence;

    // 8.301版本修复：更严格的判断条件
    const result =
      structureSimilar && (hasOldJsonStructures || isNewJsonWithPerfectStructure || isNewJsonWithHighSimilarity);
    Logger.log(`[MVU Converter] 分支逻辑：深度结构相似度检查结果: ${structureSimilar}`);
    Logger.log(`[MVU Converter] 分支逻辑：实例独立性判断结果: ${hasInstanceIndependence}`);
    Logger.log(`[MVU Converter] 分支逻辑：旧版Json结构检查结果: ${hasOldJsonStructures}`);
    Logger.log(`[MVU Converter] 分支逻辑：综合判断结果: ${result}`);
    Logger.log('[MVU Converter] 接口结束：hasRepeatingStructure()');
    return result;
  },

  /**
   * 8.1版本新增：深度结构分析
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {Object} 结构分析结果
   */
  analyzeDeepStructure: function (candidates) {
    Logger.log('[MVU Converter] 接口触发：analyzeDeepStructure()');

    // 分析每个候选对象的结构
    const structures = candidates.map(({ value }) => this.analyzeObjectStructure(value));

    Logger.log(`[MVU Converter] 分支逻辑：分析${structures.length}个候选对象的结构`);

    // 计算结构相似度
    const similarity = this.calculateStructureSimilarity(structures);

    // 分析嵌套结构
    const nestedAnalysis = this.analyzeNestedStructures(structures);

    // 分析类型分布
    const typeAnalysis = this.analyzeTypeDistribution(structures);

    const result = {
      similarity: similarity,
      nestedLevels: nestedAnalysis.levels,
      typeConsistency: typeAnalysis.consistency,
      hasComplexNesting: nestedAnalysis.hasComplexNesting,
    };

    Logger.log(`[MVU Converter] 分支逻辑：结构相似度: ${similarity.toFixed(2)}`);
    Logger.log(`[MVU Converter] 分支逻辑：嵌套层次: ${nestedAnalysis.levels}`);
    Logger.log(`[MVU Converter] 分支逻辑：类型一致性: ${typeAnalysis.consistency.toFixed(2)}`);
    Logger.log('[MVU Converter] 接口结束：analyzeDeepStructure()');

    return result;
  },

  /**
   * 8.1版本新增：分析单个对象的结构
   * @private
   * @param {Object} obj - 要分析的对象
   * @returns {Object} 结构信息
   */
  analyzeObjectStructure: function (obj) {
    const structure = {
      keys: Object.keys(obj),
      keyTypes: {},
      nestedStructures: {},
      maxDepth: 0,
    };

    const analyzeNode = (node, depth = 0) => {
      structure.maxDepth = Math.max(structure.maxDepth, depth);

      for (const key in node) {
        const value = node[key];
        structure.keyTypes[key] = typeof value;

        // 分析嵌套对象
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          structure.nestedStructures[key] = this.analyzeObjectStructure(value);
        }
      }
    };

    analyzeNode(obj);
    return structure;
  },

  /**
   * 8.1版本新增：计算结构相似度
   * @private
   * @param {Array} structures - 结构数组
   * @returns {number} 相似度 (0-1)
   */
  calculateStructureSimilarity: function (structures) {
    if (structures.length < 2) return 1.0;

    // 8.301版本修复：更严格的相似度计算，避免误判
    // 比较所有结构对
    let totalSimilarity = 0;
    let comparisonCount = 0;
    let minSimilarity = 1.0; // 记录最低相似度

    for (let i = 0; i < structures.length; i++) {
      for (let j = i + 1; j < structures.length; j++) {
        const similarity = this.compareTwoStructures(structures[i], structures[j]);
        totalSimilarity += similarity;
        comparisonCount++;
        minSimilarity = Math.min(minSimilarity, similarity); // 更新最低相似度
      }
    }

    const averageSimilarity = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;

    // 8.301版本修复：如果任何一对结构的相似度过低，整体相似度也会降低
    // 这样可以避免因为少数高相似度对而掩盖低相似度对的问题
    const adjustedSimilarity = (averageSimilarity + minSimilarity) / 2;

    Logger.log(
      `[MVU Converter] 分支逻辑：相似度计算 - 平均相似度: ${averageSimilarity.toFixed(
        3,
      )}, 最低相似度: ${minSimilarity.toFixed(3)}, 调整后相似度: ${adjustedSimilarity.toFixed(3)}`,
    );

    return adjustedSimilarity;
  },

  /**
   * 8.1版本新增：比较两个结构
   * @private
   * @param {Object} struct1 - 第一个结构
   * @param {Object} struct2 - 第二个结构
   * @returns {number} 相似度 (0-1)
   */
  compareTwoStructures: function (struct1, struct2) {
    // 比较键名
    const keySimilarity = this.calculateKeySimilarity(struct1.keys, struct2.keys);

    // 比较类型分布
    const typeSimilarity = this.calculateTypeSimilarity(struct1.keyTypes, struct2.keyTypes);

    // 比较嵌套结构
    const nestedSimilarity = this.calculateNestedSimilarity(struct1.nestedStructures, struct2.nestedStructures);

    // 综合相似度
    return (keySimilarity + typeSimilarity + nestedSimilarity) / 3;
  },

  /**
   * 8.1版本新增：计算键名相似度
   * @private
   * @param {Array} keys1 - 第一个键数组
   * @param {Array} keys2 - 第二个键数组
   * @returns {number} 相似度 (0-1)
   */
  calculateKeySimilarity: function (keys1, keys2) {
    // 8.301版本修复：更严格的键名相似度计算
    if (!keys1 || !keys2 || !Array.isArray(keys1) || !Array.isArray(keys2)) return 0;

    // 如果键名完全不同，相似度为0
    const commonKeys = keys1.filter(key => keys2.includes(key));
    if (commonKeys.length === 0) return 0;

    const totalKeys = new Set([...keys1, ...keys2]).size;
    const basicSimilarity = totalKeys > 0 ? commonKeys.length / totalKeys : 0;

    // 8.301版本修复：检查键名模式相似性
    const patternSimilarity = this.calculateKeyPatternSimilarity(keys1, keys2);

    // 综合相似度：基础相似度和模式相似度的加权平均
    const finalSimilarity = basicSimilarity * 0.7 + patternSimilarity * 0.3;

    Logger.log(
      `[MVU Converter] 分支逻辑：键名相似度 - 基础相似度: ${basicSimilarity.toFixed(
        3,
      )}, 模式相似度: ${patternSimilarity.toFixed(3)}, 最终相似度: ${finalSimilarity.toFixed(3)}`,
    );

    return finalSimilarity;
  },

  /**
   * 8.1版本新增：计算类型相似度
   * @private
   * @param {Object} types1 - 第一个类型对象
   * @param {Object} types2 - 第二个类型对象
   * @returns {number} 相似度 (0-1)
   */
  calculateTypeSimilarity: function (types1, types2) {
    const allKeys = new Set([...Object.keys(types1), ...Object.keys(types2)]);
    let matchingTypes = 0;
    let totalComparisons = 0;

    for (const key of allKeys) {
      if (types1[key] && types2[key]) {
        totalComparisons++;
        if (types1[key] === types2[key]) {
          matchingTypes++;
        }
      }
    }

    return totalComparisons > 0 ? matchingTypes / totalComparisons : 0;
  },

  /**
   * 8.1版本新增：计算嵌套结构相似度
   * @private
   * @param {Object} nested1 - 第一个嵌套结构
   * @param {Object} nested2 - 第二个嵌套结构
   * @returns {number} 相似度 (0-1)
   */
  calculateNestedSimilarity: function (nested1, nested2) {
    const keys1 = Object.keys(nested1);
    const keys2 = Object.keys(nested2);

    if (keys1.length === 0 && keys2.length === 0) return 1.0;
    if (keys1.length === 0 || keys2.length === 0) return 0.0;

    const commonKeys = keys1.filter(key => keys2.includes(key));
    if (commonKeys.length === 0) return 0.0;

    let totalSimilarity = 0;
    for (const key of commonKeys) {
      totalSimilarity += this.compareTwoStructures(nested1[key], nested2[key]);
    }

    return totalSimilarity / commonKeys.length;
  },

  /**
   * 8.301版本新增：计算键名模式相似度
   * 基于纯结构特征，避免语义判断
   * @private
   * @param {Array} keys1 - 第一个键名数组
   * @param {Array} keys2 - 第二个键名数组
   * @returns {number} 模式相似度 (0-1)
   */
  calculateKeyPatternSimilarity: function (keys1, keys2) {
    if (!keys1 || !keys2 || !Array.isArray(keys1) || !Array.isArray(keys2)) return 0;

    // 1. 检查键名长度分布相似性
    const lengthSimilarity = this.calculateLengthDistributionSimilarity(keys1, keys2);

    // 2. 检查键名字符组成相似性
    const characterSimilarity = this.calculateCharacterCompositionSimilarity(keys1, keys2);

    // 3. 检查键名结构模式相似性
    const structureSimilarity = this.calculateKeyStructureSimilarity(keys1, keys2);

    // 综合模式相似度
    const patternSimilarity = (lengthSimilarity + characterSimilarity + structureSimilarity) / 3;

    Logger.log(
      `[MVU Converter] 分支逻辑：键名模式相似度 - 长度分布: ${lengthSimilarity.toFixed(
        3,
      )}, 字符组成: ${characterSimilarity.toFixed(3)}, 结构模式: ${structureSimilarity.toFixed(
        3,
      )}, 综合: ${patternSimilarity.toFixed(3)}`,
    );

    return patternSimilarity;
  },

  /**
   * 8.301版本新增：计算键名长度分布相似性
   * @private
   * @param {Array} keys1 - 第一个键名数组
   * @param {Array} keys2 - 第二个键名数组
   * @returns {number} 长度分布相似性 (0-1)
   */
  calculateLengthDistributionSimilarity: function (keys1, keys2) {
    if (keys1.length === 0 || keys2.length === 0) return 0;

    // 计算长度分布
    const lengths1 = keys1.map(k => k.length);
    const lengths2 = keys2.map(k => k.length);

    // 计算长度统计特征
    const stats1 = this.calculateLengthStats(lengths1);
    const stats2 = this.calculateLengthStats(lengths2);

    // 比较统计特征
    const meanDiff = Math.abs(stats1.mean - stats2.mean);
    const stdDiff = Math.abs(stats1.std - stats2.std);
    const maxLength = Math.max(stats1.max, stats2.max);

    // 计算相似性（差异越小，相似性越高）
    const meanSimilarity = Math.max(0, 1 - meanDiff / maxLength);
    const stdSimilarity = Math.max(0, 1 - stdDiff / maxLength);

    return (meanSimilarity + stdSimilarity) / 2;
  },

  /**
   * 8.301版本新增：计算长度统计特征
   * @private
   * @param {Array} lengths - 长度数组
   * @returns {Object} 统计特征
   */
  calculateLengthStats: function (lengths) {
    if (lengths.length === 0) return { mean: 0, std: 0, max: 0, min: 0 };

    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const std = Math.sqrt(variance);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);

    return { mean, std, max, min };
  },

  /**
   * 8.301版本新增：计算键名字符组成相似性
   * @private
   * @param {Array} keys1 - 第一个键名数组
   * @param {Array} keys2 - 第二个键名数组
   * @returns {number} 字符组成相似性 (0-1)
   */
  calculateCharacterCompositionSimilarity: function (keys1, keys2) {
    if (keys1.length === 0 || keys2.length === 0) return 0;

    // 统计字符类型分布
    const charTypes1 = this.analyzeCharacterTypes(keys1);
    const charTypes2 = this.analyzeCharacterTypes(keys2);

    // 计算字符类型相似性
    const allTypes = new Set([...Object.keys(charTypes1), ...Object.keys(charTypes2)]);
    let matchingTypes = 0;
    let totalTypes = 0;

    for (const type of allTypes) {
      const count1 = charTypes1[type] || 0;
      const count2 = charTypes2[type] || 0;
      const maxCount = Math.max(count1, count2);

      if (maxCount > 0) {
        totalTypes++;
        const similarity = Math.min(count1, count2) / maxCount;
        matchingTypes += similarity;
      }
    }

    return totalTypes > 0 ? matchingTypes / totalTypes : 0;
  },

  /**
   * 8.301版本新增：分析键名字符类型
   * @private
   * @param {Array} keys - 键名数组
   * @returns {Object} 字符类型统计
   */
  analyzeCharacterTypes: function (keys) {
    const charTypes = {
      letters: 0, // 字母
      digits: 0, // 数字
      symbols: 0, // 符号
      chinese: 0, // 中文字符
    };

    for (const key of keys) {
      for (const char of key) {
        if (/[a-zA-Z]/.test(char)) {
          charTypes.letters++;
        } else if (/[0-9]/.test(char)) {
          charTypes.digits++;
        } else if (/[\u4e00-\u9fff]/.test(char)) {
          charTypes.chinese++;
        } else {
          charTypes.symbols++;
        }
      }
    }

    return charTypes;
  },

  /**
   * 8.301版本新增：计算键名结构模式相似性
   * @private
   * @param {Array} keys1 - 第一个键名数组
   * @param {Array} keys2 - 第二个键名数组
   * @returns {number} 结构模式相似性 (0-1)
   */
  calculateKeyStructureSimilarity: function (keys1, keys2) {
    if (keys1.length === 0 || keys2.length === 0) return 0;

    // 检查是否有共同的键名模式
    const patterns1 = this.extractKeyPatterns(keys1);
    const patterns2 = this.extractKeyPatterns(keys2);

    // 计算模式匹配度
    const commonPatterns = patterns1.filter(p => patterns2.includes(p));
    const totalPatterns = new Set([...patterns1, ...patterns2]).size;

    return totalPatterns > 0 ? commonPatterns.length / totalPatterns : 0;
  },

  /**
   * 8.301版本新增：提取键名模式
   * @private
   * @param {Array} keys - 键名数组
   * @returns {Array} 模式数组
   */
  extractKeyPatterns: function (keys) {
    const patterns = [];

    for (const key of keys) {
      // 提取数字模式（如：item1 -> item#）
      const numericPattern = key.replace(/\d+/g, '#');
      patterns.push(numericPattern);

      // 提取字符类型模式（如：itemName -> LLLL）
      const charPattern = key
        .replace(/[a-zA-Z]/g, 'L')
        .replace(/[0-9]/g, 'D')
        .replace(/[\u4e00-\u9fff]/g, 'C');
      patterns.push(charPattern);
    }

    return patterns;
  },

  /**
   * 8.1版本新增：分析嵌套结构
   * @private
   * @param {Array} structures - 结构数组
   * @returns {Object} 嵌套分析结果
   */
  analyzeNestedStructures: function (structures) {
    const depths = structures.map(s => s.maxDepth);
    const avgDepth = depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
    const maxDepth = Math.max(...depths);
    const hasComplexNesting = avgDepth >= 1.5; // 平均深度超过1.5层认为有复杂嵌套

    return {
      levels: maxDepth,
      averageDepth: avgDepth,
      hasComplexNesting: hasComplexNesting,
    };
  },

  /**
   * 8.1版本新增：分析类型分布
   * @private
   * @param {Array} structures - 结构数组
   * @returns {Object} 类型分析结果
   */
  analyzeTypeDistribution: function (structures) {
    const allTypes = {};

    // 收集所有类型
    structures.forEach(structure => {
      Object.values(structure.keyTypes).forEach(type => {
        allTypes[type] = (allTypes[type] || 0) + 1;
      });
    });

    // 计算类型一致性
    const totalTypes = Object.values(allTypes).reduce((sum, count) => sum + count, 0);
    const mostCommonType = Math.max(...Object.values(allTypes));
    const consistency = totalTypes > 0 ? mostCommonType / totalTypes : 0;

    return {
      typeDistribution: allTypes,
      consistency: consistency,
    };
  },

  /**
   * 8.1版本修改：检查实例独立性 - 基于纯结构判断
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {boolean} 是否具有实例独立性
   */
  checkInstanceIndependence: function (candidates) {
    Logger.log('[MVU Converter] 接口触发：checkInstanceIndependence()');

    // 8.1版本修改：基于纯结构特征判断实例独立性
    const structureAnalysis = this.analyzeInstanceStructure(candidates);

    Logger.log(`[MVU Converter] 分支逻辑：结构分析结果:`, structureAnalysis);

    // 判断是否满足实例独立性条件
    const result = structureAnalysis.isInstanceStructure;

    Logger.log(`[MVU Converter] 分支逻辑：实例独立性判断结果: ${result}`);
    Logger.log('[MVU Converter] 接口结束：checkInstanceIndependence()');

    return result;
  },

  /**
   * 8.1版本新增：分析实例结构特征
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {Object} 结构分析结果
   */
  analyzeInstanceStructure: function (candidates) {
    if (candidates.length < 2) {
      return { isInstanceStructure: false, reason: '候选对象数量不足' };
    }

    // 1. 分析键名模式
    const keyPatternAnalysis = this.analyzeKeyPatterns(candidates);

    // 2. 分析结构完整性
    const structureCompleteness = this.analyzeStructureCompleteness(candidates);

    // 3. 分析可扩展性特征
    const extensibilityFeatures = this.analyzeExtensibilityFeatures(candidates);

    // 综合判断
    const isInstanceStructure =
      keyPatternAnalysis.isValidPattern &&
      structureCompleteness.isComplete &&
      extensibilityFeatures.hasExtensibilityFeatures;

    return {
      isInstanceStructure,
      keyPatternAnalysis,
      structureCompleteness,
      extensibilityFeatures,
      reason: isInstanceStructure ? '满足实例结构特征' : '不满足实例结构特征',
    };
  },

  /**
   * 8.1版本新增：分析键名模式
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {Object} 键名模式分析结果
   */
  analyzeKeyPatterns: function (candidates) {
    // 检查键名是否具有实例特征（非结构性键名）
    const structuralKeys = ['模板', '列表', 'template', 'list', 'meta', '$meta'];

    const nonStructuralCount = candidates.filter(
      ({ key }) => !structuralKeys.some(structuralKey => key.includes(structuralKey)),
    ).length;

    const isValidPattern = nonStructuralCount >= candidates.length * 0.8; // 80%以上是非结构性键名

    return {
      isValidPattern,
      nonStructuralCount,
      totalCount: candidates.length,
      ratio: nonStructuralCount / candidates.length,
    };
  },

  /**
   * 8.1版本新增：分析结构完整性
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {Object} 结构完整性分析结果
   */
  analyzeStructureCompleteness: function (candidates) {
    // 检查每个对象是否都有完整的属性结构
    const completeStructures = candidates.filter(({ value }) => {
      const keys = Object.keys(value);
      return keys.length >= 2; // 至少要有2个属性才算完整结构
    });

    const isComplete = completeStructures.length >= candidates.length * 0.8; // 80%以上有完整结构

    return {
      isComplete,
      completeCount: completeStructures.length,
      totalCount: candidates.length,
      ratio: completeStructures.length / candidates.length,
    };
  },

  /**
   * 8.1版本新增：分析可扩展性特征
   * @private
   * @param {Array} candidates - 候选对象数组
   * @returns {Object} 可扩展性特征分析结果
   */
  analyzeExtensibilityFeatures: function (candidates) {
    // 检查是否具有可扩展性特征
    // 1. 结构相似性（通过深度结构分析已经检查）
    // 2. 独立性（每个对象都是独立的实例）
    // 3. 可重复性（支持添加新实例）

    // 检查每个对象是否都是独立的（不依赖其他对象）
    const independentObjects = candidates.filter(({ value }) => {
      // 检查是否包含独立的数据（不是引用或关系）
      const hasIndependentData = Object.values(value).some(
        val =>
          typeof val === 'string' ||
          typeof val === 'number' ||
          typeof val === 'boolean' ||
          (Array.isArray(val) && val.length > 0) ||
          (typeof val === 'object' && val !== null && Object.keys(val).length > 0),
      );

      return hasIndependentData;
    });

    const hasExtensibilityFeatures = independentObjects.length >= candidates.length * 0.8; // 80%以上是独立对象

    return {
      hasExtensibilityFeatures,
      independentCount: independentObjects.length,
      totalCount: candidates.length,
      ratio: independentObjects.length / candidates.length,
    };
  },

  /**
   * 7.84版本修改：获取对象的结构信息
   * @private
   * @param {Object} obj - 要分析的对象
   * @returns {Object} 结构信息
   */
  getObjectStructure: function (obj) {
    if (!obj || typeof obj !== 'object') return { type: typeof obj };

    const structure = {
      type: Array.isArray(obj) ? 'array' : 'object',
      keys: Object.keys(obj),
      keyTypes: {},
    };

    for (const key in obj) {
      structure.keyTypes[key] = typeof obj[key];
    }

    return structure;
  },

  /**
   * 7.84版本修改：比较两个结构是否相似
   * @private
   * @param {Object} struct1 - 第一个结构
   * @param {Object} struct2 - 第二个结构
   * @returns {boolean} 是否相似
   */
  structuresAreSimilar: function (struct1, struct2) {
    Logger.log('[MVU Converter] 接口触发：structuresAreSimilar()');
    Logger.log(`[MVU Converter] 分支逻辑：比较结构类型: ${struct1.type} vs ${struct2.type}`);

    if (struct1.type !== struct2.type) {
      Logger.log('[MVU Converter] 分支逻辑：类型不匹配，返回false');
      return false;
    }

    if (struct1.type === 'object') {
      // 检查是否有相同的键
      const commonKeys = struct1.keys.filter(key => struct2.keys.includes(key));
      const similarity = commonKeys.length / Math.min(struct1.keys.length, struct2.keys.length);
      const result = similarity >= 0.7; // 70%相似度

      Logger.log(`[MVU Converter] 分支逻辑：结构1键: ${struct1.keys.join(', ')}`);
      Logger.log(`[MVU Converter] 分支逻辑：结构2键: ${struct2.keys.join(', ')}`);
      Logger.log(`[MVU Converter] 分支逻辑：共同键: ${commonKeys.join(', ')}`);
      Logger.log(`[MVU Converter] 分支逻辑：相似度: ${similarity.toFixed(2)} (${similarity * 100}%)`);
      Logger.log(`[MVU Converter] 分支逻辑：相似度检查结果: ${result}`);
      Logger.log('[MVU Converter] 接口结束：structuresAreSimilar()');
      return result;
    }

    Logger.log('[MVU Converter] 分支逻辑：数组类型，返回true');
    Logger.log('[MVU Converter] 接口结束：structuresAreSimilar()');
    return true; // 数组类型暂时认为相似
  },

  /**
   * 8.0版本修改：检查是否为数组数据格式 - 增强版本
   * @private
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为数组数据格式
   */
  isArrayDataFormat: function (value) {
    Logger.log('[MVU Converter] 接口触发：isArrayDataFormat()');
    Logger.log(`[MVU Converter] 分支逻辑：检查值类型: ${typeof value}, 是否为数组: ${Array.isArray(value)}`);

    if (!Array.isArray(value)) {
      Logger.log('[MVU Converter] 分支逻辑：不是数组，返回false');
      return false;
    }

    // 8.0版本修改：支持多种数组格式
    // 格式1: [数据, 描述] - 8.03版本修改：更严格的匹配条件
    if (value.length === 2 && typeof value[1] === 'string' && !Array.isArray(value[0])) {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式1 - [数据, 描述]');
      Logger.log(`[MVU Converter] 调试：格式1匹配成功，数据: ${JSON.stringify(value[0])}, 描述: ${value[1]}`);
      return true;
    }

    // 格式2: [[数据, 描述], 更新说明]
    if (value.length === 2 && Array.isArray(value[0]) && value[0].length === 2 && typeof value[0][1] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式2 - [[数据, 描述], 更新说明]');
      return true;
    }

    // 格式3: [数据, 描述, 额外信息] (8.0版本新增)
    if (value.length >= 2 && typeof value[1] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式3 - [数据, 描述, 额外信息]');
      return true;
    }

    // 格式4: [数据, 描述, 更新说明, 其他信息] (8.0版本新增)
    if (value.length >= 3 && typeof value[1] === 'string' && typeof value[2] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式4 - [数据, 描述, 更新说明, 其他信息]');
      return true;
    }

    // 8.01版本修改：格式5 - 包含对象的数组，如 [{"职业":[[["无","描述"]]]}, "描述"]
    if (value.length === 2 && typeof value[1] === 'string' && typeof value[0] === 'object' && value[0] !== null) {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式5 - [对象, 描述]');
      return true;
    }

    // 8.02版本修改：格式6 - 包含数组的数组，如 [{"职业":[[["无","描述"]]]}, "描述"]
    if (value.length === 2 && typeof value[1] === 'string' && Array.isArray(value[0])) {
      Logger.log('[MVU Converter] 分支逻辑：检测到格式6 - [数组, 描述]');
      return true;
    }

    Logger.log('[MVU Converter] 分支逻辑：不匹配任何已知数组格式');
    Logger.log('[MVU Converter] 接口结束：isArrayDataFormat()');
    return false;
  },

  /**
   * 8.03版本修改：从数组数据格式中提取数据和描述 - 修复数据提取逻辑
   * @private
   * @param {Array} value - 数组数据格式
   * @returns {Object} 包含data和description的对象
   */
  extractArrayData: function (value) {
    Logger.log('[MVU Converter] 接口触发：extractArrayData()');
    Logger.log(`[MVU Converter] 分支逻辑：处理数组: ${JSON.stringify(value)}`);

    // 格式1: [数据, 描述] - 8.03版本修改：更严格的匹配条件
    if (value.length === 2 && typeof value[1] === 'string' && !Array.isArray(value[0])) {
      Logger.log('[MVU Converter] 分支逻辑：提取格式1数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0],
        description: value[1],
      };
    }

    // 格式2: [[数据, 描述], 更新说明] - 8.03版本修改：只提取数据部分
    if (value.length === 2 && Array.isArray(value[0]) && value[0].length === 2 && typeof value[0][1] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：提取格式2数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0][0], // 只提取数据部分，不包含描述
        description: value[0][1],
      };
    }

    // 格式3: [数据, 描述, 额外信息] (8.0版本新增)
    if (value.length >= 2 && typeof value[1] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：提取格式3数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0],
        description: value[1],
      };
    }

    // 格式4: [数据, 描述, 更新说明, 其他信息] (8.0版本新增)
    if (value.length >= 3 && typeof value[1] === 'string' && typeof value[2] === 'string') {
      Logger.log('[MVU Converter] 分支逻辑：提取格式4数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0],
        description: value[1],
      };
    }

    // 8.01版本修改：格式5 - 包含对象的数组，如 [{"职业":[[["无","描述"]]]}, "描述"]
    if (value.length === 2 && typeof value[1] === 'string' && typeof value[0] === 'object' && value[0] !== null) {
      Logger.log('[MVU Converter] 分支逻辑：提取格式5数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0],
        description: value[1],
      };
    }

    // 8.02版本修改：格式6 - 包含数组的数组，如 [{"职业":[[["无","描述"]]]}, "描述"]
    if (value.length === 2 && typeof value[1] === 'string' && Array.isArray(value[0])) {
      Logger.log('[MVU Converter] 分支逻辑：提取格式6数据');
      Logger.log('[MVU Converter] 接口结束：extractArrayData()');
      return {
        data: value[0],
        description: value[1],
      };
    }

    // 默认情况
    Logger.log('[MVU Converter] 分支逻辑：使用默认数据提取');
    Logger.log('[MVU Converter] 接口结束：extractArrayData()');
    return {
      data: value,
      description: '',
    };
  },

  /**
   * 7.84版本修改：获取指定键的描述信息
   * @private
   * @param {string} key - 键名
   * @param {Object} parentNode - 父节点
   * @returns {string} 描述信息
   */
  getDescriptionForKey: function (key, parentNode) {
    // 尝试从父节点的注释或其他地方获取描述
    // 这里可以根据实际需要扩展描述获取逻辑
    return '';
  },

  /**
   * 8.0版本修改：递归处理JSON节点 - 修复递归判定漏洞
   * @private
   */
  processNode: function (currentNode, path, dataParent, yamlParent, level) {
    Logger.log(`[MVU Converter] 接口触发：processNode() - 路径: ${path.join('.')}`);

    for (const key in currentNode) {
      if (key === '$meta') continue;
      const value = currentNode[key];
      const newPath = [...path, key];
      const indent = '  '.repeat(level);

      Logger.log(
        `[MVU Converter] 分支逻辑：处理键 "${key}", 值类型: ${typeof value}, 是否为数组: ${Array.isArray(value)}`,
      );
      Logger.log(`[MVU Converter] 调试：键 "${key}" 的值: ${JSON.stringify(value).substring(0, 200)}...`);
      Logger.log(`[MVU Converter] 调试：当前路径: ${newPath.join('.')}`);

      // 8.0版本修改：获取描述信息用于判断可增删列表结构
      const description = this.getDescriptionForKey(key, currentNode);

      // 8.03版本修改：详细分析节点类型
      Logger.log(`[MVU Converter] 调试：节点 "${key}" 详细分析:`);
      Logger.log(`  - 值类型: ${typeof value}`);
      Logger.log(`  - 是否为数组: ${Array.isArray(value)}`);
      Logger.log(`  - 数组长度: ${Array.isArray(value) ? value.length : 'N/A'}`);
      if (Array.isArray(value) && value.length > 0) {
        Logger.log(`  - 第一个元素类型: ${typeof value[0]}`);
        Logger.log(`  - 第一个元素是否为数组: ${Array.isArray(value[0])}`);
        if (value.length > 1) {
          Logger.log(`  - 第二个元素类型: ${typeof value[1]}`);
        }
      }

      // 8.0版本修改：优先检查数组格式，修复递归判定漏洞
      if (this.isArrayDataFormat(value)) {
        Logger.log(`[MVU Converter] 分支逻辑：检测到数组数据格式，键: "${key}"，跳过对象处理逻辑`);
        Logger.log(`[MVU Converter] 调试：数组内容: ${JSON.stringify(value)}`);
        const { data, description } = this.extractArrayData(value);
        Logger.log(`[MVU Converter] 调试：提取的数据: ${JSON.stringify(data)}`);
        Logger.log(`[MVU Converter] 调试：提取的描述: ${description}`);
        dataParent[key] = data;

        // 8.044版本修改：对于包含子对象的数组数据格式，只生成键名和注释，不包含变量引用
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          Logger.log(`[MVU Converter] 分支逻辑：数组数据包含对象，生成键名和注释，递归处理子属性`);
          yamlParent.push(`${indent}${key}: # ${description}`);
          this.processNode(data, newPath, dataParent[key], yamlParent, level + 1);
        } else {
          // 对于基本类型数据，生成变量引用和注释
          const mdPath = `${this.ROOT_VARIABLE_NAME}.${newPath.join('.')}`;
          yamlParent.push(`${indent}${key}: {{get_message_variable::${mdPath}}} # ${description}`);
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        value.$meta?.recursiveExtensible
      ) {
        Logger.log(`[MVU Converter] 分支逻辑：检测到递归可增删列表结构，键: "${key}"`);
        dataParent[key] = {};
        this.handleRecursiveExtensibleList(value, newPath, dataParent[key], yamlParent, level + 1);
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        // 8.0版本修改：所有节点同等对待，删除根节点防护条件
        this.isExtensibleListStructure(value, description)
      ) {
        Logger.log(`[MVU Converter] 分支逻辑：检测到可增删列表结构，键: "${key}"`);
        dataParent[key] = {};
        this.handleExtensibleList(value, newPath, dataParent[key], yamlParent, level + 1);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Logger.log(`[MVU Converter] 分支逻辑：检测到普通对象，键: "${key}"`);
        yamlParent.push(`${indent}${key}:`);
        dataParent[key] = {};
        this.processNode(value, newPath, dataParent[key], yamlParent, level + 1);
      } else {
        Logger.log(`[MVU Converter] 分支逻辑：检测到基本类型值，键: "${key}"`);
        dataParent[key] = value;
        const mdPath = `${this.ROOT_VARIABLE_NAME}.${newPath.join('.')}`;
        yamlParent.push(`${indent}${key}: {{get_message_variable::${mdPath}}}`);
      }
    }

    Logger.log(`[MVU Converter] 接口结束：processNode() - 路径: ${path.join('.')}`);
  },

  /**
   * 8.2版本修改：统一处理可增删列表结构，不再区分extensible和recursiveExtensible
   * @private
   */
  handleExtensibleList: function (listNode, path, dataParent, yamlParent, level) {
    Logger.log('[MVU Converter] 接口触发：handleExtensibleList()');
    Logger.log(`[MVU Converter] 分支逻辑：处理统一可增删列表，路径: ${path.join('.')}`);

    const loopVar = `${path[path.length - 1].toLowerCase()}Name`;
    // 8.033版本修改：生成唯一的items变量名，支持中文变量名
    const uniqueItemsVar = this.generateUniqueVariableName(path);
    let templateObject = null;

    const listKey = Object.keys(listNode).find(k => k.endsWith('列表'));
    const templateKey = Object.keys(listNode).find(k => k !== '$meta' && k !== listKey);
    if (templateKey) templateObject = listNode[templateKey];

    // 8.043版本修改：对于无模板键的递归可增删列表，使用第一个实例作为模板
    if (!templateKey && !listKey) {
      const instanceKeys = Object.keys(listNode).filter(k => k !== '$meta');
      if (instanceKeys.length > 0) {
        const firstInstanceKey = instanceKeys[0];
        templateObject = listNode[firstInstanceKey];
        Logger.log(`[MVU Converter] 分支逻辑：无明确模板键，使用第一个实例作为模板: ${firstInstanceKey}`);
      }
    }

    // 8.2版本修改：统一处理$meta属性，保持向后兼容
    if (listNode.$meta) {
      // 保持原始的$meta属性，但统一处理逻辑
      dataParent['$meta'] = { ...listNode.$meta };
      Logger.log(`[MVU Converter] 分支逻辑：保留$meta属性:`, listNode.$meta);
    } else {
      // 8.2版本修改：统一设置为extensible，不再区分类型
      dataParent['$meta'] = { extensible: true };
      Logger.log(`[MVU Converter] 分支逻辑：设置统一$meta属性: extensible: true`);
    }

    // 8.042版本修改：处理列表数据，提取所有数据项
    if (listKey && Array.isArray(listNode[listKey])) {
      const extractedData = [];
      const descriptions = [];

      for (const item of listNode[listKey]) {
        if (Array.isArray(item) && item.length === 2) {
          extractedData.push(item[0]);
          descriptions.push(item[1]);
        } else {
          extractedData.push(item);
        }
      }

      dataParent[listKey] = extractedData;
      Logger.log(`[MVU Converter] 分支逻辑：提取列表数据: ${listKey} = ${JSON.stringify(extractedData)}`);

      // 生成Yaml描述
      if (descriptions.length > 0) {
        const mdPath = `${this.ROOT_VARIABLE_NAME}.${[...path, listKey].join('.')}`;
        yamlParent.push(`${listKey}: {{get_message_variable::${mdPath}}} # ${descriptions.join(', ')}`);
        Logger.log(`[MVU Converter] 分支逻辑：生成列表Yaml: ${listKey}`);
      }
    }

    // 8.2版本修改：统一处理模板对象，根据结构类型选择生成方式
    if (templateObject) {
      const finalTemplateKey = templateKey || '模板';
      Logger.log(`[MVU Converter] 分支逻辑：处理模板对象: ${finalTemplateKey}`);

      // 8.2版本修改：统一处理策略，根据实际需求决定是否保存数据
      const shouldSaveData = this.shouldSaveInstanceData(listNode);

      if (shouldSaveData) {
        // 保存模板数据
        const processedTemplate = {};
        for (const key in templateObject) {
          if (key === '$meta') continue;
          const value = templateObject[key];
          if (Array.isArray(value) && value.length === 2) {
            processedTemplate[key] = value[0]; // 只保留数据部分
          } else {
            processedTemplate[key] = value;
          }
        }
        if (templateKey) {
          dataParent[templateKey] = processedTemplate;
          Logger.log(`[MVU Converter] 分支逻辑：保存模板数据: ${templateKey}`);
        }
      } else {
        // 不保存实例数据，只保留$meta
        Logger.log(`[MVU Converter] 分支逻辑：跳过实例数据保存，只保留$meta`);
      }

      // 8.2.001版本修复：统一生成EJS模板，不再区分简单和复杂结构
      // 所有可增删列表都使用相同的EJS模板格式
      // 8.304版本修复：保留原始数组格式信息，用于生成类型注释
      const processedTemplateObject = {};
      const originalTemplateObject = {}; // 保存原始格式用于类型注释
      for (const key in templateObject) {
        if (key === '$meta') continue;
        const value = templateObject[key];
        if (Array.isArray(value) && value.length === 2) {
          // 对于数组格式 [数据, 描述]，保留数据部分用于模板生成，同时保存原始格式用于类型注释
          processedTemplateObject[key] = value[0];
          originalTemplateObject[key] = value;
        } else {
          processedTemplateObject[key] = value;
          originalTemplateObject[key] = value;
        }
      }
      // v8.321: 修复EJS模板生成调用，确保可增删列表正确生成YAML
      this.generateExtensibleListEjsTemplate(path, processedTemplateObject, originalTemplateObject, yamlParent, level);
    }

    Logger.log('[MVU Converter] 接口结束：handleExtensibleList()');
  },

  /**
   * 8.2版本修改：统一处理递归可增删列表结构，复用可增删列表的处理逻辑
   * @private
   */
  handleRecursiveExtensibleList: function (listNode, path, dataParent, yamlParent, level) {
    Logger.log('[MVU Converter] 接口触发：handleRecursiveExtensibleList()');
    Logger.log(`[MVU Converter] 分支逻辑：处理递归可增删列表，路径: ${path.join('.')}`);

    // 8.2版本修改：统一处理逻辑，复用可增删列表的处理方式
    // 递归可增删列表本质上与普通可增删列表相同，都生成EJS模板格式
    this.handleExtensibleList(listNode, path, dataParent, yamlParent, level);

    Logger.log('[MVU Converter] 接口结束：handleRecursiveExtensibleList()');
  },

  /**
   * 8.043版本新增：为可增删列表生成EJS动态遍历模板
   * @private
   * @param {Array} path - 路径数组
   * @param {Object} templateObject - 模板对象
   * @param {Object} originalTemplateObject - 原始模板对象（保留类型信息）
   * @param {Array} yamlParent - YAML输出数组
   * @param {number} level - 缩进级别
   */
  generateExtensibleListEjsTemplate: function (path, templateObject, originalTemplateObject, yamlParent, level = 0) {
    const containerName = path[path.length - 1]; // 如: 背包
    const varName = containerName.toLowerCase(); // 如: 背包 -> 背包 (保持中文)

    // 生成适合的变量名
    let dataVar, namesVar, itemVar, nameVar;
    if (/^[a-zA-Z]/.test(containerName)) {
      // 英文变量名
      dataVar = `${varName}Data`;
      namesVar = `${varName}Names`;
      itemVar = `item`; // 8.2.002版本修复：统一使用item变量名
      nameVar = `${varName}Name`;
    } else {
      // 中文变量名 - 使用特殊格式
      dataVar = `${varName}Data`;
      namesVar = `${varName}Names`;
      itemVar = `item`; // 8.2.002版本修复：统一使用item变量名
      nameVar = `${varName}Name`;
    }

    Logger.log(`[MVU Converter] 分支逻辑：生成EJS模板，容器: ${containerName}, 变量: ${itemVar}`);

    // v8.322: 重新设计合理的缩进逻辑，根据层级关系计算
    // 顶层容器名应该无缩进，子级按层级递增
    const indent = '  '.repeat(Math.max(0, level - 1)); // 顶层level=1 -> 0缩进
    yamlParent.push(`${indent}${containerName}:`);

    // 生成EJS模板开始部分
    yamlParent.push('<%_');
    // 8.3版本修复：使用完整路径而不是仅容器名称
    const fullPath = path.join('.');
    yamlParent.push(`  const ${dataVar} = getvar('${this.ROOT_VARIABLE_NAME}.${fullPath}') || {};`);
    yamlParent.push(`  const ${namesVar} = Object.keys(${dataVar});`);
    yamlParent.push('');
    yamlParent.push(`  if (${namesVar}.length > 0) {`);
    yamlParent.push(`    ${namesVar}.forEach(${nameVar} => {`);
    yamlParent.push(`      const ${itemVar} = ${dataVar}[${nameVar}];`);
    yamlParent.push('_%>');

    // 生成动态对象名
    // v8.322: 根据层级计算缩进，动态对象名应该是容器名的子级
    const dynamicIndent = '  '.repeat(level); // 容器名是level，动态对象名是level+1
    yamlParent.push(`${dynamicIndent}<%= ${nameVar} %>:`);

    // 生成模板字段
    // v8.322: 根据层级计算缩进，字段应该是动态对象名的子级
    this.generateTemplateFields(templateObject, originalTemplateObject, itemVar, yamlParent, level + 1);

    // 生成EJS模板结束部分
    yamlParent.push('<%_');
    yamlParent.push('    });');
    yamlParent.push('  }');
    yamlParent.push('_%>');
  },

  /**
   * 8.2.001版本新增：递归生成模板字段，支持嵌套结构
   * @private
   * @param {Object} templateObject - 模板对象
   * @param {Object} originalTemplateObject - 原始模板对象（保留类型信息）
   * @param {string} itemVar - 项目变量名
   * @param {Array} yamlParent - YAML输出数组
   * @param {number} level - 缩进级别
   */
  generateTemplateFields: function (templateObject, originalTemplateObject, itemVar, yamlParent, level = 0) {
    // v8.322: 根据层级计算缩进，字段应该是动态对象名的子级
    const ejsIndent = '  '.repeat(level); // 根据传入的level计算缩进

    for (const key in templateObject) {
      if (key === '$meta') continue;
      const value = templateObject[key];
      const originalValue = originalTemplateObject[key];

      if (Array.isArray(originalValue) && originalValue.length === 2) {
        // 处理数组格式 [数据, 描述]，使用原始格式生成类型注释
        const [data, description] = originalValue;
        // 8.306版本修复：移除数据类型前缀，保持与测试期望一致
        yamlParent.push(`${ejsIndent}${key}: <%= ${itemVar}.${key} %> # ${description}`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 处理嵌套对象
        yamlParent.push(`${ejsIndent}${key}:`);
        // 递归调用时，需要传递对应的原始嵌套对象
        const originalNestedObject = originalValue && typeof originalValue === 'object' ? originalValue : {};
        this.generateTemplateFields(value, originalNestedObject, `${itemVar}.${key}`, yamlParent, level + 1);
      } else {
        // 处理其他类型
        yamlParent.push(`${ejsIndent}${key}: <%= ${itemVar}.${key} %>`);
      }
    }
  },

  /**
   * 8.2版本新增：智能判断是否应该保存实例数据
   * 统一处理可增删列表的数据保存策略
   * @private
   * @param {Object} listNode - 可增删列表节点
   * @returns {boolean} 是否应该保存实例数据
   */
  shouldSaveInstanceData: function (listNode) {
    Logger.log('[MVU Converter] 接口触发：shouldSaveInstanceData()');

    // 检查是否有明确的$meta标识
    if (listNode.$meta) {
      // 如果明确标识为recursiveExtensible，不保存数据
      if (listNode.$meta.recursiveExtensible === true) {
        Logger.log('[MVU Converter] 分支逻辑：明确标识为recursiveExtensible，不保存实例数据');
        return false;
      }
      // 如果明确标识为extensible，保存数据
      if (listNode.$meta.extensible === true) {
        Logger.log('[MVU Converter] 分支逻辑：明确标识为extensible，保存实例数据');
        return true;
      }
    }

    // 8.2版本修改：对于简单用户结构，总是保存数据
    // 检查实例的复杂程度
    const instanceKeys = Object.keys(listNode).filter(k => k !== '$meta');
    let hasComplexStructure = false;
    let simpleInstanceCount = 0;

    for (const key of instanceKeys) {
      const value = listNode[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // 检查是否有嵌套对象
        let hasNestedObjects = false;
        for (const subKey in value) {
          const subValue = value[subKey];
          if (
            subValue &&
            typeof subValue === 'object' &&
            !Array.isArray(subValue) &&
            Object.keys(subValue).length > 0
          ) {
            hasNestedObjects = true;
            break;
          }
        }

        if (hasNestedObjects) {
          hasComplexStructure = true;
        } else {
          simpleInstanceCount++;
        }
      }
    }

    // 8.2版本修改：对于简单结构，总是保存数据
    if (simpleInstanceCount >= instanceKeys.length * 0.5) {
      Logger.log(`[MVU Converter] 分支逻辑：检测到${simpleInstanceCount}个简单结构实例，保存实例数据`);
      return true;
    }

    // 如果有复杂结构，不保存数据
    if (hasComplexStructure) {
      Logger.log('[MVU Converter] 分支逻辑：检测到复杂结构，不保存实例数据');
      return false;
    }

    // 默认保存数据
    Logger.log('[MVU Converter] 分支逻辑：默认保存实例数据');
    return true;
  },

  /**
   * 8.2版本新增：获取容器名称
   * @private
   * @param {Object} listNode - 可增删列表节点
   * @returns {string} 容器名称
   */
  getContainerName: function (listNode) {
    // 这里可以根据实际路径或其他方式获取容器名称
    // 暂时返回一个默认值，后续可以根据需要完善
    return 'unknown';
  },

  /**
   * 专门为EJS模板生成Yaml行
   * @private
   */
  generateTemplateYaml: function (currentNode, path, yamlParent, level, loopVar, useConditional = false) {
    for (const key in currentNode) {
      if (key === '$meta') continue;
      const value = currentNode[key];
      const newPath = [...path, key];
      const indent = '  '.repeat(level);

      if (useConditional) {
        // 使用EJS条件判断模式
        if (Array.isArray(value) && value.length === 2 && typeof value[1] === 'string') {
          const [, description] = value;
          const ejsPath = `${loopVar}${newPath.length > 0 ? '.' : ''}${newPath.join('.')}`;
          yamlParent.push(`${indent}<%_ if (${ejsPath} && Array.isArray(${ejsPath}) && ${ejsPath}.length === 2) { _%>`);
          yamlParent.push(`${indent}${key}: <%= ${ejsPath}[0] %> # ${description}`);
          yamlParent.push(`${indent}<%_ } _%>`);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const ejsPath = `${loopVar}${newPath.length > 0 ? '.' : ''}${newPath.join('.')}`;
          yamlParent.push(
            `${indent}<%_ if (${ejsPath} && typeof ${ejsPath} === 'object' && !Array.isArray(${ejsPath})) { _%>`,
          );
          yamlParent.push(`${'#'.repeat(level + 2)} ${key}`);
          this.generateTemplateYaml(value, newPath, yamlParent, level + 1, loopVar, useConditional);
          yamlParent.push(`${indent}<%_ } _%>`);
        } else {
          // 处理其他类型（基本类型）
          const ejsPath = `${loopVar}${newPath.length > 0 ? '.' : ''}${newPath.join('.')}`;
          yamlParent.push(`${indent}<%_ if (${ejsPath} !== undefined && ${ejsPath} !== null) { _%>`);
          yamlParent.push(`${indent}${key}: <%= ${ejsPath} %>`);
          yamlParent.push(`${indent}<%_ } _%>`);
        }
      } else if (Array.isArray(value) && value.length === 2 && typeof value[1] === 'string') {
        // 原有逻辑
        const [, description] = value;
        const ejsPath = `${loopVar}${newPath.length > 0 ? '.' : ''}${newPath.join('.')}`;
        yamlParent.push(`${indent}${key}: <%= ${ejsPath} %> # ${description}`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.generateTemplateYaml(value, newPath, yamlParent, level + 1, loopVar);
      } else {
        // 处理其他类型
        const ejsPath = `${loopVar}${newPath.length > 0 ? '.' : ''}${newPath.join('.')}`;
        yamlParent.push(`${indent}${key}: <%= ${ejsPath} %>`);
      }
    }
  },

  /**
   * 生成对象结构签名，用于模板去重
   * @private
   */
  generateStructureSignature: function (obj) {
    const signature = {};

    for (const key in obj) {
      if (key === '$meta') continue;
      const value = obj[key];

      if (Array.isArray(value) && value.length === 2) {
        signature[key] = 'array_with_description';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        signature[key] = this.generateStructureSignature(value);
      } else {
        signature[key] = typeof value;
      }
    }

    return JSON.stringify(signature);
  },

  /**
   * v8.313: 已废弃，请使用 generateUnifiedYamlOutput 统一接口
   * @deprecated 此接口将在未来版本中移除
   */
  generateSimplifiedEjsYaml: function (data, yaml) {
    Logger.warn('[MVU Converter] 警告：generateSimplifiedEjsYaml 已废弃，请使用 generateUnifiedYamlOutput 统一接口');
    // 为了向后兼容，调用统一接口
    return this.generateUnifiedYamlOutput(data, true);
  },

  /**
   * 生成泛化实例（包含所有可能的key结构）
   * @private
   */
  generateGeneralizedInstance: function (data, path = []) {
    const instance = {};

    for (const [key, value] of Object.entries(data)) {
      if (key === '$meta') continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 递归处理嵌套对象
        instance[key] = this.generateGeneralizedInstance(value, [...path, key]);
      } else if (Array.isArray(value) && value.length === 2) {
        // 数组格式转换为变量引用
        const [data, description] = value;
        const varName = this.generateVariableName([...path, key]);
        instance[key] = `<%= ${varName} %> # ${description}`;
      } else {
        // 基本类型转换为变量引用
        const varName = this.generateVariableName([...path, key]);
        instance[key] = `<%= ${varName} %>`;
      }
    }

    return instance;
  },

  /**
   * 生成变量名
   * @private
   */
  generateVariableName: function (path) {
    // 生成变量名，如 "身体状态.年龄值"
    return path.join('.') + '值';
  },

  /**
   * v8.313: 已废弃，请使用 generateUnifiedYamlOutput 统一接口
   * @deprecated 此接口将在未来版本中移除
   */
  generateYamlOutput: function (data, yaml, hideCode = false) {
    Logger.warn('[MVU Converter] 警告：generateYamlOutput 已废弃，请使用 generateUnifiedYamlOutput 统一接口');
    // 为了向后兼容，调用统一接口
    return this.generateUnifiedYamlOutput(data, hideCode);
  },

  /**
   * v8.313: 统一YAML生成接口 - 完全黑盒设计
   * @param {Object} inputData - 输入数据
   * @param {boolean} hideCode - 是否隐藏代码部分（可选，默认false）
   * @returns {string} 统一的YAML输出字符串
   */
  generateUnifiedYamlOutput: function (inputData, hideCode = false) {
    Logger.log('[MVU Converter] 接口触发：generateUnifiedYamlOutput() - 统一YAML生成接口');

    try {
      // v8.321: 优先使用原始输入数据生成YAML，确保包含完整的模板信息
      const dataToProcess = this.originalInputData || inputData;
      Logger.log('[MVU Converter] 分支逻辑：使用数据源:', this.originalInputData ? '原始输入数据' : '传入数据');

      // 完全黑盒：只处理输入，输出结果，中间逻辑完全封装
      const dataOutput = {};
      const yamlLines = [];

      // 核心逻辑：调用processNode生成YAML
      this.processNode(dataToProcess, [], dataOutput, yamlLines, 0);

      // 后处理：根据hideCode参数决定是否过滤代码部分
      const finalYamlLines = hideCode ? this.filterCodeSections(yamlLines) : yamlLines;

      // 直接返回字符串，完全黑盒
      const yamlString = finalYamlLines.join('\n');

      Logger.log('[MVU Converter] 接口结束：generateUnifiedYamlOutput()');
      return yamlString;
    } catch (error) {
      Logger.error('[MVU Converter] YAML生成失败:', error);
      return `# YAML生成失败: ${error.message}`;
    }
  },

  /**
   * v8.313: 重构为使用统一接口，直接获得字符串输出
   * @private
   */
  updateOutput: function (hideCode) {
    // 8.055版本修改：添加parentDoc定义，修复隐藏代码按钮更新问题
    const parentDoc = window.parent.document;
    const outputElement = parentDoc.getElementById('mvu-output-yaml');
    if (outputElement && this.lastData) {
      // v8.619: 优先使用缓存的原始世界书YAML作为注释基准，确保"隐藏代码"功能与失焦同步兼容 //{8.619}
      let baselineYaml = '';
      if (this._originalWorldBookYaml && this._originalWorldBookYaml.trim()) {
        baselineYaml = this._originalWorldBookYaml;
        Logger.log('[MVU Converter] v8.619: 使用缓存的世界书YAML作为注释基准');
      } else {
        // 如果没有缓存的世界书YAML，使用当前输出内容作为基准
        baselineYaml = outputElement.textContent || '';
        Logger.log('[MVU Converter] v8.619: 使用当前输出内容作为注释基准');
      }

      if (baselineYaml.trim()) {
        // 基于原始注释重新生成YAML，然后应用"隐藏代码"过滤
        const commentMap = this._extractYamlComments(baselineYaml);
        const newYaml = this._generateYamlPreserveCommentsAndOrder(this.lastData, commentMap);
        // 应用"隐藏代码"过滤
        const finalYaml = hideCode ? this.filterCodeSections(newYaml.split('\n')).join('\n') : newYaml;
        outputElement.textContent = finalYaml;
        Logger.log('[MVU Converter] v8.619: 基于原始注释重新生成YAML并应用隐藏代码过滤');
      } else {
        // 回退到原有逻辑
        const yamlContent = this.generateUnifiedYamlOutput(this.lastData, hideCode);
        outputElement.textContent = yamlContent;
        Logger.log('[MVU Converter] v8.619: 回退到原有逻辑');
      }
    }
  },

  // v8.517: 从现有YAML提取字段到注释映射（仅根据结构，不做语义判断）
  //{8.517}: 提取yaml已有的注释用于保留
  _extractYamlComments: function (yamlText) {
    const commentMap = new Map();
    if (!yamlText || typeof yamlText !== 'string') {
      Logger.warn('[MVU Converter] v8.617: YAML文本为空或无效，返回空注释映射');
      return commentMap;
    }

    Logger.log('[MVU Converter] v8.617: 开始提取YAML注释，文本长度:', yamlText.length);
    Logger.log(
      '[MVU Converter] v8.617: YAML文本预览:',
      yamlText.substring(0, 200) + (yamlText.length > 200 ? '...' : ''),
    );

    const lines = yamlText.split(/\r?\n/);
    Logger.log('[MVU Converter] v8.617: 解析到YAML行数:', lines.length);

    const stack = [];
    let extractedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw; // 保留原样
      if (!line.trim()) continue;

      // 计算缩进级别（两个空格为一级）
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indent / 2);

      // 匹配键: 形如 "key:" 或 "key: value"
      const kv = line.trim().match(/^(?<key>[^:#]+?):/);
      if (!kv || !kv.groups || !kv.groups.key) continue;

      const key = kv.groups.key.trim();
      // 维护路径栈
      while (stack.length > level) stack.pop();
      stack[level] = key;
      const path = stack.slice(0, level + 1).join('.');

      // 抽取注释（# 后面的内容）
      const hashIdx = line.indexOf('#');
      if (hashIdx >= 0) {
        const comment = line.substring(hashIdx + 1).trim();
        if (comment) {
          commentMap.set(path, comment);
          extractedCount++;
          Logger.log(`[MVU Converter] v8.617: 提取注释 [${path}]: ${comment}`);
        }
      }
    }

    Logger.log(`[MVU Converter] v8.617: YAML注释提取完成，共提取 ${extractedCount} 个注释`);
    return commentMap;
  },

  // v8.517: 基于JSON结构生成YAML，保留已有注释，缺失字段补 "# {用户填写描述}"，并按JSON顺序输出
  //{8.517}: 仅依据数据结构进行判断
  _generateYamlPreserveCommentsAndOrder: function (jsonObj, commentMap) {
    Logger.log('[MVU Converter] v8.617: 开始生成YAML，输入对象键数:', Object.keys(jsonObj || {}).length);
    Logger.log('[MVU Converter] v8.617: 注释映射大小:', commentMap.size);
    Logger.log('[MVU Converter] v8.617: 注释映射内容:', Array.from(commentMap.entries()));

    const lines = [];
    let fieldCount = 0;

    const walk = (node, path, level) => {
      const indent = '  '.repeat(level);
      for (const key of Object.keys(node)) {
        if (key === '$meta') continue; // 跳过元数据 //8.517: 不使用$meta生成字段
        const value = node[key];
        const newPath = [...path, key];
        const pathStr = newPath.join('.');

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // {8.620}: 对象节点：仅在存在注释时才输出注释，否则仅输出键 //{8.620}
          const existingComment = this._findExistingCommentOrNull(pathStr, commentMap); //{8.620}: 新增辅助
          if (existingComment) {
            lines.push(`${indent}${key}: # ${existingComment}`);
            Logger.log(`[MVU Converter] v8.620: 生成对象字段 [${pathStr}] 注释: ${existingComment}`);
          } else {
            lines.push(`${indent}${key}:`);
            Logger.log(`[MVU Converter] v8.620: 生成对象字段 [${pathStr}] 无注释`);
          }
          walk(value, newPath, level + 1);
        } else if (Array.isArray(value)) {
          // 数组按基本类型处理为占位引用，无法识别结构时仍生成变量引用
          const comment = this._findBestMatchingComment(pathStr, commentMap);
          lines.push(`${indent}${key}: {{get_message_variable::${this.ROOT_VARIABLE_NAME}.${pathStr}}} # ${comment}`);
          Logger.log(`[MVU Converter] v8.617: 生成数组字段 [${pathStr}] 注释: ${comment}`);
          fieldCount++;
        } else {
          // 基本类型：输出变量引用并保留注释
          const comment = this._findBestMatchingComment(pathStr, commentMap);
          lines.push(`${indent}${key}: {{get_message_variable::${this.ROOT_VARIABLE_NAME}.${pathStr}}} # ${comment}`);
          Logger.log(`[MVU Converter] v8.617: 生成基本字段 [${pathStr}] 注释: ${comment}`);
          fieldCount++;
        }
      }
    };

    if (jsonObj && typeof jsonObj === 'object') {
      walk(jsonObj, [], 0);
    }

    const result = lines.join('\n');
    Logger.log(`[MVU Converter] v8.617: YAML生成完成，共生成 ${fieldCount} 个字段，${lines.length} 行`);
    Logger.log(
      '[MVU Converter] v8.617: 生成的YAML预览:',
      result.substring(0, 300) + (result.length > 300 ? '...' : ''),
    );

    return result;
  },

  // v8.618: 智能查找最佳匹配的注释，处理特殊字符键的路径匹配问题 //{8.618}: 修复路径匹配
  _findBestMatchingComment: function (pathStr, commentMap) {
    // 1. 直接匹配
    if (commentMap.has(pathStr)) {
      Logger.log(`[MVU Converter] v8.618: 直接匹配成功 [${pathStr}]`);
      return commentMap.get(pathStr);
    }

    // 2. 尝试清理特殊字符后匹配
    const cleanPath = pathStr.replace(/[{}]/g, '').replace(/['"]/g, '');
    if (commentMap.has(cleanPath)) {
      Logger.log(`[MVU Converter] v8.618: 清理特殊字符后匹配成功 [${pathStr}] -> [${cleanPath}]`);
      return commentMap.get(cleanPath);
    }

    // 3. 尝试模糊匹配（包含关系）
    for (const [storedPath, comment] of commentMap.entries()) {
      const cleanStoredPath = storedPath.replace(/[{}]/g, '').replace(/['"]/g, '');
      if (cleanPath === cleanStoredPath) {
        Logger.log(`[MVU Converter] v8.618: 模糊匹配成功 [${pathStr}] -> [${storedPath}]`);
        return comment;
      }
    }

    // 4. 返回默认注释
    Logger.log(`[MVU Converter] v8.618: 未找到匹配注释 [${pathStr}]，使用默认注释`);
    return '{用户填写描述}';
  },

  /**
   * v8.318: 修复代码部分过滤功能，用于隐藏代码部分
   * @param {Array} yamlLines - YAML行数组
   * @returns {Array} 过滤后的YAML行数组
   */
  filterCodeSections: function (yamlLines) {
    const filteredLines = [];
    let inCodeSection = false;

    for (const line of yamlLines) {
      const trimmedLine = line.trim();

      // 检查是否进入或退出代码段
      if (trimmedLine === '<%_' || trimmedLine === '_%>') {
        inCodeSection = !inCodeSection;
        continue; // 跳过代码标记行
      }

      // 如果不在代码段中，保留该行
      if (!inCodeSection) {
        filteredLines.push(line);
      }
      // 如果在代码段中，跳过该行（不保留JavaScript代码）
    }

    return filteredLines;
  },

  /**
   * 生成递归模板结构
   */
  generateRecursiveTemplate: function (obj, baseVar, yamlParent, indent) {
    const spaces = '  '.repeat(indent);

    for (const key in obj) {
      if (key === '$meta') continue;
      const value = obj[key];

      if (Array.isArray(value) && value.length === 2) {
        // 处理 [数据, 描述] 格式
        const [data, description] = value;
        const dataType = typeof data === 'number' ? 'number' : typeof data === 'string' ? 'string' : 'object';
        yamlParent.push(`${spaces}${key}: <%= ${baseVar}.${key} %> # ${dataType}。${description}`);
        Logger.log(`[MVU Converter] 分支逻辑：生成模板字段: ${key} (${dataType})`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 处理嵌套对象
        yamlParent.push(`${spaces}${key}:`);
        this.generateRecursiveTemplate(value, `${baseVar}.${key}`, yamlParent, indent + 1);
        Logger.log(`[MVU Converter] 分支逻辑：递归处理嵌套对象: ${key}`);
      } else {
        // 处理基本类型
        const dataType = typeof value === 'number' ? 'number' : typeof value === 'string' ? 'string' : 'object';
        yamlParent.push(`${spaces}${key}: <%= ${baseVar}.${key} %> # ${dataType}。`);
        Logger.log(`[MVU Converter] 分支逻辑：生成基本类型字段: ${key} (${dataType})`);
      }
    }
  },

  /**
   * 8.043版本新增：将旧版JSON数据转换为新版JSON数据结构（移除实例数据，只保留$meta）
   * @param {Object} input - 输入的JSON数据
   * @returns {Object} 转换后的JSON数据结构
   */
  convertToJsonStructure: function (input) {
    Logger.log('[MVU Converter] 接口触发：convertToJsonStructure()'); //8.043: 新版JSON数据结构转换功能
    if (!input || typeof input !== 'object') {
      Logger.log('[MVU Converter] 分支逻辑：输入无效，返回空对象');
      return {};
    }

    // v8.321: 缓存原始输入数据，用于YAML生成
    this.originalInputData = JSON.parse(JSON.stringify(input));
    Logger.log('[MVU Converter] 分支逻辑：已缓存原始输入数据');

    // 首先进行智能分析，添加$meta标识
    const fullDataVersion = this.createFullDataVersion(input);

    // 8.044版本修复：转换旧版Json格式为纯数据格式
    const convertedData = this.convertOldJsonFormat(fullDataVersion);

    // 然后移除实例数据，只保留结构和$meta
    const structureOnlyVersion = this.removeInstanceDataKeepMeta(convertedData);

    Logger.log('[MVU Converter] 接口结束：convertToJsonStructure()');
    return structureOnlyVersion;
  },

  /**
   * 8.044版本新增：将旧版Json格式[数据,描述]转换为纯数据格式
   * @param {Object} obj - 要处理的对象
   * @returns {Object} 转换后的对象
   */
  convertOldJsonFormat: function (obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertOldJsonFormat(item));
    }

    const result = {};
    for (const key in obj) {
      const value = obj[key];

      // 检查是否为旧版Json格式 [数据,描述]
      if (this.isArrayDataFormat(value)) {
        const { data } = this.extractArrayData(value);
        // 8.044版本修复：如果提取的数据是对象，需要递归处理
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          result[key] = this.convertOldJsonFormat(data);
        } else {
          result[key] = data;
        }
        Logger.log(
          `[MVU Converter] 分支逻辑：转换旧版Json格式 ${key}: [${JSON.stringify(value[0])}, "${
            value[1]
          }"] -> ${JSON.stringify(result[key])}`,
        );
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 递归处理嵌套对象
        result[key] = this.convertOldJsonFormat(value);
      } else {
        // 保持其他类型不变
        result[key] = value;
      }
    }

    return result;
  },

  /**
   * 8.043版本新增：移除实例数据但保留$meta的函数
   * @param {Object} obj - 要处理的对象
   * @returns {Object} 处理后的对象
   */
  removeInstanceDataKeepMeta: function (obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeInstanceDataKeepMeta(item));
    }

    const result = {};
    for (const key in obj) {
      if (key === '$meta') {
        // 保留$meta属性
        if (obj[key] && typeof obj[key] === 'object') {
          result[key] = { ...obj[key] };
        }
      } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        // 检查是否为可增删列表
        if (obj[key].$meta && (obj[key].$meta.recursiveExtensible || obj[key].$meta.extensible)) {
          // 8.3版本修复：对于可增删列表，只保留$meta，移除实例数据
          result[key] = { $meta: { ...obj[key].$meta } };
          Logger.log(`[MVU Converter] 分支逻辑：移除可增删列表实例数据: ${key}, 保留$meta:`, obj[key].$meta);
        } else {
          result[key] = this.removeInstanceDataKeepMeta(obj[key]);
        }
      } else {
        // 对于基本类型，在非可增删列表中保留
        result[key] = obj[key];
      }
    }

    return result;
  },

  /**
   * 8.043版本新增：检测Json数据结构版本
   * @param {Object} input - 要检测的Json数据
   * @returns {string} 检测结果: 'old', 'new', 'mixed', 'unknown'
   */
  detectJsonVersion: function (input) {
    Logger.log('[MVU Converter] 接口触发：detectJsonVersion()'); //8.043: Json版本检测功能
    if (!input || typeof input !== 'object') {
      Logger.log('[MVU Converter] 分支逻辑：输入无效，返回unknown');
      return 'unknown';
    }
    let hasOldFormat = false;
    let hasNewFormat = false;
    const checkNode = (node, path = '') => {
      if (!node || typeof node !== 'object') {
        return;
      }
      for (const key in node) {
        if (key === '$meta') continue; // 跳过元数据
        const value = node[key];
        const currentPath = path ? `${path}.${key}` : key;
        if (Array.isArray(value) && value.length === 2 && typeof value[1] === 'string') {
          hasOldFormat = true;
          Logger.log(`[MVU Converter] 分支逻辑：发现旧版格式: ${currentPath} = [${value[0]}, "${value[1]}"]`);
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // 8.1版本修复：递归检查对象，而不是直接标记为新版格式
          checkNode(value, currentPath);
        } else if (value !== null && typeof value !== 'object' && !Array.isArray(value)) {
          // 8.1版本修复：只有当值不是对象也不是数组时才标记为新版格式
          hasNewFormat = true;
          Logger.log(`[MVU Converter] 分支逻辑：发现新版格式: ${currentPath} = ${value}`);
        }
      }
    };
    checkNode(input);
    let result;
    if (hasOldFormat && hasNewFormat) {
      result = 'mixed';
    } else if (hasOldFormat) {
      result = 'old';
    } else if (hasNewFormat) {
      result = 'new';
    } else {
      result = 'unknown';
    }
    Logger.log(`[MVU Converter] 接口结束：detectJsonVersion() - 检测结果: ${result}`);
    return result;
  },

  /**
   * 8.3版本新增：网页赋值数据验证接口 - 验证赋值前的数据准备
   * @param {Object} jsonData - 要赋值的JSON数据
   * @param {Object} options - 赋值选项
   * @param {boolean} options.toMessage - 是否赋值到消息变量
   * @param {boolean} options.toChat - 是否赋值到Chat变量
   * @param {number} options.messageId - 消息ID（可选）
   * @returns {Object} 数据验证结果
   */
  validateWebAssignment: function (jsonData, options = {}) {
    Logger.log('[MVU Converter] 接口触发：validateWebAssignment()');
    Logger.log('[MVU Converter] 输入数据:', JSON.stringify(jsonData, null, 2));
    Logger.log('[MVU Converter] 验证选项:', JSON.stringify(options, null, 2));

    const result = {
      success: false,
      messageData: null,
      chatData: null,
      errors: [],
      details: {},
      validationSteps: [],
    };

    try {
      // 步骤1：验证输入数据
      result.validationSteps.push('验证输入数据');
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('输入数据无效：必须是有效的对象');
      }

      // 步骤2：验证选项参数
      result.validationSteps.push('验证选项参数');
      if (options.toMessage === false && options.toChat === false) {
        throw new Error('至少需要选择一个赋值目标（消息变量或Chat变量）');
      }

      // 步骤3：准备消息变量数据
      if (options.toMessage !== false) {
        result.validationSteps.push('准备消息变量数据');
        result.messageData = {
          [this.ROOT_VARIABLE_NAME]: jsonData,
        };
        result.details.messageId = options.messageId || 'auto';
      }

      // 步骤4：准备Chat变量数据
      if (options.toChat !== false) {
        result.validationSteps.push('准备Chat变量数据');
        result.chatData = {
          [this.ROOT_VARIABLE_NAME]: jsonData,
        };
      }

      // 步骤5：验证数据结构完整性
      result.validationSteps.push('验证数据结构完整性');
      const validateDataStructure = (data, path = '') => {
        if (data === null || data === undefined) {
          throw new Error(`数据路径 ${path} 包含无效值`);
        }
        if (typeof data === 'object' && !Array.isArray(data)) {
          for (const key in data) {
            validateDataStructure(data[key], path ? `${path}.${key}` : key);
          }
        }
      };
      validateDataStructure(jsonData);

      // 步骤6：验证数据大小（防止过大）
      result.validationSteps.push('验证数据大小');
      const dataSize = JSON.stringify(jsonData).length;
      if (dataSize > 1000000) {
        // 1MB限制
        throw new Error(`数据过大：${dataSize} 字节，超过1MB限制`);
      }
      result.details.dataSize = dataSize;

      // 步骤7：验证特殊字符
      result.validationSteps.push('验证特殊字符');
      const checkSpecialChars = (obj, path = '') => {
        if (typeof obj === 'string') {
          if (obj.includes('\u0000')) {
            throw new Error(`数据路径 ${path} 包含空字符`);
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            checkSpecialChars(obj[key], path ? `${path}.${key}` : key);
          }
        }
      };
      checkSpecialChars(jsonData);

      // 步骤8：验证API可用性（模拟）
      result.validationSteps.push('验证API可用性');
      const requiredAPIs = ['getLastMessageId', 'replaceVariables', 'insertOrAssignVariables'];
      const missingAPIs = [];

      for (const api of requiredAPIs) {
        if (typeof global[api] !== 'function') {
          missingAPIs.push(api);
        }
      }

      if (missingAPIs.length > 0) {
        result.warnings = [`模拟环境：缺少API函数: ${missingAPIs.join(', ')}`];
      }

      // 验证成功
      result.success = true;
      result.details.validationPassed = true;
      result.details.stepsCompleted = result.validationSteps.length;

      Logger.log('[MVU Converter] 数据验证成功');
      Logger.log('[MVU Converter] 验证结果:', JSON.stringify(result, null, 2));
    } catch (error) {
      Logger.error('[MVU Converter] validateWebAssignment过程中发生错误:', error);
      result.errors.push(error.message);
      result.details.validationPassed = false;
    }

    Logger.log('[MVU Converter] 接口结束：validateWebAssignment()');
    return result;
  },

  /**
   * 8.303版本重构：基于数据结构特征判断是否为实例特征，而非键名语义
   * @private
   * @param {Array} keys - 键名数组
   * @param {Object} node - 当前节点对象，用于分析子字段结构
   * @returns {boolean} 是否具有实例特征
   */
  hasInstanceKeyPattern: function (keys, node) {
    if (!keys || !Array.isArray(keys) || keys.length === 0 || !node) return false;

    // 方法1：检查是否有数字键（数组索引特征）
    const hasNumericKeys = keys.some(k => /^\d+$/.test(k));
    if (hasNumericKeys) {
      Logger.log('[MVU Converter] 分支逻辑：检测到数字键，具有实例特征');
      return true;
    }

    // 8.303版本重构：基于数据结构特征判断，而非键名语义
    // 检查键名是否具有明显的实例特征

    // 方法2：检查是否有完全相同的键名（重复键名特征）
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size < keys.length) {
      Logger.log('[MVU Converter] 分支逻辑：检测到重复键名，具有实例特征');
      return true;
    }

    // 方法3：检查键名是否具有递增模式（如：item1, item2, item3）
    if (this.checkIncrementalPattern(keys)) {
      Logger.log('[MVU Converter] 分支逻辑：检测到递增模式，具有实例特征');
      return true;
    }

    // 方法4：基于数据结构特征判断 - 检查子字段结构一致性
    if (this.checkStructuralConsistency(keys, node)) {
      Logger.log('[MVU Converter] 分支逻辑：检测到结构一致性，具有实例特征');
      return true;
    }

    // 8.303版本重构：移除语义判断，只保留纯结构特征判断

    // 默认情况下，不认为具有实例特征，需要更严格的判断
    Logger.log('[MVU Converter] 分支逻辑：键名不具有明显的实例特征，需要更严格的结构分析');
    return false;
  },

  /**
   * 8.303版本新增：检查子字段结构一致性
   * @private
   * @param {Array} keys - 键名数组
   * @param {Object} node - 当前节点对象
   * @returns {boolean} 子字段结构是否一致
   */
  checkStructuralConsistency: function (keys, node) {
    if (keys.length < 2) return false;

    // 获取第一个子项的结构作为参考
    const firstKey = keys[0];
    const firstValue = node[firstKey];

    if (!firstValue || typeof firstValue !== 'object' || Array.isArray(firstValue)) {
      return false;
    }

    const firstStructure = Object.keys(firstValue);
    if (firstStructure.length === 0) return false;

    // 检查其他子项是否具有相同的结构
    let consistentCount = 1; // 第一个已经算一个
    for (let i = 1; i < keys.length; i++) {
      const key = keys[i];
      const value = node[key];

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      const currentStructure = Object.keys(value);

      // 检查结构是否一致（字段名和数量相同）
      if (currentStructure.length === firstStructure.length) {
        const hasSameFields = firstStructure.every(field => currentStructure.includes(field));
        if (hasSameFields) {
          consistentCount++;
        }
      }
    }

    // 如果80%以上的子项具有相同结构，认为是实例特征
    const consistencyRatio = consistentCount / keys.length;
    const isConsistent = consistencyRatio >= 0.8 && consistentCount >= 2;

    if (isConsistent) {
      Logger.log(`[MVU Converter] 分支逻辑：结构一致性检查通过，一致性比例: ${(consistencyRatio * 100).toFixed(1)}%`);
    }

    return isConsistent;
  },

  /**
   * 8.302版本新增：检查键名是否有递增模式（如：item1, item2, item3）
   * @private
   * @param {Array} keys - 键名数组
   * @returns {boolean} 是否有递增模式
   */
  checkIncrementalPattern: function (keys) {
    if (keys.length < 3) return false; // 至少3个键才能有递增模式

    // 尝试提取数字后缀
    const patterns = [];
    for (const key of keys) {
      const match = key.match(/^(.+?)(\d+)$/);
      if (match) {
        patterns.push({
          prefix: match[1],
          number: parseInt(match[2]),
        });
      }
    }

    // 如果提取到足够多的模式，检查数字是否递增
    if (patterns.length >= 3) {
      // 按前缀分组
      const groups = {};
      patterns.forEach(pattern => {
        if (!groups[pattern.prefix]) {
          groups[pattern.prefix] = [];
        }
        groups[pattern.prefix].push(pattern.number);
      });

      // 检查每个分组是否有递增模式
      for (const [prefix, numbers] of Object.entries(groups)) {
        if (numbers.length >= 3) {
          const sortedNumbers = numbers.sort((a, b) => a - b);
          // 检查是否为连续递增（允许间隔为1）
          let isIncremental = true;
          for (let i = 1; i < sortedNumbers.length; i++) {
            if (sortedNumbers[i] - sortedNumbers[i - 1] !== 1) {
              isIncremental = false;
              break;
            }
          }
          if (isIncremental) {
            return true;
          }
        }
      }
    }

    return false;
  },

  // v8.414: 从世界书获取JSON内容（[InitVar]）
  getJsonFromWorldBook: async function () {
    Logger.log('[MVU Converter] 接口触发：getJsonFromWorldBook()'); // v8.414
    try {
      const bookName = await this._getCharacterWorldBook();
      Logger.log(`[MVU Converter] 分支逻辑：获取世界书 '${bookName}' 的条目`);
      const entries = await getLorebookEntries(bookName);
      if (!entries || entries.length === 0) {
        Logger.warn('[MVU Converter] 警告：世界书中没有找到条目');
        return null;
      }
      for (const entry of entries) {
        if (entry.comment && entry.comment.includes(this.WI_JSON_KEY)) {
          Logger.log('[MVU Converter] 日志：找到JSON条目，返回其内容');
          return entry.content || '';
        }
      }
      Logger.warn('[MVU Converter] 警告：在世界书中未找到JSON条目');
      return null;
    } catch (error) {
      Logger.error('[MVU Converter] 获取世界书JSON内容时发生错误:', error);
      return null;
    }
  },

  // v8.620: 查找已有注释（若不存在则返回null），用于对象键是否附加注释的判定 //{8.620}
  _findExistingCommentOrNull: function (pathStr, commentMap) {
    // 直接匹配
    if (commentMap.has(pathStr)) return commentMap.get(pathStr);
    // 清理特殊字符后匹配
    const cleanPath = pathStr.replace(/[{}]/g, '').replace(/['"]/g, '');
    if (commentMap.has(cleanPath)) return commentMap.get(cleanPath);
    // 遍历等价匹配
    for (const [storedPath, comment] of commentMap.entries()) {
      const cleanStoredPath = storedPath.replace(/[{}]/g, '').replace(/['"]/g, '');
      if (cleanStoredPath === cleanPath) return comment;
    }
    return null;
  },
};

Logger.log('[MVU Converter] 模块已成功加载并初始化。');
Logger.log(`[MVU Converter] Version: ${mvuConverter.VERSION} loaded.`);
Logger.log(`[MVU Converter] 构建时间: ${new Date(mvuConverter.BUILD_TIME).toLocaleString()}`);
Logger.log(`[MVU Converter] 缓存破坏符: ${mvuConverter.CACHE_BUSTER}`);
// ==================================================================
// == 模块结束
// ==================================================================

// 绑定到UI按钮
const bindButton = () => {
  try {
    // 检查全局和当前作用域中的 eventOnButton
    const eventOnButtonFunc =
      typeof eventOnButton !== 'undefined'
        ? eventOnButton
        : typeof global !== 'undefined' && global.eventOnButton
        ? global.eventOnButton
        : null;

    if (typeof eventOnButtonFunc === 'function') {
      eventOnButtonFunc('MVU变量转化器', () => {
        Logger.log('[MVU Converter] "MVU变量转化器" 按钮被点击，调用 showModal()');
        mvuConverter.showModal();
      });
      Logger.log('[MVU Converter] 成功绑定到 "MVU变量转化器" 按钮。');
    } else {
      // 在Node.js测试环境中，不需要UI按钮绑定
      if (typeof module !== 'undefined' && module.exports) {
        Logger.log('[MVU Converter] Node.js环境检测到，跳过UI按钮绑定。');
        return;
      }
      Logger.warn('[MVU Converter] eventOnButton 函数未定义，等待延迟绑定...');
      setTimeout(bindButton, 1000); // 1秒后重试
    }
  } catch (e) {
    Logger.error('[MVU Converter] 绑定按钮事件失败。请确保您已创建名为 "MVU变量转化器" 的脚本按钮。', e);
  }
};

// 立即尝试绑定，如果失败则延迟重试
bindButton();

// 导出 mvuConverter 对象以支持 Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mvuConverter, Logger };
}
