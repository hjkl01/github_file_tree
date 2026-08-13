# GitHub File Tree Sidebar Pro

一个用于 Tampermonkey 的 GitHub 仓库文件树增强脚本。

## 功能

- 📁 左侧文件树，目录可展开/收起
- 🎨 GitHub 风格现代 UI，自动适配深色/浅色模式
- 🔍 `Ctrl + P` / `Cmd + P` 快速搜索文件
- ⌨️ 搜索结果支持方向键和 Enter
- ↻ 手动刷新仓库文件树
- ⚡ 5 分钟 Tree 缓存，减少 GitHub API 请求
- 🖱️ 拖动边缘调整侧边栏宽度
- 👈 支持折叠侧边栏
- 📄 常见语言和文件类型图标
- 📌 当前打开文件高亮
- 🔗 普通点击在当前 Tab 打开，Ctrl/Cmd/Shift + 点击新 Tab 打开
- 🧭 支持 GitHub Turbo/PJAX/浏览器前进后退导航
- 🛡️ 检测 API 限流、404 和超大仓库 Tree 截断

## 安装

1. 安装 Tampermonkey。
2. 新建一个用户脚本。
3. 将 `main.js` 的全部内容复制进去并保存。
4. 打开任意 GitHub 仓库页面即可看到左侧文件树。

也可以直接从 GitHub 打开 `main.js`，复制脚本内容到 Tampermonkey。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl + P` / `Cmd + P` | 打开文件搜索 |
| `↑` / `↓` | 搜索结果移动 |
| `Enter` | 打开选中文件 |
| `Esc` | 关闭搜索 |
| `Ctrl/Cmd + 点击文件` | 新 Tab 打开 |

## 缓存

仓库信息和 Git Tree 默认缓存 5 分钟。侧边栏顶部的 `↻` 可以立即清除当前仓库 Tree 缓存并重新加载。

缓存只保存在浏览器的 `localStorage` 中，不会上传到第三方服务。

## 大型仓库

GitHub 的 Recursive Tree API 对超大型仓库可能返回 `truncated=true`。脚本会检测该状态并在底部提示，此时文件树可能不完整。

## 项目结构

```text
.
├── main.js
├── README.md
└── LICENSE
```

## License

MIT License。
