# 辐射检测器软件 - 依赖包安装修复指南

## 问题说明

您遇到的 `rate-limiter-flexible@^3.0.8` 版本不存在的错误是因为该版本在npm仓库中不存在。我已经修复了这个问题。

## 已修复的问题

- ✅ **已更新**：将 `rate-limiter-flexible` 版本从 `^3.0.8` 改为 `^3.0.6`
- ✅ **已验证**：确认 `rate-limiter-flexible@3.0.6` 存在且可用
- ✅ **已创建**：自动修复脚本

## 解决方案

### 方法一：使用自动修复脚本（推荐）

#### Windows 用户：
```batch
# 在项目目录中运行
install-fix.bat
```

#### Linux/Mac 用户：
```bash
# 在项目目录中运行
chmod +x install-fix.sh
./install-fix.sh
```

### 方法二：手动修复

如果自动脚本无法解决问题，请按以下步骤手动安装：

1. **清理缓存和文件**：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json  # Linux/Mac
# 或在Windows中手动删除 node_modules 文件夹和 package-lock.json 文件
```

2. **重新安装依赖**：
```bash
npm install
```

3. **如果仍有问题，分步安装**：
```bash
# 核心运行时依赖
npm install express sqlite3 bcryptjs serialport chart.js electron-store uuid moment lodash dotenv

# 开发依赖
npm install --save-dev electron jest

# 其他依赖
npm install sequelize crypto helmet rate-limiter-flexible jsonwebtoken cors electron-builder
```

## 系统要求

确保您的系统满足以下要求：

- **Node.js**: 16.0 或更高版本
- **npm**: 8.0 或更高版本
- **操作系统**: Windows 10+, macOS 10.14+, 或 Linux (Ubuntu 18.04+)

检查版本：
```bash
node --version
npm --version
```

## 启动应用程序

依赖安装成功后，启动应用程序：

```bash
npm start
```

或使用项目自带的启动脚本：
- Windows: `start.bat`
- Linux/Mac: `./start.sh`

## 故障排除

### 常见问题及解决方案

1. **权限错误**：
   - Windows: 以管理员身份运行命令提示符
   - Linux/Mac: 在命令前添加 `sudo`

2. **网络问题**：
   - 如果在公司网络中，配置npm代理
   - 尝试使用cnpm或其他镜像源

3. **版本冲突**：
   - 删除 `node_modules` 文件夹
   - 删除 `package-lock.json` 文件
   - 重新运行 `npm install`

4. **Electron下载失败**：
   - 设置Electron镜像：`npm config set electron_mirror https://cdn.npm.taobao.org/dist/`

## 验证安装

安装完成后，您可以验证关键依赖是否正确安装：

```bash
# 检查核心模块
node -e "console.log(require('serialport'))"
node -e "console.log(require('chart.js'))"
node -e "console.log(require('sqlite3'))"

# 检查Electron
npx electron --version
```

## 技术支持

如果您仍然遇到问题，请提供以下信息：

1. Node.js版本
2. npm版本
3. 操作系统
4. 完整的错误日志

## 项目特点

这个辐射检测器软件具有以下特点：

- ✅ **CFR 21 Part 11 合规**：完整的电子记录和电子签名支持
- ✅ **三级访问控制**：管理员/监督员/操作员
- ✅ **不可变审计日志**：使用哈希链技术
- ✅ **串口通信**：支持COM2（控制）和COM3（数据）
- ✅ **实时数据可视化**：类似色谱分析的界面
- ✅ **SQLite数据库**：轻量级且符合ACID要求

启动后，软件将自动创建默认管理员账户：
- 用户名：`admin`
- 密码：`Admin123!`

**重要**：首次登录后请立即修改默认密码以确保安全。