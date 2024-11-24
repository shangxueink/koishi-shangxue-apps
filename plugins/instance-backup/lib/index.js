"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;

const { Schema } = require("koishi");
const fs = require('node:fs').promises;
const path = require('node:path');

exports.name = "instance-backup";
exports.inject = {
  optional: ['cron']
};

exports.usage = `

本插件用于自动备份 Koishi 实例中的指定文件和文件夹。
    
支持指令触发备份和使用 cron 表达式进行定时自动备份。

<h2>功能实现</h2>
<ul>
<li>备份指定的文件和文件夹。</li>
<li>支持定时任务自动备份。</li>
<li>控制备份数量，自动删除多余的备份。</li>
<li>日志记录功能，便于调试和监控。</li>
</ul>

---
<h2>配置项说明</h2>
<ul>
<li>
<strong>BackupList</strong>：<br>
需要备份的文件/文件夹列表。使用 <code>path.join(ctx.baseDir, '文件/文件夹名')</code> 格式。仅需在表格里填入【文件/文件夹名】即可
</li>
<li>
<strong>MaxBackupinstance</strong>：<br>
最大备份数量。超过此数量时，将自动删除最旧的备份。
</li>
<li>
<strong>areapath</strong>：<br>
备份存储目录。建议避免使用 C 盘，以防止文件权限问题。
</li>
<li>
<strong>ParentFolderName</strong>：<br>
用于存放备份的父级文件夹名称。会在 <code>areapath</code> 路径下创建。
</li>
<li>
<strong>Skip_nonexistent_films</strong>：<br>
是否自动跳过不存在的文件夹。若为 <code>false</code>，遇到不存在的文件夹时视为备份失败。
</li>
<li>
<strong>auto_cron</strong>：<br>
是否启用自动备份。启用后，<code>cronvalue</code> 配置项生效。
</li>
<li>
<strong>cronvalue</strong>：<br>
cron 表达式，指定自动备份的时间。默认为每天 0 点执行。
</li>
<li>
<strong>loggerinfo</strong>：<br>
日志调试模式。启用后，将记录详细的备份日志。
</li>
</ul>

---

<h2>定时触发说明</h2>

本插件支持 [cron](/market?keyword=cron) 服务调用触发

但是因为本插件也注册了指令 所以也可以使用 [schedule](/market?keyword=schedule) 来定时触发 

若要使用 schedule 触发 则可以关闭 auto_cron 配置项了

---

<h2>备份恢复说明</h2>

对于备份好的文件，该怎么回滚/回复成备份呢？

- 暂时仅支持手动操作文件恢复

- 具体恢复方法请参见： <a href="https://forum.koishi.xyz/t/topic/9836" target="_blank">https://forum.koishi.xyz/t/topic/9836</a>
`;

exports.Config = Schema.intersect([
  Schema.object({
    BackupList: Schema.array(String).role('table').default([
      "data",
      "package.json",
      "koishi.yml"
    ]).description("需要备份的文件/文件夹<br>使用path模块<br>path.join(ctx.baseDir, '这里是表格需要填入的内容')<br>最终的路径必须在ctx.baseDir下，否则跳过处理"),
  }).description('备份设置'),

  Schema.object({
    MaxBackupinstance: Schema.number().description("最大备份数量").default(10).experimental(),
    areapath: Schema.string().role('textarea', { rows: [2, 4] }).description("备份至这个目录<br>最好不要C盘，以防止文件权限问题").default("C:\\Program Files"),
    ParentFolderName: Schema.string().default("instance_backup").description("用于存放备份的父级文件夹的名称<br>会创建到 areapath 路径下<br>默认即可，需要注意符合文件夹的合法命名"),
  }).description('备份管理'),

  Schema.object({
    Skip_nonexistent_films: Schema.boolean().default(false).description("自动跳过不存在的文件夹，否则遇到不存在的文件夹视为 备份失败"),
  }).description('进阶设置'),

  Schema.object({
    auto_cron: Schema.boolean().default(false).description("启用后， cronvalue 配置项生效。<br>启用后会使用 cron 插件来定时触发<br>因为本插件也有指令调用 所以也可以使用 [schedule](/market?keyword=schedule) 来定时触发 <br>若要使用schedule触发 则可以关闭本配置项了"),
    cronvalue: Schema.string().default("0 0 * * *").description('cron 定时，语法请参考 https://cron.koishi.chat/ <br>默认为 【在每天 0 点执行】'),
  }).description('进阶-定时设置'),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description('调试设置'),
]);

async function apply(ctx, config) {
  const loggerinfo = (message) => {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  };

  // 备份功能封装
  const performBackup = async () => {
    try {
      // 获取当前时间戳作为新文件夹名称
      const timestamp = Date.now().toString();
      const instanceBackupDir = path.join(config.areapath, config.ParentFolderName, timestamp);

      // 创建备份文件夹
      await fs.mkdir(instanceBackupDir, { recursive: true });

      // 复制文件到备份目录
      for (const item of config.BackupList) {
        const sourcePath = path.join(ctx.baseDir, item);
        const destPath = path.join(instanceBackupDir, item);
        if (!sourcePath.startsWith(ctx.baseDir)) {
          ctx.logger.warn(`非法路径: ${item}. 跳过处理...`);
          continue;
        }
        // 记录备份信息
        loggerinfo(`备份文件: ${sourcePath} 到 ${destPath}`);

        // 复制文件或文件夹
        try {
          await copyRecursive(sourcePath, destPath);
        } catch (error) {
          if (config.Skip_nonexistent_films) {
            loggerinfo(`跳过不存在的文件/文件夹: ${sourcePath}`);
            continue;
          }
          throw error;
        }
      }

      // 打印分隔线
      loggerinfo('-'.repeat(instanceBackupDir.length));

      // 控制备份数量
      await manageBackupInstances(config.areapath, config.MaxBackupinstance);

      ctx.logger.info("备份完成！");
    } catch (error) {
      ctx.logger.error(error);
      ctx.logger.info("备份失败！");
    }
  };

  // 创建备份目录
  const backupDir = path.join(ctx.baseDir, 'backup');
  await fs.mkdir(backupDir, { recursive: true });

  // 备份指令
  ctx.command("备份", { authority: 4 })
    .alias('备份koishi')
    .action(async ({ session }) => {
      await performBackup();
      session.send("备份完成！");
    });

  // 自动备份任务
  if (config.auto_cron) {
    ctx.cron(config.cronvalue, performBackup);
  }

  // 递归复制文件和文件夹
  async function copyRecursive(src, dest) {
    const stats = await fs.lstat(src);
    if (stats.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src);
      for (const entry of entries) {
        await copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      // 确保目标文件夹存在
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    }
  }


  // 管理备份实例数量
  async function manageBackupInstances(basePath, maxInstances) {
    const instanceBackupPath = path.join(basePath, config.ParentFolderName);
    const entries = await fs.readdir(instanceBackupPath, { withFileTypes: true });

    // 过滤出目录并按时间戳排序
    const directories = entries
      .filter(entry => entry.isDirectory())
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // 删除多余的备份
    while (directories.length > maxInstances) {
      const oldest = directories.shift();
      await fs.rm(path.join(instanceBackupPath, oldest.name), { recursive: true, force: true });
    }
  }

}

exports.apply = apply;
