// 灵感来自 https://github.com/PRO-2684/qqnt-version-history/releases
import { URL, fileURLToPath } from 'node:url';
import { writeFile, readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    outputPathListDir: path.join(__dirname, 'QQNT'), // Directory for all version lists
    platforms: {
        windows: {
            name: 'Windows',
            url: 'https://im.qq.com/pcqq/index.shtml',
            rainbowConfigRegex: /var rainbowConfigUrl = "(https:\/\/qq-web\.cdn-go\.cn\/im\.qq\.com_new\/[a-f0-9]+\/[a-f0-9]+\/windowsDownloadUrl\.js\?t=\d+)";/,
            jsonConfigRegex: /;\(function\(\)\{var params= ({.+?});/,
            versionRegex: /QQ_([\d.]+_\d+)/,
            downloadUrlKeys: {
                x64: 'ntDownloadX64Url',
                x86: 'ntDownloadUrl',
                arm: 'ntDownloadARMUrl',
            },
        },
        linux: {
            name: 'Linux',
            url: 'https://im.qq.com/linuxqq/index.shtml',
            rainbowConfigRegex: /var rainbowConfigUrl = "(https:\/\/qq-web\.cdn-go\.cn\/im\.qq\.com_new\/[a-f0-9]+\/[a-f0-9]+\/linuxQQDownload\.js\?t=\d+)";/,
            jsonConfigRegex: /;\(function\(\)\{var params= ({.+?});/,
            versionKey: 'version',
            downloadUrlKeys: {
                x64: 'x64DownloadUrl',
                arm: 'armDownloadUrl',
                loongarch: 'loongarchDownloadUrl',
                mips: 'mipsDownloadUrl',
            },
        },
        mac: {
            name: 'macOS',
            url: 'https://im.qq.com/macqq/index.shtml',
            rainbowConfigRegex: /var rainbowConfigUrl = "(https:\/\/qq-web\.cdn-go\.cn\/im\.qq\.com_new\/[a-f0-9]+\/[a-f0-9]+\/ntQQDownload\.js\?t=\d+)";/,
            jsonConfigRegex: /;\(function\(\)\{var params= ({.+?});/,
            versionKey: 'version',
            downloadUrlKey: 'downloadUrl',
        },
    },
};

async function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        protocol.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data);
            });

        }).on('error', (err) => {
            reject(err);
        });
    });
}

// 提取版本信息
async function extractVersion(platformKey, html) {
    const $ = cheerio.load(html);
    const platformConfig = config.platforms[platformKey];

    // 查找包含 rainbowConfigUrl 的 script 标签
    const script = $('script:contains("rainbowConfigUrl")').text();
    const rainbowMatch = script.match(platformConfig.rainbowConfigRegex);

    if (!rainbowMatch) {
        console.error(`${platformConfig.name}: 无法找到 rainbowConfigUrl`);
        return null;
    }

    const configUrl = rainbowMatch[1];
    console.log(`${platformConfig.name}: 配置文件 URL: ${configUrl}`);

    const configResponse = await fetch(configUrl);
    const configText = await configResponse.text();

    const configMatch = configText.match(platformConfig.jsonConfigRegex);

    if (!configMatch) {
        console.error(`${platformConfig.name}: 无法从配置文件 URL 中提取 JSON 内容`);
        return null;
    }

    const jsonConfig = JSON.parse(configMatch[1]);

    const versionInfo = {
        versionCode: platformConfig.versionKey ? jsonConfig[platformConfig.versionKey] :
            (platformConfig.versionRegex ? (html => {
                const m = html.match(platformConfig.versionRegex);
                return m ? m[1] : null;
            })(jsonConfig[platformConfig.downloadUrlKeys.x86]) : null), // Windows 特殊处理
    };

    if (platformConfig.downloadUrlKeys) {
        for (const arch in platformConfig.downloadUrlKeys) {
            const key = platformConfig.downloadUrlKeys[arch];
            versionInfo[arch] = jsonConfig[key] || '';
        }
    }

    if (platformConfig.downloadUrlKey) {
        versionInfo.downloadUrl = jsonConfig[platformConfig.downloadUrlKey];
    }

    return { [platformKey]: versionInfo }; // 返回平台键包裹的版本信息
}

function generateMarkdownList(platformKey, versionList) {
    const platformName = config.platforms[platformKey].name;
    let markdown = `# ${platformName} QQNT 版本历史\n\n`;
    markdown += `| 平台/架构 | 版本 | .exe | .deb | .rpm | .AppImage | .dmg |\n`;
    markdown += `|---|---|---|---|---|---|---|\n`;

    for (const versionEntry of versionList) {
        const version = versionEntry[platformKey]; // 获取对应平台的版本信息
        if (!version) continue; // 如果该版本条目中没有当前平台的信息，则跳过

        if (platformKey === 'windows') {
            const windowsVersion = version.versionCode;
            markdown += `| Windows x64 | ${windowsVersion} | [下载](${version.x64}) |   |   |   |   |\n`;
            markdown += `| Windows x86 | ${windowsVersion} | [下载](${version.x86}) |   |   |   |   |\n`;
            markdown += `| Windows arm | ${windowsVersion} | [下载](${version.arm}) |   |   |   |   |\n`;
        } else if (platformKey === 'linux') {
            const linuxVersion = version.versionCode;
            markdown += `| Linux x64 | ${linuxVersion} |   | ${version.x64?.deb ? `[下载](${version.x64.deb})` : ''} | ${version.x64?.rpm ? `[下载](${version.x64.rpm})` : ''} | ${version.x64?.appimage ? `[下载](${version.x64.appimage})` : ''} |   |\n`;
            markdown += `| Linux arm | ${linuxVersion} |   | ${version.arm?.deb ? `[下载](${version.arm.deb})` : ''} | ${version.arm?.rpm ? `[下载](${version.arm.rpm})` : ''} | ${version.arm?.appimage ? `[下载](${version.arm.appimage})` : ''} |   |\n`;
            markdown += `| Linux loongarch | ${linuxVersion} |   | ${version.loongarch?.deb ? `[下载](${version.loongarch.deb})` : ''} |   |   |   |\n`;
            markdown += `| Linux mips | ${linuxVersion} |   | ${version.mips?.deb ? `[下载](${version.mips.deb})` : ''} |   |   |   |\n`;
        } else if (platformKey === 'mac') {
            const macVersion = version.versionCode;
            markdown += `| macOS Universal | ${macVersion} |   |   |   |   | [下载](${version.downloadUrl}) |\n`;
        }
        markdown += `|   |   |   |   |   |   |   |\n`; // 添加空行
    }
    return markdown;
}

async function readExistingVersionList(filePath) {
    try {
        await access(filePath, constants.F_OK); // 检查文件是否存在
        const data = await readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`文件 ${filePath} 不存在，将创建一个新的版本列表。`);
        return [];
    }
}

// 主函数
async function main() {
    const allVersions = {}; // 用于存储所有平台的最新版本信息

    for (const platformKey in config.platforms) {
        const platformConfig = config.platforms[platformKey];
        console.log(`正在获取 ${platformConfig.name} 的 HTML 内容，URL: ${platformConfig.url}`);
        try {
            const html = await fetchHtml(platformConfig.url);
            const versionInfo = await extractVersion(platformKey, html); // 提取版本信息，现在返回平台键包裹的对象

            if (versionInfo && versionInfo[platformKey]) { // 确保有版本信息且针对当前平台
                allVersions[platformKey] = versionInfo[platformKey]; // 存储最新版本信息

                // 读取现有的版本列表
                const versionListFilePath = path.join(config.outputPathListDir, `${platformKey}-versionlist.json`);
                const existingVersionList = await readExistingVersionList(versionListFilePath);

                // 检查新版本是否已存在于列表中
                const isVersionAlreadyInList = existingVersionList.some(existingVersion => {
                    return JSON.stringify(existingVersion) === JSON.stringify(versionInfo);
                });

                if (!isVersionAlreadyInList) {
                    existingVersionList.push(versionInfo); // 将新版本添加到列表的末尾，保持历史顺序
                    console.log(`${platformConfig.name}: 检测到新版本，已添加到版本列表中。`);
                } else {
                    console.log(`${platformConfig.name}: 版本未更新，跳过版本列表更新。`);
                }

                // 生成 JSON 文件 (历史版本列表)
                const jsonListOutputPath = versionListFilePath;
                await writeFile(jsonListOutputPath, JSON.stringify(existingVersionList, null, 2));
                console.log(`${platformKey}-versionlist.json 文件写入成功到 ${jsonListOutputPath}.`);

                // 生成 Markdown 文件 (历史版本列表)
                const markdownListContent = generateMarkdownList(platformKey, existingVersionList);
                const markdownListOutputPath = path.join(config.outputPathListDir, `${platformKey}-versionlist.md`);
                await writeFile(markdownListOutputPath, markdownListContent);
                console.log(`${platformKey}-versionlist.md 文件写入成功到 ${markdownListOutputPath}.`);

            } else {
                console.warn(`未能提取到 ${platformConfig.name} 的版本信息`);
            }
        } catch (error) {
            console.error(`获取或处理 ${platformConfig.name} 版本时出错:`, error);
        }
    }
}

// 运行主函数
main();
