"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const koishi_plugin_booru_1 = require("koishi-plugin-booru");
const logger = new koishi_1.Logger('koishi-plugin-booru');

class CustomizeImageSource extends koishi_plugin_booru_1.ImageSource {
  constructor(ctx, config) {
    super(ctx, config);
    this.languages = ['custom'];
    this.source = 'custom';
  }

  async get(query) {
    let images = [];
    const numberOfImages = query.count || 1;
    for (let i = 0; i < numberOfImages; i++) {
      try {
        //logger.error(this.config.APIurl);
        images.push({
          urls: {
            original: this.config.APIurl,
            large: this.config.APIurl,
            medium: this.config.APIurl,
            small: this.config.APIurl,
            thumbnail: this.config.APIurl,
          },
          //title: 'Unknown Title',
          //author: 'Unknown Author',
          nsfw: false, 
          tags: [],
          pageUrl: this.config.APIurl,
        });
      } catch (error) {
        logger.error(`Error downloading pictures:  ${error}`);
        break;
      }
    }
    return images;
  }
}

(function (CustomizeImageSource) {
  CustomizeImageSource.Config = koishi_1.Schema.intersect([    
    koishi_1.Schema.object({
        APIurl: koishi_1.Schema.string().default('').description('一个可以直接返回图片的可用API'),
  }).description('基础设置'),
    koishi_plugin_booru_1.ImageSource.createSchema({ label: 'custom' }),
]);
})(CustomizeImageSource || (CustomizeImageSource = {}));

exports.default = CustomizeImageSource;
