// public/js/MemeDownloader/MemeDownloader.js

async function loadTextFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        return null;
    }
}

function loadCoverFromContent(content) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        return 'https://i0.hdslb.com/bfs/article/80d629bf90808e63331132e644bfb441927f896d.png'; // 默认封面
    }
    const randomIndex = Math.floor(Math.random() * lines.length);
    return processUrl(lines[randomIndex]);
}

function processUrl(url) {
    return url.startsWith('http') ? url : 'https://i0.hdslb.com/bfs/' + url;
}

async function createMockBooks() {
    const txtFiles = [
        './js/MemeDownloader/txt/0721.txt',
        './js/MemeDownloader/txt/2233娘小剧场.txt',
        './js/MemeDownloader/txt/阿夸.txt',
        './js/MemeDownloader/txt/阿尼亚.txt',
        './js/MemeDownloader/txt/白圣女.txt',
        './js/MemeDownloader/txt/白圣女黑白.txt',
        './js/MemeDownloader/txt/败犬女主.txt',
        './js/MemeDownloader/txt/柴郡.txt',
        './js/MemeDownloader/txt/初音未来Q.txt',
        './js/MemeDownloader/txt/甘城猫猫.txt',
        './js/MemeDownloader/txt/狗妈.txt',
        './js/MemeDownloader/txt/孤独摇滚.txt',
        './js/MemeDownloader/txt/滑稽.txt',
        './js/MemeDownloader/txt/疾旋鼬.txt',
        './js/MemeDownloader/txt/卡拉彼丘.txt',
        './js/MemeDownloader/txt/流萤.txt',
        './js/MemeDownloader/txt/龙图.txt',
        './js/MemeDownloader/txt/鹿乃子.txt',
        './js/MemeDownloader/txt/玛丽猫.txt',
        './js/MemeDownloader/txt/蜜汁工坊.txt',
        './js/MemeDownloader/txt/男娘武器库.txt',
        './js/MemeDownloader/txt/赛马娘.txt',
        './js/MemeDownloader/txt/瑟莉亚.txt',
        './js/MemeDownloader/txt/藤田琴音.txt',
        './js/MemeDownloader/txt/小黑子.txt',
        './js/MemeDownloader/txt/心海.txt',
        './js/MemeDownloader/txt/绪山真寻.txt',
        './js/MemeDownloader/txt/亚托莉表情包.txt',
        './js/MemeDownloader/txt/永雏小菲.txt',
        './js/MemeDownloader/txt/宇佐紀.txt',
        './js/MemeDownloader/txt/acomu414.txt',
        './js/MemeDownloader/txt/ba.txt',
        './js/MemeDownloader/txt/capoo.txt',
        './js/MemeDownloader/txt/chiikawa.txt',
        './js/MemeDownloader/txt/doro.txt',
        './js/MemeDownloader/txt/Downvote.txt',
        './js/MemeDownloader/txt/eveonecat.txt',
        './js/MemeDownloader/txt/fufu.txt',
        './js/MemeDownloader/txt/GirlsBandCry.txt',
        './js/MemeDownloader/txt/kemomimi酱表情包.txt',
        './js/MemeDownloader/txt/koimeme.txt',
        './js/MemeDownloader/txt/mygo.txt',
        './js/MemeDownloader/txt/seseren.txt',
    ];

    try {
        // 并行发起所有请求
        const contents = await Promise.all(txtFiles.map(filePath => loadTextFile(filePath)));

        const mockBooks = contents.map((content, index) => {
            if (content) {
                const filePath = txtFiles[index];
                const fileName = filePath.split('/').pop();
                return {
                    name: fileName,
                    content: content.trim(),
                    cover: loadCoverFromContent(content),
                };
            }
            return null; // 如果加载失败，返回 null
        }).filter(book => book !== null); // 过滤掉加载失败的书籍

        return mockBooks;
    } catch (error) {
        console.error("Failed to load one or more text files:", error);
        return []; // 如果有任何请求失败，返回空数组
    }
}
