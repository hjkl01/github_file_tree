// ==UserScript==
// @name         GitHub File Tree Sidebar Pro
// @namespace    https://tampermonkey.net/
// @version      2.1.0
// @description  GitHub file tree with collapse, resize, search, and floating toggle
// @match        https://github.com/*/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  /* ================= 配置 ================= */
  const DEFAULT_WIDTH = 300;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;
  const WIDTH_KEY = 'ghft-width';
  const COLLAPSE_KEY = 'ghft-collapsed';

  let sidebarWidth = Number(localStorage.getItem(WIDTH_KEY)) || DEFAULT_WIDTH;
  let collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';

  /* ================= 样式 ================= */
  GM_addStyle(`
    :root {
      --bg: #ffffff;
      --bg-hover: #f6f8fa;
      --border: #d0d7de;
      --text: #24292f;
      --header: #f6f8fa;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --bg-hover: #161b22;
        --border: #30363d;
        --text: #c9d1d9;
        --header: #161b22;
      }
    }

    body {
      padding-left: ${collapsed ? 0 : sidebarWidth}px !important;
      transition: padding-left .15s ease;
    }

    /* ===== 侧边栏 ===== */
    #ghft {
      position: fixed;
      top: 64px;
      left: 0;
      height: calc(100vh - 64px);
      width: ${sidebarWidth}px;
      background: var(--bg);
      color: var(--text);
      border-right: 1px solid var(--border);
      z-index: 9999;
      display: ${collapsed ? 'none' : 'block'};
    }

    #ghft-header {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      background: var(--header);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }

    #ghft-toggle {
      cursor: pointer;
      margin-right: 8px;
      font-size: 16px;
    }

    #ghft-body {
      overflow: auto;
      height: calc(100% - 34px);
      font-size: 13px;
    }

    .item {
      padding-left: 14px;
      line-height: 1.9;
      cursor: pointer;
      white-space: nowrap;
    }

    .item:hover {
      background: var(--bg-hover);
    }

    .folder::before { content: "▸ 📁 "; }
    .folder.open::before { content: "▾ 📁 "; }
    .file::before { content: "📄 "; }

    .children {
      display: none;
      margin-left: 14px;
    }

    .folder.open + .children {
      display: block;
    }

    #ghft-resize {
      position: absolute;
      right: 0;
      top: 0;
      width: 5px;
      height: 100%;
      cursor: ew-resize;
    }

    /* ===== 悬浮打开按钮 ===== */
    #ghft-float-btn {
      position: fixed;
      top: 72px;
      left: 6px;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      display: ${collapsed ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9999;
    }

    #ghft-float-btn:hover {
      background: var(--bg-hover);
    }

    /* ===== 搜索 ===== */
    #ghft-search {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 420px;
      background: var(--bg);
      border: 1px solid var(--border);
      box-shadow: 0 10px 30px rgba(0,0,0,.2);
      z-index: 10000;
      display: none;
    }

    #ghft-search input {
      width: 100%;
      padding: 10px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-size: 14px;
    }

    #ghft-search ul {
      max-height: 300px;
      overflow: auto;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    #ghft-search li {
      padding: 6px 10px;
      cursor: pointer;
    }

    #ghft-search li:hover {
      background: var(--bg-hover);
    }
  `);

  /* ================= 仓库 ================= */
  const m = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!m) return;
  const owner = m[1];
  const repo = m[2];

  let branch = 'main';
  let allFiles = [];

  const api = url => fetch(url).then(r => r.json());

  async function loadTree() {
    const repoInfo = await api(`https://api.github.com/repos/${owner}/${repo}`);
    branch = repoInfo.default_branch;

    const tree = await api(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );

    allFiles = tree.tree.filter(i => i.type === 'blob').map(i => i.path);
    return tree.tree;
  }

  function buildTree(list) {
    const root = {};
    list.forEach(i => {
      const parts = i.path.split('/');
      let cur = root;
      parts.forEach((p, idx) => {
        if (!cur[p]) {
          cur[p] = { type: idx === parts.length - 1 ? i.type : 'tree', children: {} };
        }
        cur = cur[p].children;
      });
    });
    return root;
  }

  function render(tree, el, base = '') {
  Object.entries(tree)
    .sort((a, b) => {
      const aIsDir = a[1].type === 'tree';
      const bIsDir = b[1].type === 'tree';

      // 1️⃣ 文件夹优先
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }

      // 2️⃣ 同类型按名称排序
      return a[0].localeCompare(b[0]);
    })
    .forEach(([name, node]) => {
      const path = base ? `${base}/${name}` : name;

      const div = document.createElement('div');
      div.className = `item ${node.type === 'tree' ? 'folder' : 'file'}`;
      div.textContent = name;
      el.appendChild(div);

      if (node.type === 'tree') {
        const children = document.createElement('div');
        children.className = 'children';
        el.appendChild(children);

        div.onclick = e => {
          e.stopPropagation();
          div.classList.toggle('open');
        };

        render(node.children, children, path);
      } else {
        div.onclick = () => {
          window.open(
            `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
            '_blank'
          );
        };
      }
    });
}


  function initSearch() {
    const box = document.createElement('div');
    box.id = 'ghft-search';

    const input = document.createElement('input');
    input.placeholder = 'Search files…';

    const ul = document.createElement('ul');

    input.oninput = () => {
      ul.innerHTML = '';
      const q = input.value.toLowerCase();
      if (!q) return;

      allFiles
        .filter(f => f.toLowerCase().includes(q))
        .slice(0, 50)
        .forEach(f => {
          const li = document.createElement('li');
          li.textContent = f;
          li.onclick = () => {
            window.open(
              `https://github.com/${owner}/${repo}/blob/${branch}/${f}`,
              '_blank'
            );
            box.style.display = 'none';
          };
          ul.appendChild(li);
        });
    };

    box.append(input, ul);
    document.body.appendChild(box);

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        box.style.display = 'block';
        input.focus();
      }
      if (e.key === 'Escape') box.style.display = 'none';
    });
  }

  async function init() {
    const list = await loadTree();
    const tree = buildTree(list);

    /* 侧边栏 */
    if (!collapsed) {
      const sidebar = document.createElement('div');
      sidebar.id = 'ghft';

      const header = document.createElement('div');
      header.id = 'ghft-header';

      const toggle = document.createElement('span');
      toggle.id = 'ghft-toggle';
      toggle.textContent = '☰';
      toggle.onclick = () => {
        localStorage.setItem(COLLAPSE_KEY, '1');
        location.reload();
      };

      header.append(toggle, `${repo} / ${branch}`);

      const body = document.createElement('div');
      body.id = 'ghft-body';
      render(tree, body);

      const resize = document.createElement('div');
      resize.id = 'ghft-resize';
      resize.onmousedown = e => {
        document.onmousemove = ev => {
          sidebarWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX));
          sidebar.style.width = sidebarWidth + 'px';
          document.body.style.paddingLeft = sidebarWidth + 'px';
        };
        document.onmouseup = () => {
          localStorage.setItem(WIDTH_KEY, sidebarWidth);
          document.onmousemove = null;
        };
      };

      sidebar.append(header, body, resize);
      document.body.appendChild(sidebar);
    }

    /* 悬浮按钮 */
    const floatBtn = document.createElement('div');
    floatBtn.id = 'ghft-float-btn';
    floatBtn.textContent = '☰';
    floatBtn.onclick = () => {
      localStorage.setItem(COLLAPSE_KEY, '0');
      location.reload();
    };
    document.body.appendChild(floatBtn);

    initSearch();
  }

  init();
})();
