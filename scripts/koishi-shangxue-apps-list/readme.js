const fs = require('node:fs').promises;
const https = require('node:https');
const path = require('node:path');

const GITHUB_REPO_URL = 'https://api.github.com/repos/shangxueink/koishi-shangxue-apps';
const PLUGINS_PATH = '/contents/plugins';
const SCRIPTS_PATH = '/contents/scripts';
const AUTHOR_AVATAR_URL = 'https://avatars.githubusercontent.com/u/138397030';

const PLUGINS_JSON_PATH = path.join(process.cwd(), 'plugins.json');
const SCRIPTS_JSON_PATH = path.join(process.cwd(), 'scripts.json');
const README_HTML_PATH = path.join(process.cwd(), 'readme.html');

const COLOR_SCHEMES = {
  dark: {
    bg: 'rgb(30, 30, 32)',
    card: 'rgb(37, 37, 41)',
    border: 'rgba(255,255,255,0.1)'
  },
  light: {
    bg: 'rgb(240,240,242)',
    card: 'rgb(249,249,250)',
    border: 'rgba(0,0,0,0.1)'
  },
  gray: {
    bg: 'rgb(230,223,220)',
    card: 'rgb(234,228,225)',
    border: 'rgba(0,0,0,0.1)'
  }
};

const UPDATE_PLUGINS_FROM_GITHUB = true;
const UPDATE_SCRIPTS_FROM_GITHUB = true;

// 仓库小插件配置
const SMALL_PLUGINS_CONFIG = [
  {
    name: '仓库小插件',
    id: 'scripts',
  }
];


async function getPluginList() {
  const url = GITHUB_REPO_URL + PLUGINS_PATH;
  const response = await fetchFromGitHub(url);
  return response.filter(item => item.type === 'dir');
}

async function getPluginInfo(plugin) {
  try {
    const packageJsonUrl = `https://raw.githubusercontent.com/shangxueink/koishi-shangxue-apps/main/plugins/${plugin.name}/package.json`;
    const response = await fetchFromGitHub(packageJsonUrl);
    let description = response.description;
    if (response.koishi && response.koishi.description && response.koishi.description.zh) {
      description = response.description.length > response.koishi.description.zh.length ? response.description : response.koishi.description.zh;
    }
    return {
      name: plugin.name,
      version: response.version,
      description: description,
      homepage: `https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/${plugin.name}`,
    };
  } catch (error) {
    console.error(`Error fetching ${plugin.name}:`, error);
    return null;
  }
}

async function getScriptList() {
  const url = GITHUB_REPO_URL + SCRIPTS_PATH;
  const response = await fetchFromGitHub(url);
  return response.filter(item => item.type === 'dir');
}

async function getScriptInfo(script) {
  return {
    name: script.name,
    homepage: `https://github.com/shangxueink/koishi-shangxue-apps/tree/main/scripts/${script.name}`,
  };
}


function fetchFromGitHub(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Node.js GitHub Readme Generator' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data); // Resolve as raw text if JSON parsing fails (for markdown files)
          }
        } else reject(new Error(`Request failed: ${res.statusCode} for URL: ${url}`));
      });
    }).on('error', reject);
  });
}

function renderMarkdownLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function renderMarkdown(markdownText) {
  let html = markdownText
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^ {2,}- (.*$)/gm, '<li style="margin-left: 20px;">$1</li>');

  let paragraphs = html.split('\n\n').map(p => {
    if (p.startsWith('<h1>') || p.startsWith('<h2>') || p.startsWith('<h3>') || p.startsWith('<li>') || p.startsWith('<blockquote') || p.trim() === '') {
      return p;
    } else {
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }
  }).join('\n');

  return paragraphs;
}


async function getPluginsData() {
  if (UPDATE_PLUGINS_FROM_GITHUB) {
    const plugins = await getPluginList();
    const pluginInfoPromises = plugins.map(p => getPluginInfo(p));
    let allPlugins = (await Promise.all(pluginInfoPromises)).filter(Boolean);
    await fs.writeFile(PLUGINS_JSON_PATH, JSON.stringify(allPlugins, null, 2));
    console.log('插件数据已更新到 plugins.json');
    return allPlugins;
  } else {
    const data = await fs.readFile(PLUGINS_JSON_PATH, 'utf-8');
    return JSON.parse(data);
  }
}

async function getScriptsData() {
  if (UPDATE_SCRIPTS_FROM_GITHUB) {
    const scripts = await getScriptList();
    const scriptInfoPromises = scripts.map(s => getScriptInfo(s));
    let allScripts = (await Promise.all(scriptInfoPromises)).filter(Boolean);
    await fs.writeFile(SCRIPTS_JSON_PATH, JSON.stringify(allScripts, null, 2));
    console.log('脚本数据已更新到 scripts.json');
    return allScripts;
  } else {
    const data = await fs.readFile(SCRIPTS_JSON_PATH, 'utf-8');
    return JSON.parse(data);
  }
}

function generateHTML(allPlugins, allScripts) {
  const smallPluginsMenuHTML = SMALL_PLUGINS_CONFIG.map(pluginGroup => {
    return `<li><a href="#${pluginGroup.id}" data-tab="${pluginGroup.id}">${pluginGroup.name}</a></li>`;
  }).join('');


  const pluginListHTML = `
      <div id="plugins" class="tab-content active">
        <div class="plugin-grid" id="pluginGrid">
          ${allPlugins.map((p, index) => `
            <div class="plugin-card" data-name="${p.name.toLowerCase()}" data-description="${p.description.toLowerCase()}" data-version="${p.version.toLowerCase()}" style="animation-delay: ${index * 0.015}s;">
              <h3>${p.name}</h3>
              <p style="font-size:0.9em">v${p.version}</p>
              <p>${renderMarkdownLinks(p.description)}</p>
              <a href="${p.homepage}" target="_blank">仓库地址 →</a>
            </div>
          `).join('')}
        </div>
      </div>
  `;

  const scriptListHTML = `
      <div id="scripts" class="tab-content">
        <div class="plugin-grid" id="scriptGrid">
          ${allScripts.map((s, index) => `
            <div class="plugin-card" data-scriptname="${s.name.toLowerCase()}" style="animation-delay: ${index * 0.015}s;">
              <h3>${s.name}</h3>
              <p style="font-size:0.9em">Scripts</p>
              <p>该脚本没有介绍，你可以访问仓库地址查看更多信息。</p>
              <a href="${s.homepage}" target="_blank">仓库地址 →</a>
            </div>
          `).join('')}
        </div>
      </div>
  `;


  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>插件列表</title>
  <style>
    :root {
      --transition-time: 0.3s;
      --animation-delay-increment: 0.015s; /* Reduced delay increment for smoother animation */
    }

    body {
      margin: 0;
      font-family: system-ui;
      transition: background-color var(--transition-time);
      overflow-x: hidden;
      display: flex; /* Flex container for sidebar and content */
    }

    body.dark-mode {
      background-color: ${COLOR_SCHEMES.dark.bg};
      --card-bg: ${COLOR_SCHEMES.dark.card};
      --border-color: ${COLOR_SCHEMES.dark.border};
      --text-color: rgba(255,255,255,0.9);
      --secondary-color: rgba(255,255,255,0.7);
    }

    body.light-mode {
      background-color: ${COLOR_SCHEMES.light.bg};
      --card-bg: ${COLOR_SCHEMES.light.card};
      --border-color: ${COLOR_SCHEMES.light.border};
      --text-color: rgba(0,0,0,0.9);
      --secondary-color: rgba(0,0,0,0.7);
    }

    body.gray-mode {
      background-color: ${COLOR_SCHEMES.gray.bg};
      --card-bg: ${COLOR_SCHEMES.gray.card};
      --border-color: ${COLOR_SCHEMES.gray.border};
      --text-color: rgba(0,0,0,0.9);
      --secondary-color: rgba(0,0,0,0.7);
    }

    .sidebar {
      width: 240px;
      background-color: var(--card-bg);
      border-right: 1px solid var(--border-color);
      padding: 20px;
      box-sizing: border-box;
      height: 100vh; /* Full height sidebar */
      position: sticky; /* Sticky sidebar */
      top: 0;
      overflow-y: auto; /* Scroll if content overflows */
      transition: all var(--transition-time);
      color: var(--text-color);
    }

    .sidebar h2 {
      margin-top: 0;
      margin-bottom: 20px;
    }

    .sidebar-nav {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar-nav li {
      margin-bottom: 10px;
    }

    .sidebar-nav a {
      display: block;
      padding: 8px 12px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--text-color);
      transition: background-color var(--transition-time);
    }

    .sidebar-nav a:hover, .sidebar-nav a.active {
      background-color: rgba(255,255,255,0.1);
    }

    .sidebar-nav .sub-nav {
      padding-left: 15px;
      margin-top: 5px;
      display: none; /* Initially hidden sub-nav */
    }

    .sidebar-nav .has-subnav > a.active + .sub-nav,
    .sidebar-nav .has-subnav > .sub-nav.active {
      display: block; /* Show sub-nav when parent is active */
    }


    .content {
      flex-grow: 1;
      padding: 30px 20px;
      box-sizing: border-box;
    }


    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px; /* Reduced margin */
      flex-wrap: wrap;
    }

    .theme-toggle {
      padding: 8px 16px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      transition: all var(--transition-time);
      color: var(--text-color);
    }

    .search-box {
      margin-left: auto; /* Push to the right */
    }

    .search-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--card-bg);
      color: var(--text-color);
      transition: all var(--transition-time);
    }

    .search-input:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.5); /* Example focus style */
    }


    .plugin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 20px; /* Added margin */
    }

    .plugin-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      min-height: 140px;
      opacity: 0;
      transform: translateY(10px); /* Reduced initial Y offset */
      animation: cardAppear 0.4s ease-out forwards; /* Slightly faster animation */
      will-change: transform, opacity;
      animation-play-state: paused;
    }

    .plugin-card:hover {
      transform: translateY(-6px) scale(1.02);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    }

    .plugin-card h3 {
      margin: 0 0 12px;
      color: var(--text-color);
      font-size: 1.2em;
      transition: color var(--transition-time);
    }

    .plugin-card p {
      margin: 0 0 16px;
      color: var(--secondary-color);
      line-height: 1.5;
      flex-grow: 1;
      transition: color var(--transition-time);
    }

    .plugin-card a {
      color: var(--text-color);
      text-decoration: none;
      font-weight: 500;
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 6px;
      transition: all var(--transition-time);
      display: inline-block;
      margin-top: 8px;
    }

    .plugin-card a:hover {
      background: rgba(255,255,255,0.15);
      transform: scale(1.05);
    }

    @keyframes cardAppear {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tab-content {
      display: none; /* Initially hide all content areas */
    }

    .tab-content.active {
      display: block; /* Show active content area */
    }

    .markdown-body {
      color: var(--text-color);
      line-height: 1.6;
    }

    .markdown-body a {
      color: cornflowerblue; /* Example link color */
    }

    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
      color: var(--text-color);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3em;
    }

    .markdown-body ul, .markdown-body ol {
      padding-left: 20px;
    }

    .markdown-body blockquote {
      border-left: 3px solid var(--border-color);
      padding-left: 10px;
      font-style: italic;
      color: var(--secondary-color);
    }


  </style>
</head>
<body class="gray-mode">
  <aside class="sidebar">
    <img src="${AUTHOR_AVATAR_URL}" width="48" height="48" style="border-radius:50%; margin-bottom: 20px; transition: transform 0.4s ease-out;" alt="作者头像"
      onmouseover="this.style.transform='rotate(360deg)'" onmouseout="this.style.transform='rotate(0deg)'">
    <h2>项目概要</h2>
    <ul class="sidebar-nav">
      <li><a href="#plugins" class="active" data-tab="plugins">插件列表</a></li>
      ${smallPluginsMenuHTML}
    </ul>
  </aside>
  <div class="content">
    <div class="container">
      <div class="header">
        <h1 style="margin:0;color:var(--text-color);transition: color var(--transition-time);">插件列表</h1>
        <div class="search-box">
          <input type="text" class="search-input" placeholder="搜索插件/脚本..." oninput="searchPlugins(this.value)">
        </div>
        <select class="theme-toggle" onchange="changeTheme(event)">
          <option value="gray">🌤️ 浅色模式</option>
          <option value="dark">🌙 深色模式</option>
          <option value="light">☀️ 亮色模式</option>
        </select>
      </div>

      ${pluginListHTML}
      ${scriptListHTML}


    </div>
  </div>

  <script>
    const pluginCards = Array.from(document.querySelectorAll('#pluginGrid .plugin-card')); // 插件卡片
    const scriptCards = Array.from(document.querySelectorAll('#scriptGrid .plugin-card'));   // 脚本卡片
    let currentCards = pluginCards; // 初始显示插件卡片

    // Fisher-Yates (Knuth) Shuffle algorithm
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function applyAnimationDelays(cards) {
      cards.forEach((card, index) => {
        card.style.animationDelay = \`\${index * 0.015} s\`;
      });
    }


    function changeTheme(event) {
      const theme = event.target.value;
      document.body.className = theme + '-mode';
    }

    function handleScroll() {
      currentCards.forEach(card => { // 使用 currentCards
        if (isElementInViewport(card)) {
          card.style.animationPlayState = 'running';
        }
      });
    }

    function isElementInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top <= window.innerHeight * 1.1 &&
        rect.bottom >= 0 &&
        rect.left <= window.innerWidth * 1.1 &&
        rect.right >= 0
      );
    }

    function searchPlugins(searchText) {
      const keywords = searchText.toLowerCase().split(' ').filter(keyword => keyword.trim() !== '');
      let filteredPlugins = [];
      let filteredScripts = [];

      // 搜索插件
      filteredPlugins = pluginCards.filter(card => {
        const name = card.dataset.name;
        const description = card.dataset.description;
        const version = card.dataset.version; // 获取版本号
        return keywords.every(keyword =>
          name.includes(keyword) ||
          description.includes(keyword) ||
          version.includes(keyword) // 搜索版本号
        );
      });

      // 搜索脚本
      filteredScripts = scriptCards.filter(card => {
        const scriptName = card.dataset.scriptname;
        return keywords.every(keyword => scriptName.includes(keyword));
      });


      // 更新插件列表
      const pluginGrid = document.getElementById('pluginGrid');
      pluginGrid.innerHTML = ''; // Clear existing content
      filteredPlugins.forEach((card, index) => {
        const clonedCard = card.cloneNode(true); // Clone to avoid modifying original cards
        clonedCard.style.animationDelay = \`\${index * 0.015}s\`; // Apply animation delay
        pluginGrid.appendChild(clonedCard); // Append to grid
      });


      // 更新脚本列表
      const scriptGrid = document.getElementById('scriptGrid');
      scriptGrid.innerHTML = ''; // Clear existing content
      filteredScripts.forEach((card, index) => {
        const clonedCard = card.cloneNode(true); // Clone to avoid modifying original cards
        clonedCard.style.animationDelay = \`\${index * 0.015}s\`; // Apply animation delay
        scriptGrid.appendChild(clonedCard); // Append to grid
      });


      // 更新 currentCards 为当前显示的卡片
      const activeTab = document.querySelector('.sidebar-nav a.active').getAttribute('data-tab');
      if (activeTab === 'plugins') {
        currentCards = filteredPlugins.length > 0 ? Array.from(document.querySelectorAll('#pluginGrid .plugin-card')) : []; // 搜索结果为空时，currentCards 也应该为空，避免 handleScroll 报错
      } else if (activeTab === 'scripts') {
        currentCards = filteredScripts.length > 0 ? Array.from(document.querySelectorAll('#scriptGrid .plugin-card')) : [];
      } else {
        currentCards = [...Array.from(document.querySelectorAll('#pluginGrid .plugin-card')), ...Array.from(document.querySelectorAll('#scriptGrid .plugin-card'))]; // 如果有其他 tab，可能需要显示所有
      }


      handleScroll(); // 触发滚动检查
    }


    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

      document.getElementById(tabId).classList.add('active');

      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      const activeLink = document.querySelector(\`.sidebar-nav a[data-tab="\${tabId}"]\`);
      if (activeLink) {
        activeLink.classList.add('active');
      }

      if (tabId === 'plugins') {
        currentCards = Array.from(document.querySelectorAll('#pluginGrid .plugin-card')); // Re-query cards
      } else if (tabId === 'scripts') {
        currentCards = Array.from(document.querySelectorAll('#scriptGrid .plugin-card')); // Re-query cards
      }

      window.scrollTo(0, 0);
      handleScroll();
    }


    document.addEventListener('DOMContentLoaded', () => {
      // Shuffle plugin cards
      const pluginGrid = document.getElementById('pluginGrid');
      shuffleArray(pluginCards);
      pluginGrid.innerHTML = ''; // Clear initial content
      pluginCards.forEach(card => pluginGrid.appendChild(card)); // Append shuffled cards
      applyAnimationDelays(Array.from(document.querySelectorAll('#pluginGrid .plugin-card'))); // Re-apply animation delays

      // Shuffle script cards
      const scriptGrid = document.getElementById('scriptGrid');
      shuffleArray(scriptCards);
      scriptGrid.innerHTML = ''; // Clear initial content
      scriptCards.forEach(card => scriptGrid.appendChild(card)); // Append shuffled cards
      applyAnimationDelays(Array.from(document.querySelectorAll('#scriptGrid .plugin-card'))); // Re-apply animation delays


      switchTab('plugins');

      document.querySelectorAll('.sidebar-nav a[data-tab]').forEach(link => {
        link.addEventListener('click', function(event) {
          event.preventDefault();
          const tabId = this.getAttribute('data-tab');
          switchTab(tabId);
        });
      });


      handleScroll(); // Initial scroll check
    });


    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
  </script>
</body>
</html>
`;
}

async function main() {
  try {
    let allPlugins = await getPluginsData();
    let allScripts = await getScriptsData();

    const html = generateHTML(allPlugins, allScripts);
    await fs.writeFile(README_HTML_PATH, html); // Use absolute path for readme.html
    console.log('readme.html 生成成功!');
  } catch (error) {
    console.error('生成失败:', error);
  }
}

main();
