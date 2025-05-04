# 快捷指令源码工具 - 前端

这是快捷指令源码工具的前端项目，用于解析和显示iOS快捷指令源代码。应用可以处理JSON和XML格式的响应。

## 功能特点

- 通过iCloud链接获取快捷指令源码
- 支持JSON和XML格式输出
- 直观显示快捷指令的关键信息和动作列表
- 提供下载和复制功能
- 响应式设计，适配各种设备

## 技术栈

- React.js
- TypeScript
- Vite
- Tailwind CSS

## 安装和运行

### 前置条件

- Node.js 16+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

项目使用环境变量进行配置。复制`.env.example`文件为`.env`并根据需要进行修改：

```bash
cp .env.example .env
```

主要配置项说明：

- `VITE_API_BASE_URL`: API服务的基础URL
- `VITE_DEFAULT_FORMAT`: 默认输出格式 (json或xml)
- `VITE_APP_TITLE`: 应用标题
- `VITE_APP_SUBTITLE`: 应用副标题
- `VITE_ENABLE_WEB_EXPORT`: 是否启用Web导出功能

### 开发模式运行

```bash
pnpm dev
```

访问 http://localhost:5173 即可预览应用。

### 构建生产版本

```bash
pnpm build
```

构建后的文件将位于`dist`目录。

## 项目结构

```
src/
  ├── assets/         # 静态资源文件
  ├── components/     # React组件
  ├── utils/          # 工具函数和解析逻辑
  ├── App.tsx         # 主应用组件
  ├── App.css         # 应用样式
  ├── config.ts       # 配置文件
  ├── main.tsx        # 应用入口
  └── index.css       # 全局样式
```

## 部署

本项目支持部署到Cloudflare Pages。配置文件位于`wrangler.toml`。要部署到Cloudflare Pages，您可以：

```bash
pnpm build
wrangler pages deploy dist
```

或者配置GitHub Actions自动部署，配置文件位于`.github/workflows/deploy.yml`。

## 跨域问题排查

如果在开发过程中遇到CORS（跨域资源共享）错误，可能是因为API服务端配置问题。常见错误包括：

1. Access-Control-Allow-Origin头包含多个值
2. CORS头被重复添加

解决方案：

1. 确保Nginx（或其他服务器）只添加CORS头一次
2. 如果使用Cloudflare，检查SSL/TLS模式，建议使用"Full"或"Full (Strict)"模式
3. 考虑将API域名设置为DNS-only模式（灰云模式），避免Cloudflare代理

## 贡献指南

欢迎贡献代码或提交问题！请确保：

1. 创建新分支进行功能开发
2. 遵循项目的代码风格
3. 提交前运行测试
4. 创建详细的PR描述

## 许可证

MIT
