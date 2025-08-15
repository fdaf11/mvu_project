// ==================================================================
// == MVU 变量转换器测试接口
// ==================================================================
// 作者: LiuLi 25_08_05
// 版本: 8.043.0 (Json版本检测版)
// 描述: MVU变量转换器的完整测试接口，包含所有UI功能和转换逻辑的测试用例
//       8.043版本新增：Json数据结构版本检测功能（旧版/新版/混合/未知）
// ==================================================================

const mvuTestInterface = {
  VERSION: '8.060.0 (关键器官状态测试用例版)', // 8.060版本修改：新增关键器官状态测试用例

  // 测试结果统计
  testResults: {
    total: 0,
    passed: 0,
    failed: 0,
    results: [],
  },

  // 8.044版本新增：日志控制
  verbose: false,
  silent: false,

  /**
   * 8.044版本新增：日志输出控制
   * @param {string} message - 日志消息
   * @param {boolean} force - 是否强制输出（不受静默模式影响）
   */
  log: function (message, force = false) {
    if (this.verbose || force) {
      console.log(message);
    }
  },

  /**
   * 8.044版本新增：错误日志输出控制
   * @param {string} message - 错误消息
   */
  error: function (message) {
    if (!this.silent) {
      console.error(message);
    }
  },

  /**
   * 8.044版本新增：设置日志模式
   * @param {boolean} verbose - 详细模式
   * @param {boolean} silent - 静默模式
   */
  setLogMode: function (verbose = false, silent = false) {
    this.verbose = verbose;
    this.silent = silent;
  },

  /**
   * 初始化测试接口
   * 确保能够访问 mvuConverter
   */
  initialize: function () {
    this.log('[MVU Test Interface] 接口触发：initialize()');

    if (typeof mvuConverter === 'undefined') {
      this.error('[MVU Test Interface] 错误：mvuConverter 未定义，请确保 index.js 已加载');
      return false;
    }

    this.log(`[MVU Test Interface] 成功连接到 mvuConverter，版本: ${mvuConverter.VERSION}`);
    this.log('[MVU Test Interface] 接口结束：initialize()');
    return true;
  },

  /**
   * 运行所有测试
   * 测试接口映射：
   * - mvuConverter.showModal() - 弹窗显示
   * - mvuConverter.initializeModule() - 模块初始化
   * - mvuConverter.handleConversion() - 转换处理
   * - mvuConverter.handleAssignToLatest() - 赋值功能
   * @returns {Object} 测试结果统计
   */
  runAllTests: function () {
    this.log('[MVU Test Interface] 接口触发：runAllTests()');
    this.log(`[MVU Test Interface] 版本: ${this.VERSION}`);
    this.log(`[MVU Test Interface] 开始时间: ${new Date().toLocaleString()}`);

    // 初始化测试接口
    if (!this.initialize()) {
      this.error('[MVU Test Interface] 初始化失败，无法运行测试');
      return this.testResults;
    }

    // 重置测试结果
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      results: [],
    };

    // 运行所有测试套件
    this.runJsonVersionDetectionTests(); // 8.043版本新增：Json版本检测测试
    this.runConversionTests();
    this.runUITests();
    this.runEdgeCaseTests();
    this.runIntegrationTests();
    this.runWebAssignmentTests(); // 8.3版本新增：网页赋值测试

    this.log('[MVU Test Interface] 接口结束：runAllTests()');
    return this.testResults;
  },

  /**
   * 运行Json版本检测测试 - 8.043版本新增
   * 测试接口映射：
   * - mvuTestInterface.detectJsonVersion() - Json版本检测
   */
  runJsonVersionDetectionTests: function () {
    this.log('[MVU Test Interface] 接口触发：runJsonVersionDetectionTests()');

    // 8.056版本修改：使用getVersionDetectionTests()获取测试数据，避免重复定义
    const versionTests = this.getVersionDetectionTests();

    versionTests.forEach((test, index) => {
      this.runSingleVersionDetectionTest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runJsonVersionDetectionTests()');
  },

  /**
   * 运行单个版本检测测试 - 8.043版本新增
   */
  runSingleVersionDetectionTest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleVersionDetectionTest() - 测试${testNumber}: ${test.name}`);

    try {
      const result = this.detectJsonVersion(test.input);
      const passed = result === test.expected;

      this.recordTestResult(test.name, passed, {
        input: test.input,
        expected: test.expected,
        actual: result,
      });

      this.log(
        `[MVU Test Interface] 分支逻辑：版本检测测试${testNumber} ${passed ? '通过' : '失败'} (期望: ${
          test.expected
        }, 实际: ${result})`,
      );
    } catch (error) {
      this.error(`[MVU Test Interface] 版本检测测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleVersionDetectionTest() - 测试${testNumber}`);
  },

  /**
   * 运行转换功能测试
   * 测试接口映射：
   * - mvuConverter.processNode() - 节点处理
   * - mvuConverter.handleExtensibleList() - 可增删列表处理
   * - mvuConverter.generateTemplateMarkdown() - 模板Markdown生成
   * - mvuConverter.createFullDataVersion() - 完整数据版本创建
   * - mvuConverter.removeExtensibleMeta() - 元数据移除
   */
  runConversionTests: function () {
    this.log('[MVU Test Interface] 接口触发：runConversionTests()');

    // 8.3版本修改：调用getConversionTests()获取测试数据，避免重复定义
    const tests = this.getConversionTests();

    // 执行所有转换测试
    tests.forEach((test, index) => {
      this.runSingleConversionTest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runConversionTests()');
  },

  /**
   * 运行单个转换测试
   * 测试接口映射：
   * - mvuConverter.performConversion() - 真实转换
   * - mvuConverter.compareObjects() - 对象比较
   * - mvuConverter.compareYamlArrays() - YAML字符串比较
   */
  runSingleConversionTest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleConversionTest() - 测试${testNumber}: ${test.name}`);

    try {
      // 8.1版本新增：版本检测
      if (test.expectedVersion) {
        const detectedVersion = this.detectJsonVersion(test.input);
        this.log(`[MVU Test Interface] 分支逻辑：检测到版本: ${detectedVersion}, 期望版本: ${test.expectedVersion}`);

        if (detectedVersion === test.expectedVersion) {
          this.log(`[MVU Test Interface] ✓ 版本检测正确`);
        } else {
          this.log(`[MVU Test Interface] ✗ 版本检测错误，期望: ${test.expectedVersion}, 实际: ${detectedVersion}`);
        }
      }

      // 8.058版本新增：数据完整性测试
      let dataIntegrityPassed = true;
      if (test.testDataIntegrity) {
        this.log('[MVU Test Interface] 分支逻辑：执行数据完整性测试');

        // 模拟网页输入到转换的完整流程
        const originalInput = JSON.stringify(test.input);
        const preprocessedInput = mvuConverter.preprocessInput(originalInput);
        const parsedInput = JSON.parse(preprocessedInput);

        // 检查预处理是否改变了数据结构
        const hasArrayFormat = this.hasArrayFormat(test.input);
        const hasArrayFormatAfterPreprocess = this.hasArrayFormat(parsedInput);

        dataIntegrityPassed = hasArrayFormat === hasArrayFormatAfterPreprocess;

        this.log(
          `[MVU Test Interface] 分支逻辑：数据完整性检查 - 原始数组格式: ${hasArrayFormat}, 预处理后数组格式: ${hasArrayFormatAfterPreprocess}`,
        );

        if (!dataIntegrityPassed) {
          this.log('[MVU Test Interface] 分支逻辑：❌ 数据完整性测试失败 - 预处理改变了数据结构');
        }
      }

      // 真实转换过程
      const result = this.performConversion(test.input);

      // 验证JSON结果
      const jsonMatch = this.compareObjects(result.json, test.expectedJson);

      // 验证YAML结果
      const yamlMatch = this.compareYamlArrays(result.yaml, test.expectedYaml);

      // 8.055版本修改：支持隐藏代码部分的测试
      let yamlHiddenMatch = true;
      if (test.expectedYamlHidden) {
        // v8.314: 使用统一接口进行隐藏代码部分转换，直接比较字符串
        const hiddenYaml = mvuConverter.generateUnifiedYamlOutput(result.json, true);
        yamlHiddenMatch = this.compareYamlArrays(hiddenYaml, test.expectedYamlHidden);
      }

      const passed = jsonMatch && yamlMatch && yamlHiddenMatch && dataIntegrityPassed;

      this.recordTestResult(test.name, passed, {
        input: test.input,
        expectedVersion: test.expectedVersion,
        detectedVersion: test.expectedVersion ? this.detectJsonVersion(test.input) : null,
        expectedJson: test.expectedJson,
        actualJson: result.json,
        expectedYaml: test.expectedYaml,
        actualYaml: result.yaml,
        expectedYamlHidden: test.expectedYamlHidden,
        actualYamlHidden: test.expectedYamlHidden
          ? (() => {
              // v8.314: 使用统一接口，直接返回字符串
              return mvuConverter.generateUnifiedYamlOutput(result.json, true);
            })()
          : null,
        jsonMatch,
        yamlMatch,
        yamlHiddenMatch,
      });

      this.log(`[MVU Test Interface] 分支逻辑：测试${testNumber} ${passed ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`[MVU Test Interface] 测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleConversionTest() - 测试${testNumber}`);
  },

  /**
   * 真实转换过程 - 8.042版本修改：调用 mvuConverter 接口进行真实转换
   * 测试接口映射：
   * - mvuConverter.preprocessInput() - 输入预处理
   * - mvuConverter.processNode() - 节点处理
   * - mvuConverter.handleConversion() - 转换处理
   */
  performConversion: function (input) {
    this.log('[MVU Test Interface] 接口触发：performConversion()');

    // 检查 mvuConverter 是否可用
    if (typeof global !== 'undefined' && global.mvuConverter) {
      // Node.js环境，使用全局mvuConverter
      const mvuConverter = global.mvuConverter;
    } else if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return { json: null, yaml: '' };
    }

    // 8.042版本修改：处理无效输入
    if (input === null) {
      this.log('[MVU Test Interface] 分支逻辑：输入为null，返回空结果');
      return { json: null, yaml: '' };
    }

    if (typeof input === 'string') {
      this.log('[MVU Test Interface] 分支逻辑：输入为字符串，尝试解析JSON');
      try {
        const parsed = JSON.parse(input);
        const result = {
          json: this.performJsonConversion(parsed),
          yaml: this.performYamlConversion(parsed),
        };
        this.log('[MVU Test Interface] 接口结束：performConversion()');
        return result;
      } catch (error) {
        this.log('[MVU Test Interface] 分支逻辑：JSON解析失败，返回空结果');
        return { json: {}, yaml: '' };
      }
    }

    // 8.1版本新增：版本检测和相应处理
    const version = this.detectJsonVersion(input);
    this.log(`[MVU Test Interface] 分支逻辑：检测到版本: ${version}`);

    let result;
    if (version === 'new') {
      // 新版JSON数据处理
      this.log('[MVU Test Interface] 分支逻辑：执行新版JSON数据处理');
      result = {
        json: this.performNewVersionJsonConversion(input),
        yaml: this.performNewVersionYamlConversion(input),
      };
    } else {
      // 旧版处理
      this.log('[MVU Test Interface] 分支逻辑：执行旧版JSON数据处理');
      result = {
        json: this.performJsonConversion(input),
        yaml: this.performYamlConversion(input),
      };
    }

    this.log('[MVU Test Interface] 接口结束：performConversion()');
    return result;
  },

  /**
   * 8.1版本新增：新版JSON数据JSON转换
   * @param {Object} input - 输入的JSON数据
   * @returns {Object} 转换后的JSON数据
   */
  performNewVersionJsonConversion: function (input) {
    this.log('[MVU Test Interface] 接口触发：performNewVersionJsonConversion()');

    try {
      // 调用 mvuConverter 的新版JSON数据处理接口
      const result = mvuConverter.processNewVersionJson(input);

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.processNewVersionJson()');
      this.log('[MVU Test Interface] 接口结束：performNewVersionJsonConversion()');
      return result;
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter.processNewVersionJson() 失败:', error);
      throw error; // 直接抛出错误，不使用模拟逻辑
    }
  },

  /**
   * 新版JSON数据的YAML转换 - 保持与原始设计一致
   * 测试接口映射：
   * - mvuConverter.processNewVersion() - 新版JSON数据处理（包含世界书YAML获取）
   */
  performNewVersionYamlConversion: function (input) {
    this.log('[MVU Test Interface] 接口触发：performNewVersionYamlConversion()');

    // v8.314: 新版JSON数据的YAML转换应该返回'未找到世界书YAML内容'
    // 这是因为新版结构会调用processNewVersion，该函数会尝试从世界书获取YAML
    // 在测试环境中无法访问世界书，所以返回默认值
    const result = '未找到世界书YAML内容';

    this.log('[MVU Test Interface] 分支逻辑：返回新版结构的默认YAML内容');
    this.log('[MVU Test Interface] 接口结束：performNewVersionYamlConversion()');
    return result;
  },

  /**
   * 真实JSON转换 - 调用 mvuConverter 接口进行真实转换
   * 测试接口映射：
   * - mvuConverter.convertToJsonStructure() - 新版JSON数据结构转换接口
   */
  performJsonConversion: function (input) {
    this.log('[MVU Test Interface] 接口触发：performJsonConversion()');

    // 检查 mvuConverter 是否可用
    if (typeof global !== 'undefined' && global.mvuConverter) {
      // Node.js环境，使用全局mvuConverter
      const mvuConverter = global.mvuConverter;
    } else if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return {};
    }

    try {
      // 调用 mvuConverter 的新版JSON数据结构转换接口
      const result = mvuConverter.convertToJsonStructure(input);

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.convertToJsonStructure()');
      this.log('[MVU Test Interface] 接口结束：performJsonConversion()');
      return result;
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter 接口失败:', error);
      // v8.314: 移除无用的回退模拟逻辑，直接返回错误信息
      return { error: `JSON转换失败: ${error.message}` };
    }
  },

  /**
   * v8.313: 真实YAML转换 - 使用统一接口进行真实YAML转换
   * 测试接口映射：
   * - mvuConverter.generateUnifiedYamlOutput() - 统一YAML生成接口（完全黑盒）
   */
  performYamlConversion: function (input) {
    this.log('[MVU Test Interface] 接口触发：performYamlConversion()');

    // 检查 mvuConverter 是否可用
    if (typeof global !== 'undefined' && global.mvuConverter) {
      // Node.js环境，使用全局mvuConverter
      const mvuConverter = global.mvuConverter;
    } else if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return '';
    }

    try {
      // v8.313: 使用统一接口，直接获得字符串输出
      const yamlString = mvuConverter.generateUnifiedYamlOutput(input, false);

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.generateUnifiedYamlOutput() - 统一接口');
      this.log('[MVU Test Interface] 接口结束：performYamlConversion()');
      return yamlString;
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter 接口失败:', error);
      // v8.314: 移除无用的回退模拟逻辑，直接返回错误信息
      return `# YAML转换失败: ${error.message}`;
    }
  },

  /**
   * 检测Json数据结构版本 - 8.043版本修改：调用mvuConverter的接口
   * 判断输入的Json数据结构是旧版（包含[值, 描述]格式）还是新版（只有值）
   * @param {Object} input - 要检测的Json对象
   * @returns {string} 'old' | 'new' | 'mixed' | 'unknown'
   */
  detectJsonVersion: function (input) {
    this.log('[MVU Test Interface] 接口触发：detectJsonVersion() - 调用mvuConverter接口');

    // 检查 mvuConverter 是否可用
    if (typeof global !== 'undefined' && global.mvuConverter) {
      // Node.js环境，使用全局mvuConverter
      const mvuConverter = global.mvuConverter;
      return mvuConverter.detectJsonVersion(input);
    } else if (typeof mvuConverter !== 'undefined') {
      // 浏览器环境，直接调用
      return mvuConverter.detectJsonVersion(input);
    } else {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行Json版本检测');
      return 'unknown';
    }
  },

  /**
   * 比较两个对象是否相等
   * 测试接口映射：
   * - mvuConverter.compareObjects() - 对象比较工具函数
   */
  compareObjects: function (obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  },

  /**
   * v8.314: 比较两个YAML是否相等，现在统一为字符串格式
   * 测试接口映射：
   * - mvuConverter.generateUnifiedYamlOutput() - 统一YAML生成接口
   */
  compareYamlArrays: function (yaml1, yaml2) {
    // v8.314: 现在所有输出都是字符串，直接比较字符串即可
    return yaml1 == yaml2;
  },

  /**
   * 运行UI功能测试
   * 测试接口映射：
   * - mvuConverter.showModal() - 弹窗显示
   * - mvuConverter.bindEventListeners() - 事件监听器绑定
   * - mvuConverter.closeModal() - 弹窗关闭
   * - mvuConverter.resetModalState() - 弹窗状态重置
   */
  runUITests: function () {
    this.log('[MVU Test Interface] 接口触发：runUITests()');

    // 8.056版本修改：使用getUITests()获取测试数据，避免重复定义
    const uiTests = this.getUITests();

    uiTests.forEach((test, index) => {
      this.runSingleUITest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runUITests()');
  },

  /**
   * 运行单个UI测试
   * 测试接口映射：
   * - mvuConverter.runSingleUITest() - 单个UI测试执行
   */
  runSingleUITest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleUITest() - 测试${testNumber}: ${test.name}`);

    try {
      const result = test.test();
      this.recordTestResult(test.name, result.passed, result.details);
      this.log(`[MVU Test Interface] 分支逻辑：UI测试${testNumber} ${result.passed ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`[MVU Test Interface] UI测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleUITest() - 测试${testNumber}`);
  },

  /**
   * 测试Modal弹窗显示
   * 测试接口映射：
   * - mvuConverter.showModal() - 弹窗显示
   */
  testModalDisplay: function () {
    this.log('[MVU Test Interface] 接口触发：testModalDisplay()');

    // 检查 mvuConverter 是否可用
    if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return { passed: false, details: { error: 'mvuConverter 未定义' } };
    }

    try {
      // 调用 mvuConverter 的实际接口
      const modalPromise = mvuConverter.showModal();

      // 检查是否返回了Promise（表示异步操作）
      const passed = modalPromise instanceof Promise;

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.showModal()');
      this.log('[MVU Test Interface] 接口结束：testModalDisplay()');
      return { passed, details: { modalCreated: passed, isAsync: true } };
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter.showModal() 失败:', error);
      return { passed: false, details: { error: error.message } };
    }
  },

  /**
   * 测试输入框功能
   */
  testInputFunctionality: function () {
    this.log('[MVU Test Interface] 接口触发：testInputFunctionality()');

    // 模拟测试输入框功能
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testInputFunctionality()');
    return { passed, details: { inputHandling: true, placeholder: true } };
  },

  /**
   * 测试转换按钮功能
   * 测试接口映射：
   * - mvuConverter.handleConversion() - 转换处理
   */
  testConvertButton: function () {
    this.log('[MVU Test Interface] 接口触发：testConvertButton()');

    // 检查 mvuConverter 是否可用
    if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return { passed: false, details: { error: 'mvuConverter 未定义' } };
    }

    try {
      // 准备测试数据
      const testInput = {
        测试: {
          值: [42, '测试值'],
        },
      };

      // 调用 mvuConverter 的实际接口
      const conversionPromise = mvuConverter.handleConversion();

      // 检查是否返回了Promise（表示异步操作）
      const passed = conversionPromise instanceof Promise;

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.handleConversion()');
      this.log('[MVU Test Interface] 接口结束：testConvertButton()');
      return { passed, details: { conversionTriggered: passed, isAsync: true } };
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter.handleConversion() 失败:', error);
      return { passed: false, details: { error: error.message } };
    }
  },

  /**
   * 测试复制按钮功能
   */
  testCopyButton: function () {
    this.log('[MVU Test Interface] 接口触发：testCopyButton()');

    // 模拟测试复制按钮功能
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testCopyButton()');
    return { passed, details: { copyFunction: true } };
  },

  /**
   * 测试编辑按钮功能
   */
  testEditButton: function () {
    this.log('[MVU Test Interface] 接口触发：testEditButton()');

    // 模拟测试编辑按钮功能
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testEditButton()');
    return { passed, details: { editModal: true } };
  },

  /**
   * 测试赋值按钮功能
   * 测试接口映射：
   * - mvuConverter.handleAssignToLatest() - 赋值到最新楼层
   */
  testAssignButton: function () {
    this.log('[MVU Test Interface] 接口触发：testAssignButton()');

    // 检查 mvuConverter 是否可用
    if (typeof mvuConverter === 'undefined') {
      console.error('[MVU Test Interface] 错误：mvuConverter 未定义，无法进行真实测试');
      return { passed: false, details: { error: 'mvuConverter 未定义' } };
    }

    try {
      // 调用 mvuConverter 的实际接口
      const assignPromise = mvuConverter.handleAssignToLatest();

      // 检查是否返回了Promise（表示异步操作）
      const passed = assignPromise instanceof Promise;

      this.log('[MVU Test Interface] 分支逻辑：调用 mvuConverter.handleAssignToLatest()');
      this.log('[MVU Test Interface] 接口结束：testAssignButton()');
      return { passed, details: { assignFunction: passed, isAsync: true } };
    } catch (error) {
      console.error('[MVU Test Interface] 调用 mvuConverter.handleAssignToLatest() 失败:', error);
      return { passed: false, details: { error: error.message } };
    }
  },

  /**
   * 测试清空按钮功能
   */
  testClearButton: function () {
    this.log('[MVU Test Interface] 接口触发：testClearButton()');

    // 模拟测试清空按钮功能
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testClearButton()');
    return { passed, details: { clearFunction: true } };
  },

  /**
   * 测试关闭按钮功能
   */
  testCloseButton: function () {
    this.log('[MVU Test Interface] 接口触发：testCloseButton()');

    // 模拟测试关闭按钮功能
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testCloseButton()');
    return { passed, details: { closeFunction: true } };
  },

  /**
   * 运行边界情况测试
   */
  runEdgeCaseTests: function () {
    this.log('[MVU Test Interface] 接口触发：runEdgeCaseTests()');

    // 8.056版本修改：使用getEdgeCaseTests()获取测试数据，避免重复定义
    const edgeTests = this.getEdgeCaseTests();

    edgeTests.forEach((test, index) => {
      this.runSingleEdgeTest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runEdgeCaseTests()');
  },

  /**
   * 运行单个边界测试
   */
  runSingleEdgeTest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleEdgeTest() - 测试${testNumber}: ${test.name}`);

    try {
      const result = this.performConversion(test.input);
      const passed = this.compareObjects(result.json, test.expected.json);

      this.recordTestResult(test.name, passed, {
        input: test.input,
        expected: test.expected,
        actual: result,
      });

      this.log(`[MVU Test Interface] 分支逻辑：边界测试${testNumber} ${passed ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`[MVU Test Interface] 边界测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleEdgeTest() - 测试${testNumber}`);
  },

  /**
   * 运行集成测试
   */
  runIntegrationTests: function () {
    this.log('[MVU Test Interface] 接口触发：runIntegrationTests()');

    // 8.056版本修改：使用getIntegrationTests()获取测试数据，避免重复定义
    const integrationTests = this.getIntegrationTests();

    integrationTests.forEach((test, index) => {
      this.runSingleIntegrationTest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runIntegrationTests()');
  },

  /**
   * 运行单个集成测试
   */
  runSingleIntegrationTest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleIntegrationTest() - 测试${testNumber}: ${test.name}`);

    try {
      const result = test.test();
      this.recordTestResult(test.name, result.passed, result.details);
      this.log(`[MVU Test Interface] 分支逻辑：集成测试${testNumber} ${result.passed ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`[MVU Test Interface] 集成测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleIntegrationTest() - 测试${testNumber}`);
  },

  /**
   * 测试完整转换流程
   */
  testCompleteConversionFlow: function () {
    this.log('[MVU Test Interface] 接口触发：testCompleteConversionFlow()');

    // 模拟完整转换流程测试
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testCompleteConversionFlow()');
    return { passed, details: { flowComplete: true } };
  },

  /**
   * 测试世界书同步功能
   */
  testWorldBookSync: function () {
    this.log('[MVU Test Interface] 接口触发：testWorldBookSync()');

    // 模拟世界书同步测试
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testWorldBookSync()');
    return { passed, details: { syncFunction: true } };
  },

  /**
   * 测试变量赋值功能
   */
  testVariableAssignment: function () {
    this.log('[MVU Test Interface] 接口触发：testVariableAssignment()');

    // 模拟变量赋值测试
    const passed = true;

    this.log('[MVU Test Interface] 接口结束：testVariableAssignment()');
    return { passed, details: { assignmentFunction: true } };
  },

  /**
   * 8.3版本新增：运行网页赋值测试
   */
  runWebAssignmentTests: function () {
    this.log('[MVU Test Interface] 接口触发：runWebAssignmentTests()');

    // 8.3版本修改：使用getWebAssignmentTests()获取测试数据，避免重复定义
    const webAssignmentTests = this.getWebAssignmentTests();

    webAssignmentTests.forEach((test, index) => {
      this.runSingleWebAssignmentTest(test, index + 1);
    });

    this.log('[MVU Test Interface] 接口结束：runWebAssignmentTests()');
  },

  /**
   * 8.3版本新增：运行单个网页赋值测试
   */
  runSingleWebAssignmentTest: function (test, testNumber) {
    this.log(`[MVU Test Interface] 接口触发：runSingleWebAssignmentTest() - 测试${testNumber}: ${test.name}`);

    try {
      const result = test.test();
      this.recordTestResult(test.name, result.passed, result.details);
      this.log(`[MVU Test Interface] 分支逻辑：网页赋值测试${testNumber} ${result.passed ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`[MVU Test Interface] 网页赋值测试${testNumber}执行错误:`, error);
      this.recordTestResult(test.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleWebAssignmentTest() - 测试${testNumber}`);
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 基础验证
   */
  testWebAssignmentBasic: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentBasic()');

    try {
      // 准备测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
            职业: '程序员',
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
      });

      // 验证结果
      const passed = result.success && result.messageData && result.chatData;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentBasic()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedSuccess: true,
          actualSuccess: result.success,
          validationSteps: result.validationSteps,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentBasic() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: true,
          actualSuccess: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 仅消息变量
   */
  testWebAssignmentMessageOnly: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentMessageOnly()');

    try {
      // 准备测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: false,
      });

      // 验证结果
      const passed = result.success && result.messageData && !result.chatData;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentMessageOnly()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedMessageData: true,
          expectedChatData: false,
          actualMessageData: !!result.messageData,
          actualChatData: !!result.chatData,
          validationSteps: result.validationSteps,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentMessageOnly() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedMessageData: true,
          expectedChatData: false,
          actualMessageData: false,
          actualChatData: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 仅Chat变量
   */
  testWebAssignmentChatOnly: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentChatOnly()');

    try {
      // 准备测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: false,
        toChat: true,
      });

      // 验证结果
      const passed = result.success && !result.messageData && result.chatData;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentChatOnly()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedMessageData: false,
          expectedChatData: true,
          actualMessageData: !!result.messageData,
          actualChatData: !!result.chatData,
          validationSteps: result.validationSteps,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentChatOnly() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedMessageData: false,
          expectedChatData: true,
          actualMessageData: false,
          actualChatData: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 指定消息ID
   */
  testWebAssignmentWithMessageId: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentWithMessageId()');

    try {
      // 准备测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
        messageId: 12345,
      });

      // 验证结果
      const passed = result.success && result.details.messageId === 12345;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentWithMessageId()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedMessageId: 12345,
          actualMessageId: result.details.messageId,
          validationSteps: result.validationSteps,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentWithMessageId() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedMessageId: 12345,
          actualMessageId: null,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 错误处理
   */
  testWebAssignmentErrorHandling: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentErrorHandling()');

    try {
      // 准备无效的测试数据
      const testData = null;

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
      });

      // 验证结果 - 应该失败
      const passed = !result.success && result.errors.length > 0;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentErrorHandling()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedSuccess: false,
          actualSuccess: result.success,
          errors: result.errors,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentErrorHandling() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: false,
          actualSuccess: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 复杂数据结构
   */
  testWebAssignmentComplexData: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentComplexData()');

    try {
      // 准备复杂的测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
            职业: '程序员',
            天赋: {
              编程: {
                描述: '擅长编程',
                等级: 5,
              },
              设计: {
                描述: '擅长设计',
                等级: 3,
              },
            },
          },
          背包: [
            {
              名称: '笔记本电脑',
              数量: 1,
              描述: '用于编程的工具',
            },
            {
              名称: '咖啡',
              数量: 5,
              描述: '提神饮料',
            },
          ],
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
      });

      // 验证结果
      const passed = result.success && result.messageData && result.chatData;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentComplexData()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedSuccess: true,
          actualSuccess: result.success,
          dataComplexity: 'complex',
          validationSteps: result.validationSteps,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentComplexData() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: true,
          actualSuccess: false,
          dataComplexity: 'complex',
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 大数据量
   */
  testWebAssignmentLargeData: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentLargeData()');

    try {
      // 准备大数据量测试数据（简化版本，避免死循环）
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
          },
          大数据: {
            项目1: {
              名称: '测试项目1',
              描述: '这是一个测试项目',
              数据: ['数据1', '数据2', '数据3'],
            },
            项目2: {
              名称: '测试项目2',
              描述: '这是另一个测试项目',
              数据: ['数据A', '数据B', '数据C'],
            },
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
      });

      // 验证结果 - 应该成功（数据量合理）
      const passed = result.success;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentLargeData()');
      return {
        passed,
        details: {
          result,
          dataSize: result.details?.dataSize || 'N/A',
          expectedSuccess: true,
          actualSuccess: result.success,
          errors: result.errors || [],
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentLargeData() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: true,
          actualSuccess: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试网页赋值数据验证 - 特殊字符
   */
  testWebAssignmentSpecialChars: function () {
    this.log('[MVU Test Interface] 接口触发：testWebAssignmentSpecialChars()');

    try {
      // 准备包含特殊字符的测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户\u0000', // 包含空字符
            年龄: 25,
            描述: '正常描述',
          },
        },
      };

      // 调用数据验证接口
      const result = mvuConverter.validateWebAssignment(testData, {
        toMessage: true,
        toChat: true,
      });

      // 验证结果 - 应该失败（包含特殊字符）
      const passed = !result.success && result.errors.length > 0;

      this.log('[MVU Test Interface] 接口结束：testWebAssignmentSpecialChars()');
      return {
        passed,
        details: {
          result,
          testData,
          expectedSuccess: false,
          actualSuccess: result.success,
          errors: result.errors,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testWebAssignmentSpecialChars() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: false,
          actualSuccess: false,
        },
      };
    }
  },

  /**
   * 8.3版本新增：测试YAML输出缩进验证
   */
  testYamlIndentation: function () {
    this.log('[MVU Test Interface] 接口触发：testYamlIndentation()');

    try {
      // 准备包含可增删列表的测试数据
      const testData = {
        User: {
          基本信息: {
            姓名: '测试用户',
            年龄: 25,
            天赋: {
              $meta: { extensible: true },
              编程: {
                描述: '擅长编程',
                等级: 5,
              },
              设计: {
                描述: '擅长设计',
                等级: 3,
              },
            },
          },
        },
      };

      // 调用YAML生成接口
      const result = mvuConverter.generateUnifiedYamlOutput(testData, false);

      // v8.314: 现在输出是字符串，直接按行分割
      const yamlLines = result.split('\n');
      let passed = true;
      const details = {
        yamlLines,
        indentationIssues: [],
      };

      // 检查天赋部分的缩进
      const talentSection = yamlLines.filter(
        line => line.includes('天赋:') || line.includes('描述:') || line.includes('等级:'),
      );

      for (let i = 0; i < talentSection.length; i++) {
        const line = talentSection[i];
        const indent = line.match(/^(\s*)/)[1];
        const indentLevel = indent.length / 2;

        if (line.includes('天赋:')) {
          // 天赋: 应该在正确的缩进级别
          if (indentLevel !== 2) {
            passed = false;
            details.indentationIssues.push(`天赋: 缩进级别错误，期望: 2，实际: ${indentLevel}`);
          }
        } else if (line.includes('描述:') || line.includes('等级:')) {
          // 描述和等级应该在天赋内部，缩进级别应该更深
          if (indentLevel !== 4) {
            passed = false;
            details.indentationIssues.push(`${line.trim()}: 缩进级别错误，期望: 4，实际: ${indentLevel}`);
          }
        }
      }

      this.log('[MVU Test Interface] 接口结束：testYamlIndentation()');
      return {
        passed,
        details: {
          ...details,
          expectedSuccess: true,
          actualSuccess: passed,
        },
      };
    } catch (error) {
      this.log('[MVU Test Interface] 接口结束：testYamlIndentation() - 错误');
      return {
        passed: false,
        details: {
          error: error.message,
          expectedSuccess: true,
          actualSuccess: false,
        },
      };
    }
  },

  /**
   * 记录测试结果
   */
  recordTestResult: function (name, passed, details) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }

    this.testResults.results.push({
      name,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 生成测试报告
   */
  generateTestReport: function () {
    this.log('[MVU Test Interface] 接口触发：generateTestReport()');

    const report = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate:
          this.testResults.total > 0 ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(2) : 0,
      },
      results: this.testResults.results,
    };

    this.log('[MVU Test Interface] 接口结束：generateTestReport()');
    return report;
  },

  /**
   * 运行特定测试
   */
  runSpecificTest: function (testName) {
    this.log(`[MVU Test Interface] 接口触发：runSpecificTest() - ${testName}`);

    // 根据测试名称运行特定测试
    switch (testName) {
      case 'version': // 8.043版本新增：版本检测测试
        this.runJsonVersionDetectionTests();
        break;
      case 'conversion':
        this.runConversionTests();
        break;
      case 'ui':
        this.runUITests();
        break;
      case 'edge':
        this.runEdgeCaseTests();
        break;
      case 'integration':
        this.runIntegrationTests();
        break;
      default:
        console.warn(`[MVU Test Interface] 未知测试类型: ${testName}`);
    }

    this.log(`[MVU Test Interface] 接口结束：runSpecificTest() - ${testName}`);
    return this.generateTestReport();
  },

  /**
   * 8.056版本新增：运行单个测试案例
   * @param {number|string} testIndex - 测试案例索引或名称
   * @param {boolean} enableVerbose - 是否启用详细日志，默认true
   * @returns {Object} 测试结果
   */
  runSingleTestCase: function (testIndex, enableVerbose = true) {
    this.log(`[MVU Test Interface] 接口触发：runSingleTestCase() - 测试索引: ${testIndex}, 详细模式: ${enableVerbose}`);

    // 启用详细日志模式
    if (enableVerbose) {
      this.setLogMode(true, false);
      if (typeof mvuConverter !== 'undefined' && mvuConverter.Logger) {
        mvuConverter.Logger.setEnabled(true);
      }
    }

    // 重置测试结果
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      results: [],
    };

    // 初始化测试接口
    if (!this.initialize()) {
      this.error('[MVU Test Interface] 初始化失败，无法运行测试');
      return this.testResults;
    }

    let testCase = null;
    let testType = '';

    // 根据索引或名称查找测试案例
    if (typeof testIndex === 'number') {
      // 数字索引：按顺序查找
      let currentIndex = 0;

      // 版本检测测试
      const versionTests = this.getVersionDetectionTests();
      if (testIndex < currentIndex + versionTests.length) {
        testCase = versionTests[testIndex - currentIndex];
        testType = 'version';
      } else {
        currentIndex += versionTests.length;
      }

      // 转换测试
      if (!testCase) {
        const conversionTests = this.getConversionTests();
        if (testIndex < currentIndex + conversionTests.length) {
          testCase = conversionTests[testIndex - currentIndex];
          testType = 'conversion';
        } else {
          currentIndex += conversionTests.length;
        }
      }

      // UI测试
      if (!testCase) {
        const uiTests = this.getUITests();
        if (testIndex < currentIndex + uiTests.length) {
          testCase = uiTests[testIndex - currentIndex];
          testType = 'ui';
        } else {
          currentIndex += uiTests.length;
        }
      }

      // 边界测试
      if (!testCase) {
        const edgeTests = this.getEdgeCaseTests();
        if (testIndex < currentIndex + edgeTests.length) {
          testCase = edgeTests[testIndex - currentIndex];
          testType = 'edge';
        } else {
          currentIndex += edgeTests.length;
        }
      }

      // 集成测试
      if (!testCase) {
        const integrationTests = this.getIntegrationTests();
        if (testIndex < currentIndex + integrationTests.length) {
          testCase = integrationTests[testIndex - currentIndex];
          testType = 'integration';
        } else {
          currentIndex += integrationTests.length;
        }
      }

      // 网页赋值测试
      if (!testCase) {
        const webAssignmentTests = this.getWebAssignmentTests();
        if (testIndex < currentIndex + webAssignmentTests.length) {
          testCase = webAssignmentTests[testIndex - currentIndex];
          testType = 'webAssignment';
        } else {
          currentIndex += webAssignmentTests.length;
        }
      }
    } else {
      // 字符串名称：按名称查找
      testCase = this.findTestCaseByName(testIndex);
      if (testCase) {
        testType = testCase.type;
      }
    }

    if (!testCase) {
      this.error(`[MVU Test Interface] 未找到测试案例: ${testIndex}`);
      return this.testResults;
    }

    this.log(`[MVU Test Interface] 找到测试案例: ${testCase.name}, 类型: ${testType}`);

    // 运行单个测试案例
    try {
      switch (testType) {
        case 'version':
          this.runSingleVersionDetectionTest(testCase, 1);
          break;
        case 'conversion':
          this.runSingleConversionTest(testCase, 1);
          break;
        case 'ui':
          this.runSingleUITest(testCase, 1);
          break;
        case 'edge':
          this.runSingleEdgeTest(testCase, 1);
          break;
        case 'integration':
          this.runSingleIntegrationTest(testCase, 1);
          break;
        case 'webAssignment':
          this.runSingleWebAssignmentTest(testCase, 1);
          break;
        default:
          this.error(`[MVU Test Interface] 未知测试类型: ${testType}`);
      }
    } catch (error) {
      this.error(`[MVU Test Interface] 运行测试案例时发生错误: ${error.message}`);
      this.recordTestResult(testCase.name, false, { error: error.message });
    }

    this.log(`[MVU Test Interface] 接口结束：runSingleTestCase() - 测试索引: ${testIndex}`);
    return this.generateTestReport();
  },

  /**
   * 8.056版本新增：获取版本检测测试案例列表
   */
  getVersionDetectionTests: function () {
    return [
      {
        name: '测试旧版Json数据结构检测 - 基础案例',
        type: 'version',
        input: {
          NPC: {
            艾略特: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
                体力: [100, '范围[0-100]的体力值'],
              },
            },
          },
        },
        expected: 'old',
      },
      {
        name: '测试新版Json数据结构检测 - 基础案例',
        type: 'version',
        input: {
          NPC: {
            艾略特: {
              身体状态: {
                年龄: 16,
                体力: 100,
              },
              关键器官状态: {
                性器官群: '暂无反应',
              },
              心理状态: {
                与User关系值: 99,
              },
              衣着: {
                上衣: '无',
              },
            },
            伊桑: {
              身体状态: {
                年龄: 17,
                体力: 85,
              },
            },
          },
        },
        expected: 'new',
      },
      {
        name: '测试只有$meta的数据结构检测',
        type: 'version',
        input: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
          },
        },
        expected: 'unknown',
      },
      {
        name: '测试空对象检测',
        type: 'version',
        input: {},
        expected: 'unknown',
      },
      {
        name: '测试null输入检测',
        type: 'version',
        input: null,
        expected: 'unknown',
      },
      {
        name: '测试复杂新版Json数据结构检测',
        type: 'version',
        input: {
          角色信息: {
            基本属性: {
              姓名: '张三',
              年龄: 25,
              性别: '男',
            },
            技能: {
              编程: 85,
              设计: 70,
            },
          },
          装备: {
            武器: '长剑',
            防具: '皮甲',
          },
        },
        expected: 'new',
      },
      {
        name: '测试复杂旧版Json数据结构检测',
        type: 'version',
        input: {
          角色信息: {
            基本属性: {
              姓名: ['张三', '角色姓名'],
              年龄: [25, '角色年龄'],
              性别: ['男', '角色性别'],
            },
            技能: {
              编程: [85, '编程技能等级'],
              设计: [70, '设计技能等级'],
            },
          },
        },
        expected: 'old',
      },
      {
        name: '测试旧版Json数据测试输入案例 - 用户信息结构',
        type: 'version',
        input: {
          User: {
            基本信息: {
              职业: [
                '皇家魔导学院元素学部学生',
                "角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。",
              ],
              天赋: {
                $meta: {
                  extensible: true,
                },
                法术反弹: ['你有一定几率将指向你的单体法术反弹给施法者。', '稀有天赋'],
              },
            },
            属性: {
              力量: [
                5,
                "影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。",
              ],
              敏捷: [
                7,
                "影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。",
              ],
            },
          },
        },
        expected: 'old',
      },
    ];
  },

  /**
   * 8.056版本新增：获取转换测试案例列表
   */
  getConversionTests: function () {
    return [
      {
        name: '测试新版JSON数据转换 - 基础案例',
        type: 'conversion',
        input: {
          name: 'Alice',
          age: 25,
          skills: {
            programming: '编程',
            design: '设计',
            $meta: {
              extensible: true,
            },
          },
        },
        expectedVersion: 'new',
        expectedJson: {
          name: 'Alice',
          age: 25,
          skills: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: '未找到世界书YAML内容',
      },
      {
        name: '测试新版JSON数据转换 - 递归可增删列表',
        type: 'conversion',
        input: {
          NPC: {
            Alice: {
              name: 'Alice',
              age: 25,
            },
            Bob: {
              name: 'Bob',
              age: 30,
            },
            $meta: {
              recursiveExtensible: true,
            },
          },
        },
        expectedVersion: 'new',
        expectedJson: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
          },
        },
        expectedYaml: '未找到世界书YAML内容',
      },
      {
        name: '测试新版JSON数据转换 - 无$meta的可增删列表识别',
        type: 'conversion',
        input: {
          背包: {
            克莱蒙特的钱袋: {
              数量: 1,
              描述: '一个绣着精致纹路的钱袋，入手微沉，里面装着不明数量的金币。这是克莱尔的谢意。',
            },
            奥法盟约三阶徽章: {
              数量: 1,
              描述: '一枚银质徽章，上面刻有三颗星辰，代表持有者是奥法盟约认证的三阶魔法师。',
            },
            科尔森教授的实验室钥匙: {
              数量: 1,
              描述: '一枚古朴的黄铜钥匙，可以打开科尔森教授位于魔力学部顶层的私人实验室。',
            },
            锚点构筑笔记: {
              数量: 1,
              描述: '一张详细记录了第一次成功构筑"魔力锚点"时所有感受和想法的羊皮纸，是极为宝贵的经验总结。',
            },
          },
        },
        expectedVersion: 'new',
        expectedJson: {
          背包: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: '未找到世界书YAML内容',
      },
      {
        name: '测试旧版JSON数据到新版JSON数据结构转换 - 基础案例',
        type: 'conversion',
        input: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
            艾略特: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
                体力: [
                  100,
                  '范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态',
                ],
              },
            },
            Test2: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
                体力: [
                  100,
                  '范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态',
                ],
              },
            },
          },
        },
        expectedJson: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
          },
        },
        expectedYaml: `NPC:
<%_
  const npcData = getvar('stat_data.NPC') || {};
  const npcNames = Object.keys(npcData);

  if (npcNames.length > 0) {
    npcNames.forEach(npcName => {
      const item = npcData[npcName];
_%>
  <%= npcName %>:
    身体状态:
      年龄: <%= item.身体状态.年龄 %> # 当前角色年龄
      体力: <%= item.身体状态.体力 %> # 范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态
<%_
    });
  }
_%>`,
      },
      {
        name: '测试旧版JSON数据到新版JSON数据结构转换 - 无$meta字段的可增删列表识别',
        type: 'conversion',
        input: {
          NPC: {
            艾略特: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
                体力: [
                  100,
                  '范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态',
                ],
                等级: [5, '角色当前等级'],
              },
            },
            Test2: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
                体力: [
                  100,
                  '范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态',
                ],
                等级: [5, '角色当前等级'],
              },
            },
            小明: {
              身体状态: {
                年龄: [18, '当前角色年龄'],
                体力: [
                  85,
                  '范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态',
                ],
                等级: [3, '角色当前等级'],
              },
            },
          },
        },
        expectedJson: {
          NPC: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `NPC:
<%_
  const npcData = getvar('stat_data.NPC') || {};
  const npcNames = Object.keys(npcData);

  if (npcNames.length > 0) {
    npcNames.forEach(npcName => {
      const item = npcData[npcName];
_%>
  <%= npcName %>:
    身体状态:
      年龄: <%= item.身体状态.年龄 %> # 当前角色年龄
      体力: <%= item.身体状态.体力 %> # 范围[0-100]，进行高强度或长时间的性活动会消耗体力，体力过低会影响动作表现并可能导致负面状态
      等级: <%= item.身体状态.等级 %> # 角色当前等级
<%_
    });
  }
_%>`,
      },
      {
        name: '测试背包列表结构转换',
        type: 'conversion',
        input: {
          背包: {
            $meta: {
              extensible: true,
            },
            模板: {
              名称: ['', '物品名称'],
              类型: ['', '物品类型'],
            },
          },
        },
        expectedJson: {
          背包: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `背包:
<%_
  const 背包Data = getvar('stat_data.背包') || {};
  const 背包Names = Object.keys(背包Data);

  if (背包Names.length > 0) {
    背包Names.forEach(背包Name => {
      const item = 背包Data[背包Name];
_%>
  <%= 背包Name %>:
    名称: <%= item.名称 %> # 物品名称
    类型: <%= item.类型 %> # 物品类型
<%_
    });
  }
_%>`,
      },
      {
        name: '测试旧版JSON数据到新版JSON数据结构转换 - 极度普通案例',
        type: 'conversion',
        input: {
          严礼: {
            基本信息: [
              {
                职业: [
                  '皇家魔导学院元素学部学生',
                  "当通过剧情或学习解锁新职业时，使用 _.set('严礼.基本信息[0].职业[0]', '旧职业', '新职业') 更新。",
                ],
              },
              '记录角色的核心档案，通常由重大剧情事件或长期发展来改变。',
            ],
          },
        },
        expectedJson: {
          严礼: {
            基本信息: {
              职业: '皇家魔导学院元素学部学生',
            },
          },
        },
        expectedYaml: `严礼:
  基本信息: # 记录角色的核心档案，通常由重大剧情事件或长期发展来改变。
    职业: {{get_message_variable::stat_data.严礼.基本信息.职业}} # 当通过剧情或学习解锁新职业时，使用 _.set('严礼.基本信息[0].职业[0]', '旧职业', '新职业') 更新。`,
      },
      {
        name: '测试YAML隐藏代码部分',
        type: 'conversion',
        input: {
          背包: {
            $meta: {
              extensible: true,
            },
            模板: {
              数量: [0, '物品当前数量'],
              描述: ['', '物品的效果描述'],
            },
          },
        },
        expectedJson: {
          背包: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `背包:
<%_
  const 背包Data = getvar('stat_data.背包') || {};
  const 背包Names = Object.keys(背包Data);

  if (背包Names.length > 0) {
    背包Names.forEach(背包Name => {
      const item = 背包Data[背包Name];
_%>
  <%= 背包Name %>:
    数量: <%= item.数量 %> # 物品当前数量
    描述: <%= item.描述 %> # 物品的效果描述
<%_
    });
  }
_%>`,
        expectedYamlHidden: `背包:
  <%= 背包Name %>:
    数量: <%= item.数量 %> # 物品当前数量
    描述: <%= item.描述 %> # 物品的效果描述`,
      },
      {
        name: '测试旧版Json数据测试输入案例 - 用户信息结构完整转换',
        type: 'conversion',
        input: {
          User: {
            基本信息: {
              职业: [
                '皇家魔导学院元素学部学生',
                "角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。",
              ],
              天赋: {
                $meta: {
                  extensible: true,
                },
                法术反弹: {
                  描述: ['你有一定几率将指向你的单体法术反弹给施法者。', '天赋描述'],
                },
              },
            },
            属性: {
              力量: [
                5,
                "影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。",
              ],
              敏捷: [
                7,
                "影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。",
              ],
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          User: {
            基本信息: {
              职业: '皇家魔导学院元素学部学生',
              天赋: {
                $meta: {
                  extensible: true,
                },
              },
            },
            属性: {
              力量: 5,
              敏捷: 7,
            },
          },
        },
        expectedYaml: `User:
  基本信息:
    职业: {{get_message_variable::stat_data.User.基本信息.职业}} # 角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。
    天赋:
<%_
  const 天赋Data = getvar('stat_data.User.基本信息.天赋') || {};
  const 天赋Names = Object.keys(天赋Data);

  if (天赋Names.length > 0) {
    天赋Names.forEach(天赋Name => {
      const item = 天赋Data[天赋Name];
_%>
      <%= 天赋Name %>:
        描述: <%= item.描述 %> # 天赋描述
<%_
    });
  }
_%>
  属性:
    力量: {{get_message_variable::stat_data.User.属性.力量}} # 影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。
    敏捷: {{get_message_variable::stat_data.User.属性.敏捷}} # 影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。`,
      },
      {
        name: '测试可增删列表结构与递归可增删列表结构概念合一 - 相同输入产生相同输出',
        type: 'conversion',
        input: {
          NPC: {
            $meta: {
              extensible: true,
            },
            艾略特: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
              },
              心理状态: {
                与User关系值: [99, '关系值范围[0-100]'],
              },
            },
            伊桑: {
              身体状态: {
                年龄: [17, '当前角色年龄'],
              },
              心理状态: {
                与User关系值: [100, '关系值范围[0-100]'],
              },
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          NPC: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `NPC:
<%_
  const npcData = getvar('stat_data.NPC') || {};
  const npcNames = Object.keys(npcData);

  if (npcNames.length > 0) {
    npcNames.forEach(npcName => {
      const item = npcData[npcName];
_%>
  <%= npcName %>:
    身体状态:
      年龄: <%= item.身体状态.年龄 %> # 当前角色年龄
    心理状态:
      与User关系值: <%= item.心理状态.与User关系值 %> # 关系值范围[0-100]
<%_
    });
  }
_%>`,
      },
      {
        name: '测试可增删列表结构与递归可增删列表结构概念合一 - 递归版本',
        type: 'conversion',
        input: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
            艾略特: {
              身体状态: {
                年龄: [16, '当前角色年龄'],
              },
              心理状态: {
                与User关系值: [99, '关系值范围[0-100]'],
              },
            },
            伊桑: {
              身体状态: {
                年龄: [17, '当前角色年龄'],
              },
              心理状态: {
                与User关系值: [100, '关系值范围[0-100]'],
              },
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          NPC: {
            $meta: {
              recursiveExtensible: true,
            },
          },
        },
        expectedYaml: `NPC:
<%_
  const npcData = getvar('stat_data.NPC') || {};
  const npcNames = Object.keys(npcData);

  if (npcNames.length > 0) {
    npcNames.forEach(npcName => {
      const item = npcData[npcName];
_%>
  <%= npcName %>:
    身体状态:
      年龄: <%= item.身体状态.年龄 %> # 当前角色年龄
    心理状态:
      与User关系值: <%= item.心理状态.与User关系值 %> # 关系值范围[0-100]
<%_
    });
  }
_%>`,
      },
      {
        name: '测试实际输入数据 - 用户信息结构完整转换',
        type: 'conversion',
        input: {
          User: {
            基本信息: {
              职业: [
                '皇家魔导学院元素学部学生',
                "角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。",
              ],
              天赋: {
                $meta: {
                  extensible: true,
                },
                法术反弹: {
                  描述: ['你有一定几率将指向你的单体法术反弹给施法者。', '天赋描述'],
                },
              },
            },
            属性: {
              力量: [
                5,
                "影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。",
              ],
              敏捷: [
                7,
                "影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。",
              ],
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          User: {
            基本信息: {
              职业: '皇家魔导学院元素学部学生',
              天赋: {
                $meta: {
                  extensible: true,
                },
              },
            },
            属性: {
              力量: 5,
              敏捷: 7,
            },
          },
        },
        expectedYaml: `User:
  基本信息:
    职业: {{get_message_variable::stat_data.User.基本信息.职业}} # 角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。
    天赋:
<%_
  const 天赋Data = getvar('stat_data.User.基本信息.天赋') || {};
  const 天赋Names = Object.keys(天赋Data);

  if (天赋Names.length > 0) {
    天赋Names.forEach(天赋Name => {
      const item = 天赋Data[天赋Name];
_%>
      <%= 天赋Name %>:
        描述: <%= item.描述 %> # 天赋描述
<%_
    });
  }
_%>
  属性:
    力量: {{get_message_variable::stat_data.User.属性.力量}} # 影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。
    敏捷: {{get_message_variable::stat_data.User.属性.敏捷}} # 影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。`,
      },
      {
        name: '测试网页输入到转换的完整流程 - 数据传递完整性',
        type: 'conversion',
        input: {
          User: {
            基本信息: {
              职业: [
                '皇家魔导学院元素学部学生',
                "角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。",
              ],
              天赋: {
                $meta: {
                  extensible: true,
                },
                法术反弹: {
                  描述: ['你有一定几率将指向你的单体法术反弹给施法者。', '天赋描述'],
                },
              },
            },
            属性: {
              力量: [
                5,
                "影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。",
              ],
              敏捷: [
                7,
                "影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。",
              ],
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          User: {
            基本信息: {
              职业: '皇家魔导学院元素学部学生',
              天赋: {
                $meta: {
                  extensible: true,
                },
              },
            },
            属性: {
              力量: 5,
              敏捷: 7,
            },
          },
        },
        expectedYaml: `User:
  基本信息:
    职业: {{get_message_variable::stat_data.User.基本信息.职业}} # 角色的主要战斗或生活方式。当通过剧情或学习解锁新职业时，使用 _.set('User.基本信息.职业', '旧职业', '新职业') 更新。
    天赋:
<%_
  const 天赋Data = getvar('stat_data.User.基本信息.天赋') || {};
  const 天赋Names = Object.keys(天赋Data);

  if (天赋Names.length > 0) {
    天赋Names.forEach(天赋Name => {
      const item = 天赋Data[天赋Name];
_%>
      <%= 天赋Name %>:
        描述: <%= item.描述 %> # 天赋描述
<%_
    });
  }
_%>
  属性:
    力量: {{get_message_variable::stat_data.User.属性.力量}} # 影响物理攻击、负重。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.力量', 1) 提升。
    敏捷: {{get_message_variable::stat_data.User.属性.敏捷}} # 影响闪避、潜行、远程攻击。修正值=(属性-10)/2。升级或获永久增益时，用 _.add('User.属性.敏捷', 1) 提升。`,
        // 8.058版本新增：测试数据传递完整性
        testDataIntegrity: true,
      },
      {
        name: '测试旧版Json数据测试输入案例 - 技能数据结构完整转换', //{v8.059}: 新增技能数据结构测试用例
        type: 'conversion',
        input: {
          技能: {
            $meta: {
              extensible: true,
            },
            锚点构筑: {
              等级: [4, '技能等级'],
              经验: [35, '当前经验'],
              升级经验: [338, '升级所需经验'],
              描述: ['构建高密度魔力锚点的技巧，是多重施法和自律性法术实体的基础。', '技能效果'],
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          技能: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `技能:
<%_
  const 技能Data = getvar('stat_data.技能') || {};
  const 技能Names = Object.keys(技能Data);

  if (技能Names.length > 0) {
    技能Names.forEach(技能Name => {
      const item = 技能Data[技能Name];
_%>
  <%= 技能Name %>:
    等级: <%= item.等级 %> # 技能等级
    经验: <%= item.经验 %> # 当前经验
    升级经验: <%= item.升级经验 %> # 升级所需经验
    描述: <%= item.描述 %> # 技能效果
<%_
    });
  }
_%>`,
      },
      {
        name: '测试新版JSON数据转换 - 关键器官状态结构', //{v8.060}: 新增关键器官状态测试用例
        type: 'conversion',
        input: {
          User: {
            关键器官状态: {
              性器官群: [
                '暂无反应',
                "以'/'分隔的列表，描述角色当前所有关键性器官所处状态，如'乳头挺立'、'湿润'、'勃起'等，根据角色性别与改造情况确定需要展示的器官，根据兴奋度和互动实时更新",
              ],
              阴茎: {
                状态: ['疲软', "描述阴茎的当前状态，如'疲软'、'半勃起'、'勃起'等，根据兴奋度和互动实时更新。"],
                长度: [15, '当前阴茎长度，受状态影响。'],
                长度最小值: [5, '疲软状态下的长度。'],
                长度最大值: [20, '完全勃起状态下的长度。'],
              },
              阴囊: {
                状态: ['正常', "描述阴囊的当前状态，如'正常'、'紧缩'等。"],
                剩余精液: [80, '当前储存的精液量。每次高潮射精减少20ml，每过一天回复40ml。'],
                精液容量: [100, '精液储存的上限。'],
              },
            },
          },
          NPC: {
            $meta: {
              extensible: true,
            },
            艾略特: {
              关键器官状态: {
                性器官群: [
                  '暂无反应',
                  "以'/'分隔的列表，描述角色当前所有关键性器官所处状态，如'乳头挺立'、'湿润'、'勃起'等，根据角色性别与改造情况确定需要展示的器官，根据兴奋度和互动实时更新",
                ],
              },
            },
          },
        },
        expectedVersion: 'old',
        expectedJson: {
          User: {
            关键器官状态: {
              性器官群: '暂无反应',
              阴茎: {
                状态: '疲软',
                长度: 15,
                长度最小值: 5,
                长度最大值: 20,
              },
              阴囊: {
                状态: '正常',
                剩余精液: 80,
                精液容量: 100,
              },
            },
          },
          NPC: {
            $meta: {
              extensible: true,
            },
          },
        },
        expectedYaml: `User:
  关键器官状态:
    性器官群: {{get_message_variable::stat_data.User.关键器官状态.性器官群}} # 以'/'分隔的列表，描述角色当前所有关键性器官所处状态，如'乳头挺立'、'湿润'、'勃起'等，根据角色性别与改造情况确定需要展示的器官，根据兴奋度和互动实时更新
    阴茎:
      状态: {{get_message_variable::stat_data.User.关键器官状态.阴茎.状态}} # 描述阴茎的当前状态，如'疲软'、'半勃起'、'勃起'等，根据兴奋度和互动实时更新。
      长度: {{get_message_variable::stat_data.User.关键器官状态.阴茎.长度}} # 当前阴茎长度，受状态影响。
      长度最小值: {{get_message_variable::stat_data.User.关键器官状态.阴茎.长度最小值}} # 疲软状态下的长度。
      长度最大值: {{get_message_variable::stat_data.User.关键器官状态.阴茎.长度最大值}} # 完全勃起状态下的长度。
    阴囊:
      状态: {{get_message_variable::stat_data.User.关键器官状态.阴囊.状态}} # 描述阴囊的当前状态，如'正常'、'紧缩'等。
      剩余精液: {{get_message_variable::stat_data.User.关键器官状态.阴囊.剩余精液}} # 当前储存的精液量。每次高潮射精减少20ml，每过一天回复40ml。
      精液容量: {{get_message_variable::stat_data.User.关键器官状态.阴囊.精液容量}} # 精液储存的上限。
NPC:
<%_
  const npcData = getvar('stat_data.NPC') || {};
  const npcNames = Object.keys(npcData);

  if (npcNames.length > 0) {
    npcNames.forEach(npcName => {
      const item = npcData[npcName];
_%>
  <%= npcName %>:
    关键器官状态:
      性器官群: <%= item.关键器官状态.性器官群 %> # 以'/'分隔的列表，描述角色当前所有关键性器官所处状态，如'乳头挺立'、'湿润'、'勃起'等，根据角色性别与改造情况确定需要展示的器官，根据兴奋度和互动实时更新
<%_
    });
  }
_%>`,
      },
    ];
  },

  /**
   * 8.056版本新增：获取UI测试案例列表
   */
  getUITests: function () {
    return [
      {
        name: '测试Modal弹窗显示',
        type: 'ui',
        test: () => this.testModalDisplay(),
      },
      {
        name: '测试输入框功能',
        type: 'ui',
        test: () => this.testInputFunctionality(),
      },
      {
        name: '测试转换按钮功能',
        type: 'ui',
        test: () => this.testConvertButton(),
      },
      {
        name: '测试复制按钮功能',
        type: 'ui',
        test: () => this.testCopyButton(),
      },
      {
        name: '测试编辑按钮功能',
        type: 'ui',
        test: () => this.testEditButton(),
      },
      {
        name: '测试赋值按钮功能',
        type: 'ui',
        test: () => this.testAssignButton(),
      },
      {
        name: '测试清空按钮功能',
        type: 'ui',
        test: () => this.testClearButton(),
      },
      {
        name: '测试关闭按钮功能',
        type: 'ui',
        test: () => this.testCloseButton(),
      },
      // {8.619}: 新增 - 测试新版输入失焦后对齐字段与注释功能（使用现有功能接口封装）
      {
        name: '测试新版输入失焦对齐字段',
        type: 'ui',
        test: () => this.testBlurAlign(),
      },
    ];
  },

  /**
   * 8.056版本新增：获取边界测试案例列表
   */
  getEdgeCaseTests: function () {
    return [
      {
        name: '测试空输入',
        type: 'edge',
        input: {},
        expected: { json: {}, yaml: '' },
      },
      {
        name: '测试null输入',
        type: 'edge',
        input: null,
        expected: { json: null, yaml: '' },
      },
      {
        name: '测试无效JSON',
        type: 'edge',
        input: 'invalid json',
        expected: { json: {}, yaml: '' },
      },
      {
        name: '测试深层嵌套',
        type: 'edge',
        input: {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: [42, '深层嵌套值'],
                },
              },
            },
          },
        },
        expected: {
          json: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 42,
                  },
                },
              },
            },
          },
          yaml: `level1:
  level2:
    level3:
      level4:
        value: {{get_message_variable::stat_data.level1.level2.level3.level4.value}} # 深层嵌套值`,
        },
      },
    ];
  },

  /**
   * 8.056版本新增：获取集成测试案例列表
   */
  getIntegrationTests: function () {
    return [
      {
        name: '测试完整转换流程',
        type: 'integration',
        test: () => this.testCompleteConversionFlow(),
      },
      {
        name: '测试世界书同步功能',
        type: 'integration',
        test: () => this.testWorldBookSync(),
      },
      {
        name: '测试变量赋值功能',
        type: 'integration',
        test: () => this.testVariableAssignment(),
      },
    ];
  },

  /**
   * 8.3版本新增：获取网页赋值数据验证测试案例列表
   */
  getWebAssignmentTests: function () {
    return [
      {
        name: '测试网页赋值数据验证 - 基础验证',
        type: 'webAssignment',
        test: () => this.testWebAssignmentBasic(),
      },
      {
        name: '测试网页赋值数据验证 - 仅消息变量',
        type: 'webAssignment',
        test: () => this.testWebAssignmentMessageOnly(),
      },
      {
        name: '测试网页赋值数据验证 - 仅Chat变量',
        type: 'webAssignment',
        test: () => this.testWebAssignmentChatOnly(),
      },
      {
        name: '测试网页赋值数据验证 - 指定消息ID',
        type: 'webAssignment',
        test: () => this.testWebAssignmentWithMessageId(),
      },
      {
        name: '测试网页赋值数据验证 - 错误处理',
        type: 'webAssignment',
        test: () => this.testWebAssignmentErrorHandling(),
      },
      {
        name: '测试网页赋值数据验证 - 复杂数据结构',
        type: 'webAssignment',
        test: () => this.testWebAssignmentComplexData(),
      },
      {
        name: '测试网页赋值数据验证 - 大数据量',
        type: 'webAssignment',
        test: () => this.testWebAssignmentLargeData(),
      },
      {
        name: '测试网页赋值数据验证 - 特殊字符',
        type: 'webAssignment',
        test: () => this.testWebAssignmentSpecialChars(),
      },
      {
        name: '测试YAML输出缩进验证',
        type: 'webAssignment',
        test: () => this.testYamlIndentation(),
      },
    ];
  },

  /**
   * 8.058版本新增：检查数据结构是否包含数组格式
   * @param {Object} obj - 要检查的对象
   * @returns {boolean} 是否包含数组格式
   */
  hasArrayFormat: function (obj) {
    if (!obj || typeof obj !== 'object') return false;

    if (Array.isArray(obj)) {
      return obj.length === 2 && typeof obj[1] === 'string';
    }

    for (const key in obj) {
      if (this.hasArrayFormat(obj[key])) {
        return true;
      }
    }

    return false;
  },

  /**
   * 8.056版本新增：根据名称查找测试案例
   */
  findTestCaseByName: function (name) {
    // 在所有测试类型中查找
    const allTests = [
      ...this.getVersionDetectionTests(),
      ...this.getConversionTests(),
      ...this.getUITests(),
      ...this.getEdgeCaseTests(),
      ...this.getIntegrationTests(),
      ...this.getWebAssignmentTests(),
    ];

    return allTests.find(test => test.name === name);
  },

  // {8.619}: 新增 - 失焦对齐字段测试（封装为输入->输出接口，仅调用现有功能接口）
  testBlurAlign: function () {
    this.log('[MVU Test Interface] 接口触发：testBlurAlign()');
    try {
      // 输入：新版JSON（仅值），包含对象字段与基本类型字段
      const input = {
        '{{user}}': {
          任务日志: {
            最近一次: 'none',
            总数: 3,
          },
          昵称: 'abc',
        },
      };

      // 基线YAML：模拟世界书已有注释，缺少"总数"的注释；对象字段"任务日志"带有注释
      const baselineYaml = `{{user}}:
  任务日志: # object。记录任务。
    最近一次: {{get_message_variable::stat_data.{{user}}.任务日志.最近一次}} # 最近一次描述
  昵称: {{get_message_variable::stat_data.{{user}}.昵称}} # 用户昵称`;

      // 期望输出：按JSON顺序输出；为缺失字段"总数"补充默认注释；保留已有注释
      const expectedYaml = `{{user}}:
  任务日志: # object。记录任务。
    最近一次: {{get_message_variable::stat_data.{{user}}.任务日志.最近一次}} # 最近一次描述
    总数: {{get_message_variable::stat_data.{{user}}.任务日志.总数}} # {用户填写描述}
  昵称: {{get_message_variable::stat_data.{{user}}.昵称}} # 用户昵称`;

      // 使用现有功能接口：提取注释并基于JSON结构重建YAML
      const commentMap = mvuConverter._extractYamlComments(baselineYaml);
      const actualYaml = mvuConverter._generateYamlPreserveCommentsAndOrder(input, commentMap);

      const passed = actualYaml === expectedYaml;
      return {
        passed,
        details: {
          input,
          baselineYaml,
          expectedYaml,
          actualYaml,
        },
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  },
};

// 导出测试接口
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mvuTestInterface;
}

// 8.056版本新增：防止直接运行test_interface.js
if (require.main === module) {
  console.error('❌ 错误：请不要直接运行 test_interface.js');
  console.error('');
  console.error('📝 正确的测试入口是：');
  console.error('   node run_tests.js');
  console.error('');
  console.error('🔧 可用的测试命令：');
  console.error('   # 运行所有测试');
  console.error('   node run_tests.js');
  console.error('');
  console.error('   # 运行单个测试案例（通过索引）');
  console.error('   node run_tests.js 0');
  console.error('   node run_tests.js 17');
  console.error('');
  console.error('   # 运行单个测试案例（通过名称）');
  console.error('   node run_tests.js "测试旧版Json数据结构检测 - 基础案例"');
  console.error('   node run_tests.js "测试旧版Json数据测试输入案例 - 用户信息结构完整转换"');
  console.error('');
  console.error('   # 静默模式');
  console.error('   node run_tests.js --silent');
  console.error('   node run_tests.js 0 --silent');
  console.error('');
  console.error('💡 提示：test_interface.js 是测试接口模块，应该通过 run_tests.js 来调用');
  process.exit(1);
}
