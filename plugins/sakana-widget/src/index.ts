import { Context, Schema } from 'koishi'
import { } from '@koishijs/plugin-console'

import { resolve } from 'node:path'
import fs from 'node:fs'
import path from 'node:path'

declare module '@koishijs/plugin-console' {
  interface Events {
    'sakana-widget/config': () => any
  }
}

export const name = 'sakana-widget'
export const inject = ['console', 'server']
export const reusable = false;
export const usage = `
---

插件如果出现问题，请重新关开插件，并刷新页面。

---

灵感来自 
- https://github.com/dsrkafuu/sakana-widget/tree/main
- https://github.com/koishijs/koishi-plugin-live2d

---
`;

export interface CustomCharacter {
  name: string
  image: string
  initialState?: Partial<InitialState>
}

export interface InitialState {
  i: number // 惯性
  s: number // 粘性
  d: number // 衰减
  r: number // 角度
  y: number // 高度
  t: number // 垂直速度
  w: number // 水平速度
}

export interface Config {
  size?: number
  autoFit?: boolean
  character?: string
  controls?: boolean
  rod?: boolean
  draggable?: boolean
  stroke?: {
    color?: string
    width?: number
  }
  threshold?: number
  rotate?: number
  title?: boolean
  customCharacters?: CustomCharacter[]
  offsetX?: number
  offsetY?: number
  defaultInitialState?: InitialState
}

export const Config: Schema<Config> = Schema.object({
  size: Schema.number().default(200).description('组件大小'),
  autoFit: Schema.boolean().default(false).description('自动适应容器大小（最小 120px）'),
  character: Schema.string().default('takina').description('默认的角色（名称），角色列表见最下面的配置项'),
  controls: Schema.boolean().default(true).description('控制栏'),
  rod: Schema.boolean().default(true).description('展示支撑杆'),
  draggable: Schema.boolean().default(true).description('可拖动'),
  stroke: Schema.object({
    color: Schema.string().role('color').description('支撑杆的线条颜色'),
    width: Schema.number().default(10).description('支撑杆的线条宽度')
  }).description('支撑杆设置'),
  threshold: Schema.number().default(0.1).description('停止动画的阈值'),
  rotate: Schema.number().default(0).description('支撑杆的旋转角度'),
  title: Schema.boolean().default(false).description('开启 title 属性'),
  offsetX: Schema.number().default(0).description('横轴偏移量（像素），正值向左移动'),
  offsetY: Schema.number().default(20).description('竖轴偏移量（像素），正值向上移动'),
  defaultInitialState: Schema.object({
    i: Schema.number().description('惯性（数值越大，支撑杆越硬）').default(0.1),
    s: Schema.number().description('粘性（数值越大，越容易拖动）').default(0.95),
    d: Schema.number().description('衰减（数值越大，越难停下来）').max(1).min(0).default(0.98),
    r: Schema.number().description('初始角度').default(0).hidden(),
    y: Schema.number().description('初始高度').default(0).hidden(),
    t: Schema.number().description('垂直速度').default(0).hidden(),
    w: Schema.number().description('水平速度').default(0).hidden(),
  }).description('默认初始状态配置'),
  customCharacters: Schema.array(Schema.object({
    name: Schema.string().required().description('角色名称'),
    image: Schema.string().required().description('图片链接'),
  })).role("table").default([
    {
      "name": "chisato",
      "image": "https://i0.hdslb.com/bfs/openplatform/cb859e85d3b291e247671ab0cd6dfb25f30a6328.png"
    },
    {
      "name": "takina",
      "image": "https://i0.hdslb.com/bfs/openplatform/bccd37fdb1c09f1963727c608cd8d3f232723e8a.png"
    },
    {
      "name": "玛丽猫",
      "image": "https://i0.hdslb.com/bfs/openplatform/ae5fa10b42e43afa71700915d7e6cf7e548cecb2.png"
    },
    {
      "name": "安和昂",
      "image": "https://i0.hdslb.com/bfs/openplatform/cda8628b008de571db654eecdb83e52806ce46ee.png"
    },
    {
      "image": "https://i0.hdslb.com/bfs/openplatform/8228758d4bc162a4594b20d4e51594b3b3728aa8.png",
      "name": "特蕾西娅"
    },
    {
      "name": "白圣女",
      "image": "https://i0.hdslb.com/bfs/openplatform/e62b5d0288f2cad5742f2deed5c476ee3ff450ff.png"
    },
    {
      "image": "https://i0.hdslb.com/bfs/openplatform/801cf431134b29cc81d682b38cedda0ce93d2b33.png",
      "name": "卡通猫表情包"
    },
    {
      "image": "https://i0.hdslb.com/bfs/openplatform/a8a3437a97cb0272633092970b5e7305316ab0f2.png",
      "name": "猫羽雫"
    }
  ]).description('自定义角色列表'),
})

export function apply(ctx: Context, config: Config) {

  const publicDir = resolve(__dirname, '../public');

  ctx.server.get(`/${name}/public/config.json`, (koa) => {
    if (config) {
      koa.status = 200;
      koa.body = config; // 返回配置
    } else {
      koa.status = 503; // Service Unavailable
      koa.body = { message: "config is undefined." };
    }
  });

  ctx.server.get(`/${name}/public/proxy-image`, async (koa) => {
    try {
      const imageUrl = koa.query.url as string;

      if (!imageUrl) {
        koa.status = 400;
        koa.body = { message: "Missing image URL parameter" };
        return;
      }
      const response = await ctx.http.file(imageUrl)
      const contentType = response.type || response.mime
      const imageBuffer = Buffer.from(response.data);
      const base64Image = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
      koa.body = { base64Image };
      koa.status = 200;
    } catch (error) {
      console.error('Error proxying image:', error);
      koa.status = 500;
      koa.body = { message: "Failed to proxy image", error: error.message };
    }
  });

  ctx.server.get(`/${name}/public/:file`, async (koa) => {
    const filePath = path.join(publicDir, koa.params.file);

    if (fs.existsSync(filePath)) {
      // 设置适当的 Content-Type
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.js') {
        koa.type = 'application/javascript';
      } else if (ext === '.css') {
        koa.type = 'text/css';
      } else if (ext === '.png') {
        koa.type = 'image/png';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        koa.type = 'image/jpeg';
      } else if (ext === '.gif') {
        koa.type = 'image/gif';
      } else if (ext === '.webp') {
        koa.type = 'image/webp';
      }

      koa.body = fs.createReadStream(filePath);
    } else {
      koa.status = 404;
      koa.body = { message: "File not found" };
    }
  });

  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
}