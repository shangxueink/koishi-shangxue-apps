"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
const express = require('express');
const fs = require('node:fs');
const axios = require('axios');
const path = require('node:path');
const cors = require('cors')

const app = express();
exports.name = 'smmcat-photodisk-imgdiskapi';
const logger = new koishi.Logger('smmcat-photodisk-imgdiskapi');
exports.usage = `

插件说明：

这是为 smmcat-photodisk 搭建的后端插件，默认运行在 http://127.0.0.1:24680

配置说明：
- 在 smmcat-photodisk 插件内的 publicIpAddress 需要填写 http://127.0.0.1:24680
- 注意：确保地址中没有多余的空格，且末尾不带斜杠

---

几点说明：
- 用户上传的图片存储在 ./data/smmcat-photodisk-imgdiskapi/upload/default 文件夹下（可以在侧面的【资源管理器】里找到）
- 本插件旨在帮助用户本地搭建 smmcat-photodisk 服务，方便使用个人网盘功能
- 如果需要将服务部署在公网，请自行配置端口转发

`;


exports.Config = koishi.Schema.object({
    serverport: koishi.Schema.number().description('运行端口').default('24680'),
});



async function apply(ctx, Config) {
    const rootpath = path.join(ctx.baseDir, 'data', 'smmcat-photodisk-imgdiskapi');
    try {
        fs.mkdirSync(rootpath, { recursive: true });
    } catch (error) {
        logger.error(`Error creating directory: ${error}`);
    }
    const PORT = Config.serverport;

    let publicIp = `http://127.0.0.1:${PORT}/`;
    let publicIp2 = `http://127.0.0.1:${PORT}`;
    app.use(cors());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    // 设置静态文件目录
    const uploadPath = path.join(rootpath, 'upload')
    app.use('/file', express.static(uploadPath));
    try {
        fs.mkdirSync(uploadPath, { recursive: true });
    } catch (error) {
        logger.error(`Error creating directory: ${error}`);
    }

    app.get('/getList', async (req, res) => {

        if (!publicIp) await init();
        const basePath = path.join(rootpath, '/upload');
        try {
            fs.mkdirSync(basePath, { recursive: true });
        } catch (error) {
            logger.error(`Error creating directory: ${error}`);
        }
        let requestedPath = req.query.path || '/default';
        if (!isSafePath(requestedPath)) return res.status(400).send({ code: 400, msg: '图片路径不合法' });
        const fullPath = path.join(basePath, requestedPath);

        fs.readdir(fullPath, (err, files) => {
            if (err) {
                return res.status(500).send({ err: err.message, code: 500 });
            }

            const imgPath = files
                .filter(file => {
                    const extname = path.extname(file).toLowerCase();
                    return extname === '.jpg' || extname === '.jpeg' || extname === '.png' || extname === '.gif';
                })
                .map(file => publicIp + `file${requestedPath.charAt(0) !== '/' ? '/' + requestedPath : requestedPath}/${file}`);

            res.json({ code: 200, msg: '成功!', data: { path: `${requestedPath}`, imgPath } });
        });
    });

    app.get('/upload', async (req, res) => {
        const upath = req.query.path || '/default';
        const imgUrl = req.query.imgurl;

        if (!imgUrl) return res.status(400).send({ code: 400, msg: '请携带图片网络地址' });
        if (!isSafePath(upath)) return res.status(400).send({ code: 400, msg: '图片路径不合法' });

        try {
            const response = await axios({
                url: imgUrl,
                method: 'GET',
                responseType: 'stream'
            });

            const imgDir = path.join(rootpath, 'upload', upath);
            try {
                fs.mkdirSync(imgDir, { recursive: true });
            } catch (error) {
                logger.error(`Error creating directory: ${error}`);
            }
            if (!fs.existsSync(imgDir)) {
                fs.mkdirSync(imgDir, { recursive: true });
            }
            const imgName = `${+new Date()}.jpg`
            const imgPath = path.join(imgDir, imgName);
            const writer = fs.createWriteStream(imgPath);
            response.data.pipe(writer);
            writer.on('finish', () => {
                res.status(200).send({ code: 200, msg: '上传成功', path: upath, content: [imgName] });
            });
        } catch (error) {
            logger.info(error);
            res.status(500).send({ code: 500, msg: '上传失败' });
        }
    });

    app.post('/del', async (req, res) => {
        const delquery = req.body.delPath
        if (!delquery) return res.status(400).send({ code: 400, msg: '请携带图片路径' });
        if (!isSafePath(delquery)) return res.status(400).send({ code: 400, msg: '图片路径不合法' });

        // 拼接路径
        const upath = path.join(rootpath, '/upload', delquery)
        try {
            fs.mkdirSync(upath, { recursive: true });
        } catch (error) {
            logger.error(`Error creating directory: ${error}`);
        }
        try {
            // 删除指定内容
            fs.unlinkSync(upath)
            res.status(200).send({ code: 200, msg: '删除成功', delInfo: upath })
        } catch (error) {
            res.status(500).send({ code: 500, msg: '删除失败', err: error.message })
        }
    })

    app.post('/uploadList', async (req, res) => {
        const upath = req.body.path || '/default';
        const imgUrl = req.body.imgurlList;

        if (!imgUrl?.length) return res.status(400).send({ code: 400, msg: '请携带图片网络地址' });
        if (!checkLinksFormat(imgUrl)) return res.status(400).send({ code: 400, msg: '请正确输入图片地址' });

        const statistics = { amount: 0, success: 0, error: 0, content: [] }

        await Promise.all(imgUrl.map(async (item) => {
            statistics.amount++;
            const res = await downloadImgFn(item, upath);
            if (res[0]) {
                statistics.content.push(res[1])
                statistics.success++
            } else {
                statistics.error++
            }
        }));

        res.status(200).send({ code: 200, msg: `上传结果：一共尝试 ${statistics.amount} 次，成功 ${statistics.success} 个，失败 ${statistics.error}`, path: upath, content: statistics.content });
    });

    function checkLinksFormat(arr) {
        for (const item of arr) {
            if (typeof item !== 'string' || !isURL(item)) {
                return false;
            }
        }
        return true;
    }

    function isSafePath(path) {
        // 使用正则表达式来检查路径是否安全
        const unsafePathRegex = /(\.\.|\/\$|\\|\||`|&|\?|%|#|\*|\{|\[|\]|\}|;|:|<|>|"|'|\s)/; // 匹配包含多种不安全路径标识的路径

        return !unsafePathRegex.test(path);
    }

    function isURL(str) {
        const pattern = new RegExp('^(https?:\\/\\/)?' +
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
            '((\\d{1,3}\\.){3}\\d{1,3}))' +
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
            '(\\?[;&a-z\\d%_.~+=-]*)?' +
            '(\\#[-a-z\\d_]*)?$', 'i');

        return !!pattern.test(str);
    }

    async function downloadImgFn(imgUrl, upath = '/default') {
        return new Promise(async (resolve, reject) => {
            try {

                const response = await axios({
                    url: imgUrl,
                    method: 'GET',
                    responseType: 'stream'
                });

                if (!response) return resolve([false]);

                const imgDir = path.join(rootpath, 'upload', upath);
                try {
                    fs.mkdirSync(imgDir, { recursive: true });
                } catch (error) {
                    logger.error(`Error creating directory: ${error}`);
                }

                if (!fs.existsSync(imgDir)) {
                    fs.mkdirSync(imgDir, { recursive: true });
                }
                const imgName = `${+new Date()}.jpg`
                const imgPath = path.join(imgDir, imgName);
                const writer = fs.createWriteStream(imgPath);
                response.data.pipe(writer);
                writer.on('finish', () => {
                    resolve([true, imgName]);
                });
            } catch (error) {
                logger.info(error);
                resolve([false]);
            }
        });
    }


    function countImageFiles(dir) {
        let imageCount = 0;

        const files = fs.readdirSync(dir);

        files.forEach(file => {
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())) {
                imageCount++;
            }
        });

        return imageCount;
    }

    function countImagesInDirectory(dir, parentPath = '') {
        const result = [];

        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                const imgTotal = countImageFiles(filePath);
                const relativePath = parentPath ? `${parentPath}/${file}` : file;

                result.push({ path: relativePath, imgTotal: imgTotal });
                result.push(...countImagesInDirectory(filePath, relativePath));
            }
        });
        return result;
    }


    app.get('/countImages', (req, res) => {
        const upath = req.query.path || './';
        const targetDir = path.join(rootpath, './upload', upath);
        try {
            fs.mkdirSync(targetDir, { recursive: true });
        } catch (error) {
            logger.error(`Error creating directory: ${error}`);
        }
        try {
            const result = countImagesInDirectory(targetDir);
            res.status(200).send({ code: 200, msg: '获取成功', result });
        } catch (error) {
            res.status(500).send({ code: 500, error: error.message });
        }
    });

    app.use((err, req, res, next) => {
        logger.error(err.stack);
        res.status(500).send({ code: 400, err: '服务器未知错误' });
    });

    // 启动服务器
    app.listen(PORT, async () => {
        if (!publicIp) await init();
        logger.info(`图片网盘服务器已经部署在 ${publicIp2} 上，当前版本 1.2.1`);
        logger.info(`请在 smmcat-photodisk 插件内的 publiclpAddress 填入 ${publicIp2} `);
        logger.info(`注意不要多空格 不要末尾斜杠`);
    });

}


exports.apply = apply;