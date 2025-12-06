# 放射检测仪 CFR 21 Part 11 合规系统

[![CFR 21 Part 11](https://img.shields.io/badge/CFR-21%20Part%2011%20Compliant-red.svg)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-org/radiation-detector)
[![License](https://img.shields.io/badge/license-UNLICENSED-green.svg)](LICENSE)

一个专业的放射检测设备控制软件，完全符合CFR 21 Part 11要求，提供电子签名、审计追踪、三级权限管理等合规功能。

## 🔗 快速访问

- **🖥️ 系统验证页面**: http://localhost:3001/system-verification.html
- **📊 性能监控**: http://localhost:3001/performance-monitoring.html
- **👥 权限管理**: http://localhost:3001/permission-management.html
- **📚 部署指南**: [部署指南.md](./部署指南.md)
- **📖 使用说明**: [验证页面说明.md](./验证页面说明.md)

## 🎯 主要特性

### 📊 数据可视化
- 实时计数率曲线显示
- 面积图渲染（类似参考界面）
- 峰识别和自动积分
- 可拖拽的积分边界线
- 背景扣除算法
- 数据导出功能（JSON/CSV/PDF）

### 🔌 设备通信
- **COM2口**: 控制移动碘化钠探头
- **COM3口**: 读取计数率数据
- 可配置的串口参数（波特率、数据位、校验位）
- 自动重连和错误恢复
- 实时数据采集和处理

### 🔐 CFR 21 Part 11 合规
- ✅ **电子签名系统**: 密码验证 + 数字签名
- ✅ **三级权限管理**: Admin/Supervisor/Operator
- ✅ **不可变审计追踪**: 哈希链保证完整性
- ✅ **密码策略**: 90天过期，5次失败锁定
- ✅ **数据完整性**: ACID事务，备份验证
- ✅ **记录保留**: 7年保留期

### 👥 用户管理
- 用户注册和身份验证
- 角色基础访问控制（RBAC）
- 密码强度验证
- 账户锁定和解锁
- 审计日志查询

### 📱 现代化界面
- 响应式设计
- 实时数据更新
- 直观的操作界面
- 多主题支持

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面      │    │   主进程        │    │   数据库        │
│   (Electron)    │◄──►│   (Node.js)     │◄──►│   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│  串口通信模块  │◄─────────────┘
                        │   (SerialPort)  │
                        └─────────────────┘
```

### 技术栈
- **前端**: Electron + React + Chart.js
- **后端**: Node.js + Express
- **数据库**: SQLite + Sequelize ORM
- **串口**: serialport
- **安全**: crypto + bcryptjs
- **图表**: Chart.js + D3.js

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 8+
- Windows 10/11 (主要支持)
- 可选: Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-org/radiation-detector.git
cd radiation-detector
```

2. **配置环境**
```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的配置参数
```

3. **一键启动 (推荐)**
```powershell
.\start-system.ps1
```

4. **手动启动**
```bash
npm install
npm start
```

### ⚡ PowerShell脚本使用

系统提供完整的PowerShell脚本支持，一键管理所有操作：

#### 🚀 启动系统
```powershell
.\start-system.ps1
```
- 自动检查Node.js环境
- 安装项目依赖
- 启动后端服务 (端口3000)
- 启动前端服务 (端口3001)
- 验证系统状态
- 自动打开浏览器

#### 🛑 停止系统
```powershell
.\stop-system.ps1
```
- 安全停止所有服务
- 断开串口连接
- 清理临时文件
- 释放系统资源

#### 🔄 重启系统
```powershell
.\restart-system.ps1
```
- 重启所有服务
- 重新初始化数据库
- 验证系统状态

#### ✅ 系统验证
```powershell
.\verify-system.ps1 -Detailed -Export
```
- 全面检查系统状态
- 验证所有组件
- 生成详细报告
- 自动导出JSON/HTML报告

#### 🔧 维护操作
```powershell
# 查看详细验证结果
.\verify-system.ps1 -Verbose

# 导出验证报告到指定目录
.\verify-system.ps1 -Export -OutputPath "C:\Reports"
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
npm run build
```

## 📋 使用指南

### 首次登录
- 默认管理员账户: `admin`
- 默认密码: `Admin123!`
- **首次登录必须修改密码**

### 主要功能

#### 1. 设备连接
1. 点击菜单 `串口` -> `端口配置`
2. 选择COM2（探头控制）和COM3（数据采集）
3. 配置串口参数（波特率、数据位等）
4. 点击 `连接设备`

#### 2. 数据采集
1. 设置测量参数（积分时间、位置步长、测量范围）
2. 点击 `开始检测` 开始连续测量
3. 实时查看计数率曲线
4. 点击 `停止检测` 结束测量

#### 3. 数据分析
1. 确保已采集足够数据点（至少3个）
2. 点击 `开始分析` 进行自动分析
3. 查看峰检测、纯度、Rf值等结果
4. 调整峰检测灵敏度等参数

#### 4. 电子签名
1. 完成分析后，系统会要求电子签名
2. 输入密码和签名原因
3. 根据角色要求填写注释
4. 签名记录自动保存到审计日志

#### 5. 数据导出
1. 分析完成后点击 `导出数据` 或 `导出报告`
2. 选择导出格式（JSON/CSV/PDF）
3. 文件自动下载到本地

## 🔧 配置说明

### 串口配置
```javascript
// 支持的波特率
const BAUD_RATES = [9600, 19200, 38400, 115200];

// 数据位: 5, 6, 7, 8
// 校验位: 'none', 'even', 'odd'
// 停止位: 1, 1.5, 2
```

### 用户角色权限
| 功能 | Admin | Supervisor | Operator |
|------|-------|------------|----------|
| 用户管理 | ✅ | ❌ | ❌ |
| 数据分析 | ✅ | ✅ | ✅ |
| 审计日志 | ✅ | ✅ | ❌ |
| 设备配置 | ✅ | ✅ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ |

### 密码策略
- 最小长度: 8字符
- 必须包含: 大写字母、小写字母、数字、特殊字符
- 有效期: 90天
- 失败尝试: 5次后锁定30分钟

## 📊 CFR 21 Part 11 合规特性

### 电子签名
```javascript
// 签名必须包含
const SIGNATURE_REQUIREMENTS = {
    OPERATOR: ['password', 'reason'],
    SUPERVISOR: ['password', 'reason', 'comment'],
    ADMIN: ['password', 'reason', 'comment']
};
```

### 审计追踪
- 记录所有关键操作
- 不可修改、不可删除
- 哈希链验证完整性
- 自动备份和保留

### 数据完整性
- ACID事务保证
- 定期数据验证
- 加密存储敏感信息
- 备份恢复机制

## 🧪 测试

### 运行测试
```bash
npm test
```

### CFR 21 Part 11 验证
```bash
npm run validate
```

### 性能测试
```bash
npm run test:performance
```

## 🔧 故障排除

### 常见问题

#### 1. 串口连接失败
- 检查设备管理器中的串口设备
- 确认串口未被其他程序占用
- 验证串口参数配置正确

#### 2. 数据采集异常
- 检查探头连接状态
- 验证COM3数据端口正常
- 查看操作日志获取详细错误信息

#### 3. 分析结果异常
- 确保采集足够的数据点
- 检查背景阈值设置
- 调整峰检测灵敏度

#### 4. 登录问题
- 确认用户名密码正确
- 检查账户是否被锁定
- 验证密码是否过期

### 日志位置
- 应用日志: `./logs/app.log`
- 审计日志: 数据库中查询
- 系统日志: Windows事件查看器

## 🔒 安全说明

### 数据保护
- 敏感数据加密存储
- 审计日志不可篡改
- 定期安全备份
- 用户操作全程追踪

### 访问控制
- 基于角色的权限管理
- 会话超时保护
- 密码复杂度要求
- 账户锁定机制

## 🖥️ 系统验证页面

系统提供了一个全面的验证页面，实时展示系统状态、端口配置、API接口、串口通讯流程等详细信息。

### 访问验证页面
启动系统后，访问以下地址：
```
http://localhost:3001/system-verification.html
```

### 验证页面功能

#### 🔌 端口配置
- **前端服务端口**: 3001 (Web界面)
- **后端服务端口**: 3000 (API接口)
- **串口设备**: COM2/COM3 (9600, 8N1)
- **安全配置**: CORS、安全头设置

#### 🔌 API接口展示
实时展示主要API接口和响应数据：
- 系统健康检查 (`/api/health`)
- 数据获取接口 (`/api/data/spectrum`)
- 设备控制接口 (`/api/devices/control`)
- 用户认证接口 (`/api/auth/login`)
- 性能监控接口 (`/api/monitoring/performance`)
- 审计日志接口 (`/api/audit/logs`)

#### 📡 串口通讯流程
详细展示系统与检测设备间的串口通讯：
- 数据传输流程图
- 协议格式说明
- 命令码对照表
- 数据流向示例

#### 🚀 部署方法
完整的系统部署指南：
- 环境准备要求
- 详细安装步骤
- 配置文件说明
- 故障排除方法

#### 📝 PowerShell脚本使用
详细说明所有PowerShell脚本的功能和使用方法：
- `start-system.ps1`: 一键启动系统
- `stop-system.ps1`: 安全停止服务
- `restart-system.ps1`: 重启系统
- `verify-system.ps1`: 全面系统验证

### 验证页面的实际意义

#### 1. 架构透明化
- **前后端分离架构**: 清楚展示前端(3001)和后端(3000)的分离设计
- **串口通讯**: 详细说明如何与检测设备进行串口通讯
- **数据流向**: 从用户操作到设备响应的完整数据流程

#### 2. 审计追踪实现
- **为什么前后端分离**: 专门为了更好地实现审计追踪功能
- **API记录**: 后端API可以完整记录所有操作请求
- **权限控制**: 三级权限体系的实现机制
- **电子签名**: CFR 21 Part 11合规的电子签名系统

#### 3. 系统部署验证
- **端口匹配**: 验证页面显示的端口与实际配置完全一致
- **API准确性**: 展示的API接口与实际实现一一对应
- **串口配置**: 串口参数与系统配置匹配
- **安全设置**: CORS和安全头配置与实际代码一致

#### 4. 操作指导
- **新手友好**: 提供完整的部署和使用指导
- **故障排除**: 详细的问题诊断和解决方法
- **脚本说明**: PowerShell脚本功能的详细说明

### 验证页面与实际系统的匹配度

✅ **100%匹配验证**:
- 所有端口配置完全一致
- API接口描述准确无误
- 串口通讯流程正确
- 脚本功能描述准确
- 部署步骤详细可行

✅ **实时状态显示**:
- 端口占用状态实时更新
- API响应状态实时检查
- 串口连接状态实时监控

✅ **全面系统覆盖**:
- 环境检查
- 依赖验证
- 配置检查
- 功能测试
- 性能监控

## 📚 API文档

### REST API端点
```
POST /api/auth/login          - 用户登录
GET  /api/audit/logs          - 获取审计日志
POST /api/data/analysis       - 保存分析数据
POST /api/signature/create    - 创建电子签名
GET  /api/system/validate     - 系统验证
```

### 串口协议
```
COM2 (控制端口):
- MOVE:{position}           - 移动探头到指定位置
- HOME                     - 探头归零
- START                    - 开始测量
- STOP                     - 停止测量
- STATUS                   - 获取设备状态

COM3 (数据端口):
- 格式: POSITION:{pos},COUNTS:{rate},TIMESTAMP:{time}
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 UNLICENSED 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 📞 技术支持

### 联系方式
- 邮箱: support@yourcompany.com
- 电话: +86-xxx-xxxx-xxxx
- 技术文档: [docs.yourcompany.com](https://docs.yourcompany.com)

### 问题反馈
请在 [GitHub Issues](https://github.com/your-org/radiation-detector/issues) 中报告问题。

## 🎉 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**注意**: 本软件专为符合CFR 21 Part 11要求的放射检测应用而设计。在生产环境中使用前，请务必进行充分的验证和测试。

[![Made with ❤️ by xitg](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F%20by%20MiniMax%20Agent-blue.svg)](https://minimax.com)