# 加载状态指示系统文档

## 概述

放射检测器系统现已集成统一的加载状态指示系统，为用户提供一致的操作反馈和状态显示。该系统支持多种加载指示模式、进度显示、操作取消等功能。

## 核心特性

### 🎯 主要功能
- **全局加载指示器** - 全屏覆盖层加载显示
- **进度条显示** - 实时显示操作进度
- **操作取消** - 用户可主动取消长时间操作
- **多种动画** - 旋转、脉冲等多种动画效果
- **响应式设计** - 适配各种屏幕尺寸
- **无障碍支持** - 键盘快捷键和屏幕阅读器支持

### 📊 支持的操作类型
- 设备连接/断开
- 数据分析处理
- 文件操作（创建、打开、保存）
- 设备校准
- 报告生成
- 数据导入/导出

## 使用方法

### 1. 基本用法

```javascript
// 显示简单加载指示器
window.LoadingIndicator.showSimple();

// 显示带消息的加载指示器
window.LoadingIndicator.show({
    message: '正在加载数据...',
    subMessage: '请稍候',
    showProgress: false
});
```

### 2. 带进度的加载指示器

```javascript
const loaderId = window.LoadingIndicator.show({
    message: '正在处理数据...',
    showProgress: true,
    enableCancel: true
});

// 更新进度
window.LoadingIndicator.updateProgress(loaderId, 50, '处理中...');

// 完成操作后隐藏
window.LoadingIndicator.removeLoader(loaderId);
```

### 3. 操作特定加载器

```javascript
const loaderId = window.LoadingIndicator.showOperation({
    title: '设备连接',
    message: '正在连接到检测设备...',
    enableCancel: true,
    onCancel: () => {
        console.log('用户取消了设备连接');
    }
});
```

### 4. 包装异步操作

```javascript
const wrappedOperation = window.LoadingIndicator.wrap(async () => {
    // 您的异步操作代码
    await this.performDataAnalysis();
    return '分析完成';
}, {
    message: '执行数据分析',
    showProgress: true,
    enableCancel: true
});

await wrappedOperation();
```

## 已集成的模块

### AnalysisModule (数据分析)
- `performAnalysis()` - 数据分析操作已集成加载指示
- 支持实时进度更新和取消功能
- 分析步骤：数据预处理 → 执行分析 → 显示结果 → 保存结果 → 生成签名

### DeviceManager (设备管理)
- `connectDevice(deviceId)` - 设备连接
- `disconnectDevice(deviceId)` - 设备断开
- `handleDeviceCalibration()` - 设备校准
- `loadDevices()` - 加载设备列表

### FileManager (文件管理)
- `handleCreateFile()` - 创建文件
- `openFile(fileId)` - 打开文件
- `generateReport(analysisId)` - 生成报告
- `loadFileList()` - 加载文件列表

### DataProcessing (数据处理)
- `startAnalysis()` - 启动分析
- `stopAnalysis()` - 停止分析
- `processManualData()` - 处理手动数据

## API 参考

### 全局方法

#### `show(options)`
显示全局加载指示器
- **options.message** (string): 主要消息
- **options.subMessage** (string): 副消息
- **options.showProgress** (boolean): 是否显示进度条
- **options.enableCancel** (boolean): 是否启用取消按钮
- **options.autoHide** (boolean): 是否自动隐藏
- **options.duration** (number): 自动隐藏延迟时间
- **options.onCancel** (function): 取消回调函数

#### `showSimple()`
显示简化的加载指示器（仅旋转动画）

#### `showWithProgress(options)`
显示带进度条的加载指示器

#### `showOperation(options)`
显示操作特定的加载器（右上角卡片形式）

#### `hide()`
隐藏全局加载指示器

#### `updateProgress(loaderId, progress, message)`
更新加载器进度
- **loaderId** (string|number): 加载器ID
- **progress** (number): 进度百分比 (0-100)
- **message** (string, optional): 更新消息

#### `updateMessage(loaderId, message, subMessage)`
更新加载器消息

#### `cancelOperation(loaderId)`
取消特定操作

#### `cancelAllOperations()`
取消所有活动操作

#### `wrap(asyncFunction, options)`
包装异步函数，自动显示/隐藏加载指示器

#### `wrapFetch(fetchOptions, loadingOptions)`
包装fetch请求，自动显示加载指示器

### 辅助方法

#### `hasActiveLoaders()`
检查是否有活动的加载器

#### `getActiveLoaders()`
获取所有活动加载器信息

#### `getSystemInfo()`
获取系统信息

## 配置选项

```javascript
window.LoadingIndicator.config = {
    defaultDelay: 100,          // 显示最小延迟
    hideDelay: 200,             // 隐藏额外延迟
    progressInterval: 100,      // 进度更新间隔
    animationDuration: 300,     // 动画持续时间
    autoHideTimeout: 30000,     // 自动隐藏超时
    enableCancel: true,         // 启用取消功能
    enableProgress: true,       // 启用进度显示
    showMessage: true           // 显示消息
};
```

## 样式定制

系统使用CSS变量和类名，支持主题定制：

```css
:root {
    --loading-primary-color: #3498db;
    --loading-secondary-color: #2ecc71;
    --loading-background: rgba(0, 0, 0, 0.8);
    --loading-card-background: #ffffff;
    --loading-text-color: #2c3e50;
    --loading-subtext-color: #7f8c8d;
}
```

## 键盘快捷键

- **ESC** - 取消所有操作或隐藏加载指示器

## 最佳实践

### 1. 操作前显示加载指示器
```javascript
// ✅ 推荐做法
const operation = window.LoadingIndicator.wrap(async () => {
    await performLongOperation();
}, { message: '执行操作中...' });

// ❌ 不推荐做法
performLongOperation(); // 没有反馈
```

### 2. 提供有意义的进度消息
```javascript
// ✅ 推荐做法
window.LoadingIndicator.updateProgress(loaderId, 25, '正在验证数据格式...');
window.LoadingIndicator.updateProgress(loaderId, 75, '正在生成分析报告...');

// ❌ 不推荐做法
window.LoadingIndicator.updateProgress(loaderId, 25);
```

### 3. 实现适当的取消逻辑
```javascript
// ✅ 推荐做法
const loaderId = window.LoadingIndicator.show({
    enableCancel: true,
    onCancel: () => {
        cleanupResources();
        window.Auth.log('操作已取消', 'warning');
    }
});

// ❌ 不推荐做法
const loaderId = window.LoadingIndicator.show({
    enableCancel: true,
    // 缺少取消处理逻辑
});
```

### 4. 错误处理
```javascript
// ✅ 推荐做法
try {
    await wrappedOperation();
} catch (error) {
    window.LoadingIndicator.hide();
    UI.showAlert('操作失败', error.message, 'error');
}
```

## 调试和故障排除

### 查看活动加载器
```javascript
// 检查是否有活动的加载器
if (window.LoadingIndicator.hasActiveLoaders()) {
    console.log('活动加载器:', window.LoadingIndicator.getActiveLoaders());
}
```

### 强制清理
```javascript
// 清理所有加载器
window.LoadingIndicator.cancelAllOperations();
```

### 调试示例
```javascript
// 使用调试示例
window.debugLoadingExamples.basicUsage();     // 基本用法
window.debugLoadingExamples.progressUsage();  // 进度用法
window.debugLoadingExamples.wrapAsync();      // 包装异步操作
```

## 浏览器兼容性

- **Chrome** 60+
- **Firefox** 55+
- **Safari** 12+
- **Edge** 79+

## 版本历史

### v1.0.0 (2025-12-04)
- ✅ 初始版本发布
- ✅ 支持全局和操作特定加载器
- ✅ 进度显示和取消功能
- ✅ 已集成主要模块
- ✅ 响应式设计和无障碍支持

## 贡献和支持

如有问题或建议，请通过以下方式联系：
- 查看系统日志中的相关错误信息
- 使用浏览器控制台调试功能
- 检查网络请求和API响应

---

*该文档描述了放射检测器系统中加载状态指示系统的完整功能和使用方法。如有疑问，请参考代码示例或联系开发团队。*