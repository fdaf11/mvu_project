# MVU 变量转换器 - 日志接口使用说明

## 概述

8.048版本新增了日志接口功能，用于封装所有的console.log调用，并支持在测试时控制日志输出。

## 日志接口功能

### Logger 对象

```javascript
const Logger = {
  enabled: true,  // 全局日志开关
  
  // 设置日志开关
  setEnabled: function(enabled) { ... },
  
  // 日志输出函数
  log: function(...args) { ... },
  
  // 错误日志输出函数
  error: function(...args) { ... },
  
  // 警告日志输出函数
  warn: function(...args) { ... },
  
  // 调试日志输出函数
  debug: function(...args) { ... }
};
```

### 使用方法

#### 1. 在代码中使用

```javascript
// 普通日志
Logger.log('[MVU Converter] 开始处理数据');

// 错误日志
Logger.error('[MVU Converter] 处理失败:', error);

// 警告日志
Logger.warn('[MVU Converter] 警告信息');

// 调试日志
Logger.debug('[MVU Converter] 调试信息');
```

#### 2. 控制日志输出

```javascript
// 禁用所有日志输出
Logger.setEnabled(false);

// 启用日志输出
Logger.setEnabled(true);
```

## 测试时的日志控制

### 命令行参数

在运行测试时，可以使用以下命令行参数控制日志输出：

```bash
# 默认模式：禁用 mvuConverter 日志输出，保留测试结果输出
node run_tests.js

# 详细模式：启用所有详细日志输出
node run_tests.js --verbose
# 或
node run_tests.js -v

# 静默模式：禁用所有日志输出（包括测试接口的日志）
node run_tests.js --silent
# 或
node run_tests.js -s
```

### 参数说明

| 参数        | 短参数 | 说明                                                   |
| ----------- | ------ | ------------------------------------------------------ |
| `--verbose` | `-v`   | 启用详细日志输出，显示所有 mvuConverter 的内部处理过程 |
| `--silent`  | `-s`   | 禁用所有日志输出，只显示最终的测试结果                 |
| 无参数      | -      | 默认模式，禁用 mvuConverter 日志输出，保留测试结果输出 |

### 使用示例

```bash
# 查看所有详细日志（用于调试）
node run_tests.js --verbose

# 快速运行测试，只显示结果
node run_tests.js --silent

# 默认模式，适合日常测试
node run_tests.js
```

## 版本历史

- **8.048版本**：新增日志接口功能
  - 封装所有 console.log 调用为 Logger.log
  - 添加日志开关控制功能
  - 支持测试时的命令行参数控制
  - 保持向后兼容性

## 注意事项

1. **向后兼容**：所有原有的 console.log 调用都已替换为 Logger.log，功能保持不变
2. **性能优化**：在测试时禁用日志输出可以提高测试运行速度
3. **调试友好**：使用 --verbose 参数可以查看详细的内部处理过程
4. **生产环境**：在生产环境中，Logger.enabled 默认为 true，保持正常的日志输出

## 技术实现

### 日志接口实现

```javascript
const Logger = {
  enabled: true,
  
  setEnabled: function(enabled) {
    this.enabled = enabled;
  },
  
  log: function(...args) {
    if (this.enabled) {
      console.log(...args);
    }
  },
  
  error: function(...args) {
    if (this.enabled) {
      console.error(...args);
    }
  },
  
  warn: function(...args) {
    if (this.enabled) {
      console.warn(...args);
    }
  },
  
  debug: function(...args) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }
};
```

### 测试脚本集成

在 `run_tests.js` 中，通过命令行参数控制日志输出：

```javascript
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const silent = args.includes('--silent') || args.includes('-s');

// 根据参数设置日志开关
if (indexModule.Logger) {
  if (silent) {
    indexModule.Logger.setEnabled(false);
  } else if (verbose) {
    indexModule.Logger.setEnabled(true);
  } else {
    indexModule.Logger.setEnabled(false); // 默认测试模式
  }
}
```
