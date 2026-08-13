// ==UserScript==
// @name         GitHub File Tree Sidebar Pro
// @namespace    https://tampermonkey.net/
// @version      3.0.0
// @description  GitHub file tree with modern UI, collapse, resize and search
// @match        https://github.com/*/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const DEFAULT_WIDTH = 300;
  const MIN_WIDTH = 220;
  const MAX_WIDTH = 520;
  const WIDTH_KEY = 'ghft-width';
  const COLLAPSE_KEY = 'ghft-collapsed';

  let sidebarWidth = Number(localStorage.getItem(WIDTH_KEY)) || DEFAULT_WIDTH;
  let collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';

  GM_addStyle(`
    :root {
      --ghft-bg: #ffffff;
      --ghft-panel: #f6f8fa;
      --ghft-hover: #f0f2f5;
      --ghft-active: #ddf4ff;
      --ghft-border: #d8dee4;
      --ghft-text: #1f2328;
      --ghft-muted: #656d76;
      --ghft-accent: #0969da;
      --ghft-shadow: 0 8px 30px rgba(31,35,40,.12);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ghft-bg: #0d1117;
        --ghft-panel: #161b22;
        --ghft-hover: #21262d;
        --ghft-active: #1f6feb33;
        --ghft-border: #30363d;
        --ghft-text: #e6edf3;
        --ghft-muted: #8b949e;
        --ghft-accent: #58a6ff;
        --ghft-shadow: 0 8px 30px rgba(0,0,0,.35);
      }
    }

    body { padding-left: ${collapsed ? 0 : sidebarWidth}px !important; transition: padding-left .2s ease; }

    #ghft {
      position: fixed; inset: 64px auto 0 0; width: ${sidebarWidth}px;
      background: var(--ghft-bg); color: var(--ghft-text);
      border-right: 1px solid var(--ghft-border); z-index: 9999;
      display: flex; flex-direction: column; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      box-shadow: 4px 0 18px rgba(0,0,0,.04);
    }

    #ghft-header {
      height: 54px; min-height: 54px; box-sizing: border-box; padding: 0 12px;
      display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--ghft-border);
      background: var(--ghft-panel);
    }
    #ghft-toggle, #ghft-search-btn {
      width: 30px; height: 30px; border: 1px solid var(--ghft-border); border-radius: 7px;
      background: var(--ghft-bg); color: var(--ghft-text); display: grid; place-items: center;
      cursor: pointer; flex: 0 0 auto; transition: .15s ease;
    }
    #ghft-toggle:hover, #ghft-search-btn:hover { background: var(--ghft-hover); border-color: var(--ghft-muted); }
    #ghft-title { min-width: 0; flex: 1; }
    #ghft-repo { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #ghft-branch { font-size: 11px; color: var(--ghft-muted); margin-top: 2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    #ghft-body { overflow: auto; flex: 1; padding: 10px 8px 20px; font-size: 13px; }
    #ghft-body::-webkit-scrollbar { width: 8px; }
    #ghft-body::-webkit-scrollbar-thumb { background: var(--ghft-border); border-radius: 8px; }

    .item {
      position: relative; min-height: 30px; box-sizing: border-box; padding: 5px 8px 5px 28px;
      display: flex; align-items: center; border-radius: 6px; cursor: pointer;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;
      transition: background .12s ease, color .12s ease;
    }
    .item:hover { background: var(--ghft-hover); }
    .item.file:hover { color: var(--ghft-accent); }
    .folder::before, .file::before {
      position: absolute; left: 8px; width: 16px; text-align: center; font-size: 14px;
    }
    .folder::before { content: '›'; color: var(--ghft-muted); font-size: 20px; line-height: 12px; }
    .folder.open::before { content: '⌄'; }
    .folder::after { content: '📁'; position:absolute; left:18px; font-size:12px; }
    .folder { padding-left: 42px; font-weight: 500; }
    .file::before { content: '•'; color: var(--ghft-muted); font-size: 16px; }
    .children { display: none; margin-left: 12px; padding-left: 7px; border-left: 1px solid var(--ghft-border); }
    .folder.open + .children { display: block; }

    #ghft-resize { position:absolute; right:-3px; top:0; width:6px; height:100%; cursor:ew-resize; }
    #ghft-resize:hover { background: var(--ghft-accent); opacity:.45; }

    #ghft-float-btn {
      position: fixed; top: 72px; left: 10px; width: 36px; height: 36px; border-radius: 9px;
      background: var(--ghft-bg); border: 1px solid var(--ghft-border); color: var(--ghft-text);
      display: ${collapsed ? 'grid' : 'none'}; place-items:center; cursor:pointer; z-index:9999;
      box-shadow: var(--ghft-shadow); transition: transform .15s ease;
    }
    #ghft-float-btn:hover { transform: translateY(-1px); }

    #ghft-search-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.18); backdrop-filter: blur(2px);
      z-index: 10000; display: none; align-items:flex-start; justify-content:center; padding-top:15vh;
    }
    #ghft-search {
      width: min(600px, calc(100vw - 32px)); background:var(--ghft-bg); color:var(--ghft-text);
      border:1px solid var(--ghft-border); border-radius:12px; box-shadow:var(--ghft-shadow); overflow:hidden;
    }
    #ghft-search-top { display:flex; align-items:center; border-bottom:1px solid var(--ghft-border); padding:10px 14px; gap:10px; }
    #ghft-search-icon { color:var(--ghft-muted); font-size:18px; }
    #ghft-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--ghft-text); font-size:15px; padding:4px; }
    #ghft-search-hint { font-size:11px; color:var(--ghft-muted); border:1px solid var(--ghft-border); padding:2px 6px; border-radius:5px; }
    #ghft-search ul { max-height:420px; overflow:auto; list-style:none; padding:6px; margin:0; }
    #ghft-search li { padding:9px 10px; border-radius:7px; cursor:pointer; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #ghft-search li:hover { background:var(--ghft-hover); color:var(--ghft-accent); }
    #ghft-search-empty { padding:22px; text-align:center; color:var(--ghft-muted); font-size:13px; }
  `);

  const m = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!m) return;
  const owner = m[1];
  const repo = m[2];
  let branch = 'main';
  let allFiles = [];

  const api = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    return r.json();
  });

  async function loadTree() {
    const repoInfo = await api(`https://api.github.com/repos/${owner}/${repo}`);
    branch = repoInfo.default_branch;
    const tree = await api(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    allFiles = tree.tree.filter(i => i.type === 'blob').map(i => i.path);
    return tree.tree;
  }

  function buildTree(list) {
    const root = {};
    list.forEach(i => {
      const parts = i.path.split('/');
      let cur = root;
      parts.forEach((p, idx) => {
        if (!cur[p]) cur[p] = { type: idx === parts.length - 1 ? i.type : 'tree', children: {} };
        cur = cur[p].children;
      });
    });
    return root;
  }

  function render(tree, el, base = '') {
    Object.entries(tree).sort((a,b) => {
      const ad = a[1].type === 'tree', bd = b[1].type === 'tree';
      return ad !== bd ? (ad ? -1 : 1) : a[0].localeCompare(b[0]);
    }).forEach(([name,node]) => {
      const path = base ? `${base}/${name}` : name;
      const div = document.createElement('div');
      div.className = `item ${node.type === 'tree' ? 'folder' : 'file'}`;
      div.textContent = name;
      div.title = path;
      el.appendChild(div);
      if (node.type === 'tree') {
        const children = document.createElement('div');
        children.className = 'children';
        el.appendChild(children);
        div.onclick = e => { e.stopPropagation(); div.classList.toggle('open'); };
        render(node.children, children, path);
      } else {
        div.onclick = () => window.open(`https://github.com/${owner}/${repo}/blob/${branch}/${path}`, '_blank');
      }
    });
  }

  function initSearch() {
    const overlay = document.createElement('div');
    overlay.id = 'ghft-search-overlay';
    const box = document.createElement('div');
    box.id = 'ghft-search';
    const top = document.createElement('div');
    top.id = 'ghft-search-top';
    const icon = document.createElement('span'); icon.id = 'ghft-search-icon'; icon.textContent = '⌕';
    const input = document.createElement('input'); input.placeholder = 'Search files…';
    const hint = document.createElement('span'); hint.id = 'ghft-search-hint'; hint.textContent = 'ESC';
    const ul = document.createElement('ul');
    top.append(icon,input,hint); box.append(top,ul); overlay.appendChild(box); document.body.appendChild(overlay);

    const close = () => { overlay.style.display = 'none'; input.value=''; ul.innerHTML=''; };
    overlay.onclick = e => { if (e.target === overlay) close(); };
    input.oninput = () => {
      ul.innerHTML = '';
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const results = allFiles.filter(f => f.toLowerCase().includes(q)).slice(0,50);
      if (!results.length) { const empty=document.createElement('div'); empty.id='ghft-search-empty'; empty.textContent='No matching files'; ul.appendChild(empty); return; }
      results.forEach(f => { const li=document.createElement('li'); li.textContent=f; li.title=f; li.onclick=()=>{window.open(`https://github.com/${owner}/${repo}/blob/${branch}/${f}`,'_blank'); close();}; ul.appendChild(li); });
    };
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); overlay.style.display='flex'; input.focus(); }
      if (e.key === 'Escape') close();
    });
    return () => { overlay.style.display='flex'; input.focus(); };
  }

  async function init() {
    try {
      const list = await loadTree();
      const tree = buildTree(list);
      const openSearch = initSearch();

      if (!collapsed) {
        const sidebar=document.createElement('div'); sidebar.id='ghft';
        const header=document.createElement('div'); header.id='ghft-header';
        const toggle=document.createElement('button'); toggle.id='ghft-toggle'; toggle.textContent='‹'; toggle.title='Collapse sidebar';
        toggle.onclick=()=>{localStorage.setItem(COLLAPSE_KEY,'1'); location.reload();};
        const title=document.createElement('div'); title.id='ghft-title';
        const repoName=document.createElement('div'); repoName.id='ghft-repo'; repoName.textContent=`${owner} / ${repo}`;
        const branchName=document.createElement('div'); branchName.id='ghft-branch'; branchName.textContent=`⎇ ${branch}`;
        title.append(repoName,branchName);
        const searchBtn=document.createElement('button'); searchBtn.id='ghft-search-btn'; searchBtn.textContent='⌕'; searchBtn.title='Search (Ctrl/Cmd + P)'; searchBtn.onclick=openSearch;
        header.append(toggle,title,searchBtn);
        const body=document.createElement('div'); body.id='ghft-body'; render(tree,body);
        const resize=document.createElement('div'); resize.id='ghft-resize';
        resize.onmousedown=e=>{ e.preventDefault(); document.body.style.cursor='ew-resize'; const move=ev=>{sidebarWidth=Math.min(MAX_WIDTH,Math.max(MIN_WIDTH,ev.clientX)); sidebar.style.width=sidebarWidth+'px'; document.body.style.paddingLeft=sidebarWidth+'px';}; const up=()=>{localStorage.setItem(WIDTH_KEY,sidebarWidth); document.body.style.cursor=''; document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up);}; document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); };
        sidebar.append(header,body,resize); document.body.appendChild(sidebar);
      }

      const floatBtn=document.createElement('button'); floatBtn.id='ghft-float-btn'; floatBtn.textContent='›'; floatBtn.title='Open file tree';
      floatBtn.onclick=()=>{localStorage.setItem(COLLAPSE_KEY,'0'); location.reload();}; document.body.appendChild(floatBtn);
    } catch (err) { console.error('[GitHub File Tree]', err); }
  }

  init();
})();
