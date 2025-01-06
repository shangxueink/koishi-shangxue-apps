const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const open = require('open'); // 引入 open 模块
const app = express();
const port = 0;  // 设置为 0，让操作系统自动分配端口

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 设置静态文件目录
const publicDir = isDev
  ? path.join(__dirname) // 开发环境：使用项目根目录下的 public
  : path.join(path.dirname(process.execPath)); // 生产环境：使用 EXE 文件所在目录下的 public


// 存储所有下载任务的状态
const downloadTasks = new Map();

app.use(express.static(path.join(publicDir, 'public')));

// 为根路径定义路由
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'public', 'index.html')); // 返回前端页面
});

// 读取文件内容
const readFileContent = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return null;
  }
};

// 处理 URL
const processUrl = (url) => {
  return url.startsWith('http') ? url : 'https://i0.hdslb.com/bfs/' + url;
};

// 将图片 URL 转换为 Base64
const urlToBase64 = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`Error fetching image: ${url}`, error.message);
    return 'https://i0.hdslb.com/bfs/article/9dd0b5ec23b4139b772ad508788361ae312276085.png'; // 加载失败的占位符
  }
};

// 下载图片
const downloadImage = async (url, destination) => {
  const writer = fs.createWriteStream(destination);
  try {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading image: ${url}`, error.message);
    return null;
  }
};

// 启动下载任务
const startDownload = async (bookName, lines, downloadDir, task) => {
  while (task.currentLine < lines.length && task.isDownloading) {
    if (task.isPaused) {
      return; // 暂停下载
    }

    const line = lines[task.currentLine].trim();
    if (line) {
      const url = processUrl(line);
      const imageName = path.basename(url);
      const destination = path.join(downloadDir, imageName);

      try {
        await downloadImage(url, destination);
        task.completed++;
      } catch (error) {
        console.error(`Error downloading ${url}: ${error.message}`);
      }
    }
    task.currentLine++;
  }

  if (task.currentLine >= lines.length) {
    task.isDownloading = false;
    downloadTasks.delete(bookName);
  }
};

// 获取书籍列表
app.get('/books', async (req, res) => {
  const txtDir = path.join(publicDir, 'resources', 'txt');
  try {
    const files = fs.readdirSync(txtDir);
    const books = await Promise.all(files.map(async (file) => {
      const filePath = path.join(txtDir, file);
      const content = readFileContent(filePath);
      if (!content) {
        return { name: file, cover: '加载失败' };
      }

      const lines = content.split('\n');
      const randomUrl = processUrl(lines[Math.floor(Math.random() * lines.length)].trim());
      const base64Image = await urlToBase64(randomUrl);
      return { name: file, cover: base64Image };
    }));

    res.json(books);
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).send('Error reading directory');
  }
});

// 获取下载状态
app.get('/isdownloading', (req, res) => {
  const bookName = req.query.book;
  if (bookName) {
    const task = downloadTasks.get(bookName) || { isDownloading: false, completed: 0, total: 0, isPaused: false };
    res.json(task);
  } else {
    const status = Array.from(downloadTasks.entries()).map(([book, task]) => ({
      book,
      ...task,
    }));
    res.json(status);
  }
});

// 开始下载
app.get('/download', async (req, res) => {
  const bookName = req.query.book;
  if (!bookName) {
    return res.status(400).json({ success: false, message: 'Book name is required' });
  }

  const existingTask = downloadTasks.get(bookName);
  if (existingTask && existingTask.isDownloading && !existingTask.isPaused) {
    return res.status(400).json({ success: false, message: 'Download already in progress' });
  }

  const downloadDir = path.join(publicDir, 'emoji_download', path.basename(bookName, '.txt'));
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const filePath = path.join(publicDir, 'resources', 'txt', bookName);
  const content = readFileContent(filePath);
  if (!content) {
    return res.status(500).json({ success: false, message: 'Error reading file' });
  }

  const lines = content.split('\n');
  const task = existingTask || {
    isDownloading: true,
    isPaused: false,
    completed: 0,
    total: lines.length,
    currentLine: 0,
  };

  if (existingTask && existingTask.isPaused) {
    task.isPaused = false;
    task.isDownloading = true;
  } else {
    task.completed = 0;
    task.currentLine = 0;
  }

  downloadTasks.set(bookName, task);
  startDownload(bookName, lines, downloadDir, task);
  res.json({ success: true });
});

// 暂停下载
app.get('/pause-download', (req, res) => {
  const bookName = req.query.book;
  if (!bookName) {
    return res.status(400).json({ success: false, message: 'Book name is required' });
  }

  const task = downloadTasks.get(bookName);
  if (!task || !task.isDownloading) {
    return res.status(400).json({ success: false, message: 'No download in progress' });
  }

  task.isPaused = true;
  res.json({ success: true });
});

// 继续下载
app.get('/resume-download', (req, res) => {
  const bookName = req.query.book;
  if (!bookName) {
    return res.status(400).json({ success: false, message: 'Book name is required' });
  }

  const task = downloadTasks.get(bookName);
  if (!task || !task.isPaused) {
    return res.status(400).json({ success: false, message: 'No paused download found' });
  }

  task.isPaused = false;
  task.isDownloading = true;

  const filePath = path.join(publicDir, 'resources', 'txt', bookName);
  const content = readFileContent(filePath);
  if (!content) {
    return res.status(500).json({ success: false, message: 'Error reading file' });
  }

  const lines = content.split('\n');
  const downloadDir = path.join(publicDir, 'emoji_download', path.basename(bookName, '.txt'));
  startDownload(bookName, lines, downloadDir, task);
  res.json({ success: true });
});

// 停止下载
app.get('/stop-download', (req, res) => {
  const bookName = req.query.book;
  if (!bookName) {
    return res.status(400).json({ success: false, message: 'Book name is required' });
  }

  const task = downloadTasks.get(bookName);
  if (!task || !task.isDownloading) {
    return res.status(400).json({ success: false, message: 'No download in progress' });
  }

  task.isDownloading = false;
  task.isPaused = false;
  task.completed = 0;
  task.currentLine = 0;
  downloadTasks.delete(bookName);
  res.json({ success: true });
});

// 获取随机图片
app.get('/random-image', async (req, res) => {
  const bookName = req.query.book;
  const filePath = path.join(publicDir, 'resources', 'txt', bookName);
  const content = readFileContent(filePath);
  if (!content) {
    return res.status(500).json({ success: false, message: 'Error reading file' });
  }

  const lines = content.split('\n');
  const randomUrl = processUrl(lines[Math.floor(Math.random() * lines.length)].trim());
  const base64Image = await urlToBase64(randomUrl);
  res.json({ cover: base64Image });
});

// 启动服务器并自动打开浏览器
const server = app.listen(port, async () => {
  const actualPort = server.address().port; // 获取实际分配的端口
  console.log(`Server running at http://localhost:${actualPort}`);
  open(`http://localhost:${actualPort}`); // 自动打开浏览器
});
