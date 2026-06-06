# Personal Finance Manager

Local desktop personal finance and benefits manager built with Tauri, Vue, Element Plus, SQLite, and ECharts.

## Windows 本地运行与打包

开发运行命令：

```bash
npm run tauri dev
```

前端构建命令：

```bash
npm run build
```

Windows 打包命令：

```bash
npm run tauri build
```

数据库说明：

`finance.db` 由 Tauri SQL 插件存放在 Tauri 应用数据目录中，不在项目源码目录。不要把开发数据库或用户数据提交到 Git。

备份建议：

使用 Settings 页面导出 JSON 备份。JSON 备份是逻辑备份，便于后续恢复功能使用，不是原始 SQLite 文件复制。

未签名说明：

当前本地构建未做代码签名，Windows 可能显示安全提醒或 SmartScreen 提示。
