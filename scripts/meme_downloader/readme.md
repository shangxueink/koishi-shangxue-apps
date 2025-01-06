

# Meme Downloader

一个基于 Node.js 和 Express 的简单工具，

用于从指定文本文件中读取图片 URL 并批量下载图片。

支持开发和生产环境，

可通过 `pkg` 打包为可执行文件。

---

## 功能特性

- **批量下载图片**：从文本文件中读取图片 URL 并下载到本地。
- **动态加载资源**：支持从外部文件系统或打包资源中加载静态文件。
- **开发与生产模式**：
  - 开发模式：从项目根目录加载资源。
  - 生产模式：从可执行文件所在目录加载资源。
- **自动打开浏览器**：启动服务器后自动打开默认浏览器访问页面。
- **下载状态管理**：支持开始、暂停、继续和停止下载任务。

---

## 快速开始

### 1. 安装依赖

确保已安装 [Node.js](https://nodejs.org/)（建议使用 LTS 版本），然后运行以下命令安装依赖：

```bash
npm install i -g yarn
```
```bash
yarn install
```
### 2. 运行项目

#### 开发模式

在开发模式下运行项目：

```bash
yarn start
```

服务器启动后，默认会自动打开浏览器访问 `http://localhost:<随机端口>`。

#### 生产模式

将项目打包为可执行文件：

```bash
yarn build
```

打包完成后，可执行文件会生成在 `/` 目录下。运行生成的 EXE 文件即可启动服务。

---

## 项目结构

```
meme_downloader/
├── public/                  # 静态资源目录
│   └──  index.html          # 前端页面
├── emoji_download           # 下载的图片存放目录
├── resources/               # 资源文件目录
│   └── txt/                 # 存放图片 URL 的文本文件
├── index.js                 # 主程序入口
├── package.json             # 项目配置和依赖
├── ...                      # 其他
└── README.md                # 项目说明文档
```

---

## 配置说明

### 1. 文本文件格式

在 `resources/txt` 目录下放置文本文件，每行一个图片 URL。例如：
```
https://i0.hdslb.com/bfs/article/396671e9cc9601a7ab8314e69fe0673f4c408768.jpg
https://i0.hdslb.com/bfs/article/71ab80cf74c93f4d35bb9d7473d6baf3e7c7be42.jpg
```
或者简写重复部分：`https://i0.hdslb.com/bfs/`
```
article/396671e9cc9601a7ab8314e69fe0673f4c408768.jpg
article/71ab80cf74c93f4d35bb9d7473d6baf3e7c7be42.jpg
```



### 2. 打包配置

在 `package.json` 中配置 `pkg`，确保静态资源被打包到可执行文件中：

```json
{
  "name": "meme_downloader",
  "version": "1.0.0",
  "bin": "index.js",
  "scripts": {
    "start": "set NODE_ENV=development&&node index.js",
    "build": "pkg . --targets node18-win-x64 --output meme_downloader.exe --public --icon=resources/icon/256x256.ico"
  },
  "dependencies": {
    "axios": "1.6.2",
    "express": "^4.18.2",
    "open": "8.4.2"
  },
  "devDependencies": {
    "pkg": "^5.8.1"
  },
  "pkg": {
    "scripts": [
      "index.js"
    ],
    "assets": [
      "node_modules/axios/**/*"
    ]
  }
}

```

---

## API 接口

### 1. 获取书籍列表

- **URL**: `/books`
- **Method**: `GET`
- **Response**:
  ```json
  [
    {
      "name": "book1.txt",
      "cover": "data:image/jpeg;base64,..."
    }
  ]
  ```

### 2. 开始下载

- **URL**: `/download?book=<书名>`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### 3. 暂停下载

- **URL**: `/pause-download?book=<书名>`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### 4. 继续下载

- **URL**: `/resume-download?book=<书名>`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### 5. 停止下载

- **URL**: `/stop-download?book=<书名>`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### 6. 获取下载状态

- **URL**: `/isdownloading?book=<书名>`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "isDownloading": true,
    "completed": 10,
    "total": 100,
    "isPaused": false
  }
  ```

---

---

## 许可证

本项目基于 MIT License 开源。

---

## 反馈与贡献

如果你有任何问题或建议，欢迎提交 Issue 或 Pull Request！
