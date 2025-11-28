# Clash Verge Lite (Flux)

一个基于 React、Electron 和 TypeScript 构建的轻量级 Clash 客户端。

本应用旨在提供一个简洁、高效且易于使用的图形化界面，用于管理和切换 Clash 核心的代理设置。

## ✨ 功能特性

- **仪表盘**: 实时显示上行/下行速率，以及当前的代理模式和端口信息。
- **代理管理**:
    - 按代理组展示节点。
    - 快速切换代理组中的节点。
    - 节点延迟一键测试。
    - 支持节点名称搜索。
- **订阅管理**:
    - 添加、删除和更新 Clash 订阅。
    - 自由切换当前使用的配置文件。
- **流量统计**: 以图表形式实时分析域名和协议的流量数据。
- **实时日志**: 显示 Clash 核心的实时日志输出，支持暂停和清空。
- **系统设置**:
    - 修改 Clash 核心的关键设置，如混合端口、允许局域网、运行模式等。
    - 提供一键复制终端代理命令的功能。
    - 集成开发者工具，方便调试。

## 🚀 技术栈

- **前端**: React 19 + TypeScript
- **桌面应用框架**: Electron
- **构建工具**: Vite
- **状态管理**: TanStack Query (React Query)
- **UI 组件库**: shadcn/ui
- **样式**: Tailwind CSS
- **API 通信**: Axios
- **图表**: Recharts

## ⚡️ 快速开始

### 1. 环境准备

请确保你的开发环境中已安装以下软件：

- [Node.js](https://nodejs.org/) (建议使用 LTS 版本)
- [pnpm](https://pnpm.io/) (或 `npm`, `yarn`)

### 2. 安装依赖

克隆项目到本地，然后在项目根目录下执行以下命令安装所有依赖：

```bash
npm install
```
*如果在 Windows PowerShell 中执行失败，请尝试在 `CMD` 或 `Git Bash` 中运行。*

### 3. 开发模式

执行以下命令，应用将以开发模式启动，并带有热重载功能：

```bash
npm run dev
```

### 4. 生产构建

执行以下命令，Vite 和 TypeScript 将会构建用于生产环境的前端代码和 Electron 主进程代码：

```bash
npm run build
```
构建产物将位于 `dist` 和 `dist-electron` 目录中。

## ⚙️ 配置

### 连接到 Clash 核心

本应用通过 API 与正在运行的 Clash 核心进行通信。如果你的 Clash 核心配置了 `secret` (密钥)，你需要通过环境变量来配置它。

创建一个 `.env` 文件在项目根目录，并添加以下内容：

```
CLASH_SECRET=your-secret-here
```

将 `your-secret-here` 替换为你的 Clash 密钥。应用启动时会自动读取此配置。

---

*该项目作为代码优化和重构的示例，旨在展示一个现代化的 React + Electron 应用架构。*