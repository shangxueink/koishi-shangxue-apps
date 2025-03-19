import { URL, fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    outputPathJSONFile: path.join(__dirname, 'QQNT', 'versions.json'),
    outputPathMarkdownFile: path.join(__dirname, 'QQNT', 'versions.md'),
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

    return versionInfo;
}

function generateMarkdown(versions) {
    let markdown = `
| Platform/Arch | Version | .exe | .deb | .rpm | .AppImage | .dmg |
|---|---|---|---|---|---|---|
`;

    // Windows
    if (versions.windows) {
        const windows = versions.windows;
        const version = windows.versionCode; // 获取版本号
        markdown += `| Windows x64 | ${version} | [Download](${windows.x64}) |   |   |   |   |\n`;
        markdown += `| Windows x86 | ${version} | [Download](${windows.x86}) |   |   |   |   |\n`;
        markdown += `| Windows arm | ${version} | [Download](${windows.arm}) |   |   |   |   |\n`;
    }

    // Linux
    if (versions.linux) {
        const linux = versions.linux;
        const version = linux.versionCode; // 获取版本号
        markdown += `| Linux x64 | ${version} |   | ${linux.x64?.deb ? `[Download](${linux.x64.deb})` : ''} | ${linux.x64?.rpm ? `[Download](${linux.x64.rpm})` : ''} | ${linux.x64?.appimage ? `[Download](${linux.x64.appimage})` : ''} |   |\n`;
        markdown += `| Linux arm | ${version} |   | ${linux.arm?.deb ? `[Download](${linux.arm.deb})` : ''} | ${linux.arm?.rpm ? `[Download](${linux.arm.rpm})` : ''} | ${linux.arm?.appimage ? `[Download](${linux.arm.appimage})` : ''} |   |\n`;
        markdown += `| Linux loongarch | ${version} |   | ${linux.loongarch?.deb ? `[Download](${linux.loongarch.deb})` : ''} |   |   |   |\n`;
        markdown += `| Linux mips | ${version} |   | ${linux.mips?.deb ? `[Download](${linux.mips.deb})` : ''} |   |   |   |\n`;
    }

    // macOS
    if (versions.mac) {
        const mac = versions.mac;
        const version = mac.versionCode; // 获取版本号
        markdown += `| macOS Universal | ${version} |   |   |   |   | [Download](${mac.downloadUrl}) |\n`;
    }

    return markdown;
}

// 主函数
async function main() {
    const versions = {};

    for (const platformKey in config.platforms) {
        const platformConfig = config.platforms[platformKey];
        console.log(`正在获取 ${platformConfig.name} 的 HTML 内容，URL: ${platformConfig.url}`);
        try {
            const html = await fetchHtml(platformConfig.url);
            const versionInfo = await extractVersion(platformKey, html);

            if (versionInfo) {
                versions[platformKey] = versionInfo;
                console.log(`成功提取到 ${platformConfig.name} 的版本信息:`, versionInfo);
            } else {
                console.warn(`未能提取到 ${platformConfig.name} 的版本信息`);
            }
        } catch (error) {
            console.error(`获取或处理 ${platformConfig.name} 版本时出错:`, error);
        }
    }

    // 生成 JSON 文件
    const jsonOutputPath = config.outputPathJSONFile;
    await writeFile(jsonOutputPath, JSON.stringify(versions, null, 2));
    console.log(`versions.json 文件写入成功到 ${jsonOutputPath}.`);

    // 生成 Markdown 文件
    const markdownOutputPath = config.outputPathMarkdownFile;
    const markdownContent = generateMarkdown(versions);
    await writeFile(markdownOutputPath, markdownContent);
    console.log(`versions.md 文件写入成功到 ${markdownOutputPath}.`);

    // 获取 Windows 版本号，用于 Release 标题和 Tag
    const windowsVersion = versions.windows ? versions.windows.versionCode : 'latest';
    process.env.WINDOWS_VERSION = windowsVersion; // 设置环境变量 (虽然这个环境变量在后续步骤中不可直接用)

    // 输出 WINDOWS_VERSION 作为 GitHub Actions 的 output
    console.log(`WINDOWS_VERSION=${windowsVersion}`); // 为了调试，先输出到控制台
    console.log(`::set-output name=windows_version::${windowsVersion}`); // 设置 output，注意 output 名称要小写，用下划线分隔

}

// 运行主函数
main();
