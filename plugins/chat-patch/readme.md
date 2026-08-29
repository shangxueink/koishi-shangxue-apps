# koishi-plugin-chat-patch

[![npm](https://img.shields.io/npm/v/koishi-plugin-chat-patch?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-chat-patch) [![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-chat-patch)](https://www.npmjs.com/package/koishi-plugin-chat-patch) [![Koishi](https://img.shields.io/badge/Koishi-plugin-5546A3?style=flat-square&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFBUlEQVR42s2aT2gdVRTGf2eSaLEqhopSmz7FIhVjs6hKpMGFWhSiAbFYNwW3YsGdLiyKFeKiurALEXQh%2BA8DGroQLKjZWJBIKTQ1iFHbEmtjTGlIbGqa5M3n5ly5TGdemvS9l7nwePNm5s1835w%2F98z5rrGKISkBzMyq0b4K8KB%2F7gUqQDuwzk%2BZB6aBceAnYBgYNrPT0TVaAJlZSiOHJPObhd%2B3SXpB0jeSprXyMSPpO0kvSuqICUmyRpGICdwt6b0c8FVJS%2F6dFnzic7KkPpDUmXfPupKQ1C7pbUkXIwCLDixdhUVS%2F%2B9itG9e0juSNtSNjLtS4tu9kn7PEFgN%2BFqkYkKnJPWFmFy1qzkJ8%2B39DSSwHKH%2BLJ4Vk5DUKumTyP%2Brat4IsSRJn0tqWxGZ4E5O4pBfaEFrN8K9v3Iyy7tZsIJvf1oCElkyA46ttSaZiMT%2BEpHIkumPsdZKsY81KaivJgn0ZlNzyErm2zcAJ4AOQEBCuUbqOM8C24AZL2kUgCZe37wGbAaqJSSBY6oCm4DXHXMCECY8AVu8mGtz1kY5h%2FyzBHQBY4CFKlbAS8C1kfnKSsIc4zXAy47dQozcCvwGrI9jp8RD%2Fn0RuMvMJkIc7AKud%2F%2BzEgM%2FCcw5xqo%2F%2BGeIAnpXZLYyjvCi9Rnwh5MIBJ8GSCRtBh5wEklJiQRcR4GbgBbfZ8D9kioJ0OPzR1pitzLgHDACHAM%2BBBb82HpgRwJ0Z%2FywjG4l4JiZnTKzJ4BJz7CLfk53K9BZ8kwVLPKRpO1ujS7fH%2BqtzsS7HZTYrVo9zQ4Ce5zEQmbSriTesinrCNnpSzP7F9jprpZ9j283STPAjSVNv6GWusetcjJjiYB5Nim5NRLgazP7GXjOgVfzTjZJk8AtJbOIoulgO%2FAr8KfPIdXItQLmvxNvY5bRGi3A%2B2Z23CvyfcCrwIWoAg5jOvFebJnmkRDMZx08%2Fvs48EgmngPm8QQYLSERA%2Faa2XlJz7trHQEezpRSAfNoq3fFyzKPLPm88a6ZHZJ0J3DAS6hqTj0YMA8jqSLpQvSCv1YjNBaOSFrn%2FauhzLFsM0KOvZKY2bhXlYrK5bUI7lbgNLDbzOaBV9yVlqJSJK8GO2pm48FMg5ngWYsMNQn0mdlZSU8Cb2RSbVENNhj3tDa6idImu1dwmb8kdUUizy9R%2F7eox5U65o3hxarFzCaAgegVspmBPQY8amYj0bHZnLkia0UDBsxsQlLL%2F9qDpK2SLkVqUyO77OFJH%2FbGR5Dxtvj2U358qcAaVce6NdZw4nbpwRpZot66x5uRa%2B%2BWNOVK2KCkHkkjBe4VrnHwMkUrkhLaJZ2JWDeCwAlJO6Ou%2BoGC%2F03lTAnBW8441sslhsgqvXVqYlczBGa9y3%2Bd3%2Bc%2BST9kAKYF7rRsE7tIVuhfhayQRuBja865Arwpus9eFz1rTXbpqmSFHKFn4Co1kjFJ%2ByJ19mZJO3x7dIXXXpnQk4mXNpe7ruSGVffp711afiiaEx6X9LGkf1zKuz3Kjo2R3nLE0DYXIpUj8gfzT0l6S9Kzknr8%2F9s8tZ7LgPpC0rfLTHb1EUML5On%2BGvJ0Gj21OTf74RxAadPl6YIFA30u4ucRCt8%2F%2BjKM4BJpwZNu3oKBgtS8wWNgfpklHGmplnDUWFTT6U9%2BJudpXyrtopoay5w6fInSUA6pK13mNFSPZU5Wx4Vnd3hDvJvihWfnXd%2Bo%2B8Kz%2FwDQsBEaIDhBFQAAAABJRU5ErkJggg%3D%3D)](https://koishi.chat/)
基于 Satori 的 Koishi WebUI 聊天室插件。它会在 Koishi 控制台中提供一个聊天页面，用于查看机器人收到的消息、联系人、群组、历史记录和媒体内容。

## 项目来源

本项目的灵感来源于 [Stapxs QQ Lite 2.0](https://github.com/Stapxs/Stapxs-QQ-Lite-2.0)。该项目具备出色的 UI 设计，并通过 OneBot 协议连接 WebUI，实现了类似网页聊天室的效果，窝很喜欢喵。

与此同时，Koishi 框架本身具备跨平台、WebUI 等特性，因此我希望将类似功能嵌入到 Koishi 的 WebUI 中，实现在控制台内直接打开网页聊天室（基于 Satori 协议的网页聊天室）。

需要说明的是，虽然存在 [satorijs/satori-app](https://github.com/satorijs/satori-app) 等类似项目，但它们需要独立安装，并未集成在 Koishi 内部。

本项目魔改自 [Stapxs QQ Lite 2.0](https://github.com/Stapxs/Stapxs-QQ-Lite-2.0) 。

---

## 环境要求

在使用本插件之前，请确保：

1. 已在 Koishi 中启用 `server-satori`
2. 再启用本插件

---

## 构建与发布

在 Koishi 项目根目录下执行以下命令进行构建：

```bash
yarn build chat-patch
```

该命令会**依次构建**：

| 构建目标 | 输出路径 | 说明 |
| --------- | --------- | ------ |
| 后端 | `lib/` | 后端编译结果 |
| Koishi WebUI 外壳 | `dist/` | 供 Koishi 控制台加载的外壳页面 |
| 独立 Web 应用 | `client/web/dist/` | 实际聊天 Web 应用产物 |

---

## 四、许可

本项目采用 [MIT](https://opensource.org/licenses/MIT) 许可证。
