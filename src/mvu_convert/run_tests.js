// ==================================================================
// == MVU 测试运行脚本
// ==================================================================
// 作者: LiuLi 25_08_05
// 版本: 1.0.3 (清理默认日志版) // 1.0.3版本修改：将模拟API日志移到verbose模式，默认模式下只显示必要信息
// 描述: 运行 MVU 变量转换器的完整测试套件
// ==================================================================

// 1.0.2版本修改：解析命令行参数
const args = process.argv.slice(2);
const silent = args.includes('--silent') || args.includes('-s');
const verbose = args.includes('--verbose') || args.includes('-v');

console.log('=== MVU 测试运行脚本启动 ===');
console.log('开始时间:', new Date().toLocaleString());
console.log('命令行参数:', args.join(' '));
console.log('静默模式:', silent);
console.log('详细模式:', verbose);

try {
  // 首先加载 index.js 中的 mvuConverter
  console.log('正在加载 mvuConverter...');

  // 模拟浏览器环境
  global.window = {
    location: { href: 'http://localhost:8000' },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  global.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  global.document = {
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      style: {},
    }),
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  // 模拟 SillyTavern API
  global.eventOnButton = (name, callback) => {
    if (!silent) {
      console.log(`模拟绑定按钮: ${name}`);
    }
    return true;
  };

  global.getvar = path => {
    if (verbose) {
      console.log(`模拟获取变量: ${path}`);
    }
    return null;
  };

  global.setvar = (path, value) => {
    if (verbose) {
      console.log(`模拟设置变量: ${path} = ${JSON.stringify(value)}`);
    }
    return true;
  };

  global.replaceVariables = text => {
    if (verbose) {
      console.log(`模拟替换变量: ${text}`);
    }
    return text;
  };

  global.insertOrAssignVariables = data => {
    if (verbose) {
      console.log(`模拟插入或赋值变量: ${JSON.stringify(data)}`);
    }
    return true;
  };

  // 加载 index.js 并获取 mvuConverter
  const indexModule = require('./index.js');

  console.log('mvuConverter 加载完成');

  // 检查 mvuConverter 是否可用
  if (indexModule && indexModule.mvuConverter) {
    global.mvuConverter = indexModule.mvuConverter;
    console.log('成功从模块中获取 mvuConverter');

    // 1.0.2版本修改：根据命令行参数设置日志开关
    if (indexModule.Logger) {
      // 如果使用--silent参数，禁用所有日志输出
      if (silent) {
        indexModule.Logger.setEnabled(false);
        console.log('已禁用 mvuConverter 日志输出（静默模式）');
      }
      // 如果使用--verbose参数，启用详细日志输出
      else if (verbose) {
        indexModule.Logger.setEnabled(true);
        console.log('已启用 mvuConverter 详细日志输出（详细模式）');
      }
      // 默认情况下，在测试环境中禁用日志输出
      else {
        indexModule.Logger.setEnabled(false);
        console.log('已禁用 mvuConverter 日志输出（默认测试模式）');
      }
    }
  } else {
    console.error('错误：无法从模块中获取 mvuConverter');
    process.exit(1);
  }

  console.log('mvuConverter 版本:', mvuConverter.VERSION);

  // 加载测试接口
  console.log('正在加载测试接口...');
  const testInterface = require('./test_interface.js');

  console.log('测试接口加载完成');
  console.log('测试接口版本:', testInterface.VERSION);

  // 解析测试参数
  const testArgs = args.filter(arg => !arg.startsWith('--'));
  const runSingleTest = testArgs.length > 0;

  let results;

  if (runSingleTest) {
    // 运行单个测试案例
    const testIndex = testArgs[0];
    console.log(`\n=== 开始运行单个测试案例 ===`);
    console.log(`测试索引/名称: ${testIndex}`);

    // 尝试解析为数字索引
    const numericIndex = parseInt(testIndex);
    const finalIndex = isNaN(numericIndex) ? testIndex : numericIndex;

    results = testInterface.runSingleTestCase(finalIndex, verbose); // 根据verbose参数设置详细模式
  } else {
    // 运行所有测试
    console.log('\n=== 开始运行测试套件 ===');
    results = testInterface.runAllTests();
  }

  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===');
  console.log('总测试数:', results.summary ? results.summary.total : results.total);
  console.log('通过测试:', results.summary ? results.summary.passed : results.passed);
  console.log('失败测试:', results.summary ? results.summary.failed : results.failed);
  console.log(
    '成功率:',
    results.summary
      ? results.summary.successRate
      : results.total > 0
      ? ((results.passed / results.total) * 100).toFixed(2) + '%'
      : '0%',
  );

  if (results.results.length > 0) {
    console.log('\n=== 详细测试结果 ===');
    results.results.forEach((result, index) => {
      const status = result.passed ? '✅ 通过' : '❌ 失败';
      console.log(`${index + 1}. ${result.name}: ${status}`);

      // 1.0.2版本新增：详细模式下显示失败的具体原因
      if (!result.passed && verbose && result.details) {
        console.log(`   详细失败信息:`);

        if (result.details.error) {
          console.log(`   错误: ${result.details.error}`);
        }

        if (result.details.jsonMatch === false) {
          console.log(`   JSON比较失败:`);
          console.log(`   期望JSON: ${JSON.stringify(result.details.expectedJson, null, 2)}`);
          console.log(`   实际JSON: ${JSON.stringify(result.details.actualJson, null, 2)}`);
        }

        if (result.details.yamlMatch === false) {
          console.log(`   YAML比较失败:`);
          console.log(`   期望YAML: ${JSON.stringify(result.details.expectedYaml, null, 2)}`);
          console.log(`   实际YAML: ${JSON.stringify(result.details.actualYaml, null, 2)}`);
        }

        if (result.details.yamlHiddenMatch === false) {
          console.log(`   YAML隐藏部分比较失败:`);
          console.log(`   期望YAML隐藏: ${JSON.stringify(result.details.expectedYamlHidden, null, 2)}`);
          console.log(`   实际YAML隐藏: ${JSON.stringify(result.details.actualYamlHidden, null, 2)}`);
        }

        if (result.details.detectedVersion !== result.details.expectedVersion) {
          console.log(`   版本检测失败:`);
          console.log(`   期望版本: ${result.details.expectedVersion}`);
          console.log(`   检测版本: ${result.details.detectedVersion}`);
        }
      } else if (!result.passed && result.details && result.details.error) {
        console.log(`   错误: ${result.details.error}`);
      }
    });
  }

  console.log('\n=== 测试完成 ===');
  console.log('结束时间:', new Date().toLocaleString());

  // 1.0.2版本修改：显示使用说明
  if (args.length === 0) {
    console.log('\n=== 使用说明 ===');
    console.log('--silent, -s: 禁用所有日志输出');
    console.log('--verbose, -v: 启用详细日志输出，显示失败的具体原因');
    console.log('默认: 禁用 mvuConverter 日志输出，保留测试结果输出');
    console.log('单独测试: node run_tests.js <测试索引或名称>');
    console.log('示例: node run_tests.js 0');
    console.log('示例: node run_tests.js "测试旧版Json数据结构检测 - 基础案例"');
    console.log('示例: node run_tests.js "测试旧版Json数据测试输入案例 - 用户信息结构完整转换" --verbose');
  }
} catch (error) {
  console.error('测试运行过程中发生错误:', error);
  console.error('错误堆栈:', error.stack);
}
