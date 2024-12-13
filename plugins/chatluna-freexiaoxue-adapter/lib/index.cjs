var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  usage: () => usage,
  logger: () => logger,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_chat = require("koishi-plugin-chatluna/services/chat");
var import_koishi = require("koishi");

// src/client.ts
var import_client = require("koishi-plugin-chatluna/llm-core/platform/client");
var import_model = require("koishi-plugin-chatluna/llm-core/platform/model");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_error2 = require("koishi-plugin-chatluna/utils/error");

// src/requester.ts
var import_outputs = require("@langchain/core/outputs");
var import_api = require("koishi-plugin-chatluna/llm-core/platform/api");
var import_error = require("koishi-plugin-chatluna/utils/error");

// src/utils.ts
var import_messages = require("@langchain/core/messages");
var import_zod_to_json_schema = require("zod-to-json-schema");


var Config = import_koishi.Schema.intersect([
  import_chat.ChatLunaPlugin.Config,
  import_koishi.Schema.object({
    apiKeys: import_koishi.Schema.array(
      import_koishi.Schema.tuple([
        import_koishi.Schema.string().role("secret").description("API Key"),
        import_koishi.Schema.string().description("请求的 API 地址")
      ])
    ).description("API Key 和请求地址列表").disabled()
      .default([["", "是免费小学喵？"]]).hidden(),
    freexiaoxue_api: import_koishi.Schema.string().role('link').default('http://127.0.0.1:10721?input=').description('freexiaoxue的API地址。需要安装 [freexiaoxue-api插件](/market?keyword=freexiaoxue-api) 以搭建'),
  }).description("请求设置"),
  import_koishi.Schema.object({
    maxTokens: import_koishi.Schema.number().description(
      "回复的最大 Token 数（16~128000，必须是16的倍数）"
    ).min(16).max(128e3).step(16).default(128000),

    Maximum_token_topology: import_koishi.Schema.union([
      import_koishi.Schema.const(1).description('取消应用'),
      import_koishi.Schema.number(2).description('末尾字符保留数').default('3000').min(0).max(5000),
    ]).description("URL最长输入5k字符，开启此选项后，每次请求仅使用`末尾内容`来确保API的可访问性<br>推荐在2000到4000内").default(2),

    temperature: import_koishi.Schema.percent().description("回复温度，越高越随机").min(0).max(1).step(0.1).default(0.8),
    presencePenalty: import_koishi.Schema.number().description(
      "重复惩罚，越高越不易重复出现过至少一次的 Token（-2~2，每步0.1）"
    ).min(-2).max(2).step(0.1).default(0.2),
    frequencyPenalty: import_koishi.Schema.number().description(
      "频率惩罚，越高越不易重复出现次数较多的 Token（-2~2，每步0.1）"
    ).min(-2).max(2).step(0.1).default(0.2),
    loggerdebug: import_koishi.Schema.boolean().default(false).description("日志调试模式"),
  }).description("模型设置")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
]);
var inject = ["chatluna"];
var usage = `
<h2>使用</h2>
<p>插件会在启动时自动注册到 ChatLuna 服务中，选择本插件注册的 freexiaoxue/gpt66667-chatai 模型即可。你可以通过 ChatLuna 的聊天命令与 机器人 进行交互。</p>
<p>更多使用教程请参考 <a href="https://chatluna.chat/" target="_blank">https://chatluna.chat/</a></p>

---


<p>本插件需要一个后端API地址才可以使用</p>
<p>我们推荐使用 <a href="/market?keyword=freexiaoxue-api">freexiaoxue-api</a> 搭建后端</p>

`;
/*
---

## 接入其他免费AI

- 安装 \`chatluna-openai-like-adapter\` 
 - 配置apiKeys 
    - 地址： https://api.openai.gay/v1
    - 秘钥： sk-114514

- 安装 

*/
var name = "chatluna-freexiaoxue-adapter";



// src/index.ts
var import_logger = require("koishi-plugin-chatluna/utils/logger");
var logger;
function apply(ctx, config) {
  function logInfo(message) {
    if (config.loggerdebug) {
      logger.debug(message);
    }
  }
  const plugin = new import_chat.ChatLunaPlugin(ctx, config, "freexiaoxue");
  logger = (0, import_logger.createLogger)(ctx, "chatluna-freexiaoxue-adapter");
  logInfo(config)

  ctx.on("ready", async () => {
    await plugin.registerToService();
    await plugin.parseConfig((config2) => {
      return config2.apiKeys.map(([apiKey, apiEndpoint]) => {
        return {
          apiKey,
          apiEndpoint,
          platform: "freexiaoxue",
          chatLimit: config2.chatTimeLimit,
          timeout: config2.timeout,
          maxRetries: config2.maxRetries,
          concurrentMaxSize: config2.chatConcurrentMaxSize
        };
      });
    });
    await plugin.registerClient(
      (_, clientConfig) => new freexiaoxueClient(ctx, config, clientConfig, plugin)
    );
    await plugin.initClients();
  });

  function langchainMessageTofreexiaoxueMessage(messages, model) {
    const result = [];
    for (const rawMessage of messages) {
      const role = messageTypeTofreexiaoxueRole(rawMessage._getType());
      const msg = {
        content: rawMessage.content || null,
        name: role === "assistant" || role === "tool" ? rawMessage.name : void 0,
        role,
        //  function_call: rawMessage.additional_kwargs.function_call,
        tool_calls: rawMessage.additional_kwargs.tool_calls,
        tool_call_id: rawMessage.tool_call_id
      };
      if (msg.tool_calls == null) {
        delete msg.tool_calls;
      }
      if (msg.tool_call_id == null) {
        delete msg.tool_call_id;
      }
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          const tool = toolCall.function;
          if (!tool.arguments) {
            continue;
          }
          tool.arguments = JSON.stringify(JSON.parse(tool.arguments));
        }
      }
      const images = rawMessage.additional_kwargs.images;
      if ((model?.includes("vision") || model?.startsWith("gpt-4o")) && images != null) {
        msg.content = [
          {
            type: "text",
            text: rawMessage.content
          }
        ];
        for (const image of images) {
          msg.content.push({
            type: "image_url",
            image_url: {
              url: image,
              detail: "low"
            }
          });
        }
      }
      result.push(msg);
    }
    return result;
  }
  __name(langchainMessageTofreexiaoxueMessage, "langchainMessageTofreexiaoxueMessage");
  function messageTypeTofreexiaoxueRole(type) {
    switch (type) {
      case "system":
        return "system";
      case "ai":
        return "assistant";
      case "human":
        return "user";
      case "function":
        return "function";
      case "tool":
        return "tool";
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }
  __name(messageTypeTofreexiaoxueRole, "messageTypeTofreexiaoxueRole");
  function formatToolsTofreexiaoxueTools(tools) {
    if (tools.length < 1) {
      return void 0;
    }
    return tools.map(formatToolTofreexiaoxueTool);
  }
  __name(formatToolsTofreexiaoxueTools, "formatToolsTofreexiaoxueTools");
  function formatToolTofreexiaoxueTool(tool) {
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        // any?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters: (0, import_zod_to_json_schema.zodToJsonSchema)(tool.schema)
      }
    };
  }
  __name(formatToolTofreexiaoxueTool, "formatToolTofreexiaoxueTool");
  function convertDeltaToMessageChunk(delta, defaultRole) {
    const role = ((delta.role?.length ?? 0) > 0 ? delta.role : defaultRole).toLowerCase();
    const content = delta.content ?? "";
    let additional_kwargs;
    if (delta.function_call) {
      additional_kwargs = {
        function_call: delta.function_call
      };
    } else if (delta.tool_calls) {
      additional_kwargs = {
        tool_calls: delta.tool_calls
      };
    } else {
      additional_kwargs = {};
    }
    if (role === "user") {
      return new import_messages.HumanMessageChunk({ content });
    } else if (role === "assistant") {
      const toolCallChunks = [];
      if (Array.isArray(delta.tool_calls)) {
        for (const rawToolCall of delta.tool_calls) {
          toolCallChunks.push({
            name: rawToolCall.function?.name,
            args: rawToolCall.function?.arguments,
            id: rawToolCall.id,
            index: rawToolCall.index
          });
        }
      }
      return new import_messages.AIMessageChunk({
        content,
        tool_call_chunks: toolCallChunks,
        additional_kwargs
      });
    } else if (role === "system") {
      return new import_messages.SystemMessageChunk({ content });
    } else if (role === "function") {
      return new import_messages.FunctionMessageChunk({
        content,
        additional_kwargs,
        name: delta.name
      });
    } else if (role === "tool") {
      return new import_messages.ToolMessageChunk({
        content,
        additional_kwargs,
        tool_call_id: delta.tool_call_id
      });
    } else {
      return new import_messages.ChatMessageChunk({ content, role });
    }
  }
  __name(convertDeltaToMessageChunk, "convertDeltaToMessageChunk");

  // src/requester.ts
  var freexiaoxueRequester = class extends import_api.ModelRequester {
    constructor(_config, _plugin) {
      super();
      this._config = _config;
      this._plugin = _plugin;
    }
    static {
      __name(this, "freexiaoxueRequester");
    }
    async *completionStream(params) {
      try {
        const response = await this._post(
          "chat/completions",
          {
            model: params.model,
            messages: langchainMessageTofreexiaoxueMessage(
              params.input,
              params.model
            ),
            tools: params.tools != null ? formatToolsTofreexiaoxueTools(params.tools) : void 0,
            stop: params.stop,
            max_tokens: params.model.includes("vision") ? void 0 : params.maxTokens,
            temperature: params.temperature,
            presence_penalty: params.presencePenalty,
            frequency_penalty: params.frequencyPenalty,
            n: params.n,
            top_p: params.topP,
            user: params.user ?? "user",
            stream: true,
            logit_bias: params.logitBias
          },
          {
            signal: params.signal
          }
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let content = "";
        const findTools = params.tools != null;
        let defaultRole = "assistant";
        let errorCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split("\n\n");

          for (const event of events) {
            if (!event.trim()) continue;
            const data = this._transformApiResponse(event); // 使用新的转换函数
            const choice = data.choices?.[0];
            if (!choice) {
              continue;
            }
            const { message } = choice;
            const messageChunk = convertDeltaToMessageChunk(
              message,
              defaultRole
            );
            if (!findTools) {
              content = content + messageChunk.content;
              messageChunk.content = content;
            }
            defaultRole = message.role ?? defaultRole;
            const generationChunk = new import_outputs.ChatGenerationChunk({
              message: messageChunk,
              text: messageChunk.content
            });
            yield generationChunk;
          }
        }
      } catch (e) {
        if (e instanceof import_error.ChatLunaError) {
          throw e;
        } else {
          throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.API_REQUEST_FAILED, e);
        }
      }
    }

    async embeddings(params) {
      let data;
      try {
        const response = await this._post("embeddings", {
          input: params.input,
          model: params.model
        });
        data = await response.text();
        data = JSON.parse(data);
        if (data.data && data.data.length > 0) {
          return data.data.map(
            (it) => it.embedding
          );
        }
        throw new Error(
          "error when calling freexiaoxue embeddings, Result: " + JSON.stringify(data)
        );
      } catch (e) {
        const error = new Error(
          "error when calling freexiaoxue embeddings, Result: " + JSON.stringify(data)
        );
        error.stack = e.stack;
        error.cause = e.cause;
        logger.debug(e);
        throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.API_REQUEST_FAILED, error);
      }
    }

    async getModels() {
      let data;
      try {
        const response = await this._get("models");
        data = await response.text();
        data = JSON.parse(data);
        return data.data.map((model) => model.id);
      } catch (e) {
        const error = new Error(
          "error when listing freexiaoxue models, Result: " + JSON.stringify(data)
        );
        throw error;
      }
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _post(url, data, params = {}) {
      const maxTokenTopology = config.Maximum_token_topology;
      const prompt = ensureMaxLength(data.messages.map(msg => msg.content).join('\n'), maxTokenTopology);

      let requestUrl = `${config.freexiaoxue_api}${encodeURIComponent(prompt)}`;

      return this._plugin.fetch(requestUrl, {
        method: "GET",
        headers: this._buildHeaders(),
        ...params
      })
        .then(response => {
          if (!response.body) {
            throw new Error("Response body is missing");
          }
          return response;
        })
        .catch(error => {
          logger.error(`Error fetching data from API: ${error}`);
          throw error;
        });
    }

    _transformApiResponse(apiResponse) {
      const content = apiResponse; // 直接使用纯文本响应

      return {
        id: "chatcmpl-NewBing",
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "Precise-g4t-18k",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: content
            }
          }
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        system_fingerprint: "eyJhbGciOiJI",
        api_duration: "0s"
      };
    }

    _get(url, params = {}) {
      const mockData =
      {
        "object": "list",
        "data": [
          {
            "id": "gpt66667-chatai",
            "object": "model",
            "created": 1715367049,
            "owned_by": "system"
          },
          {
            "id": "gpt66667-chatai2",
            "object": "model",
            "created": 1715367050,
            "owned_by": "system"
          }
        ]
      };
      const response = new Response(JSON.stringify(mockData), {
        headers: { "Content-Type": "application/json" }
      });
      return Promise.resolve(response);
    }

    _buildHeaders() {
      return {
        Authorization: `Bearer ${this._config.apiKey}`,
        "Content-Type": "application/json"
      };
    }

    _concatUrl(url) {
      const apiEndPoint = this._config.apiEndpoint;
      if (!apiEndPoint.match(/\/v1\/?$/)) {
        if (apiEndPoint.endsWith("/")) {
          return apiEndPoint + "v1/" + url;
        }
        return apiEndPoint + "/v1/" + url;
      }
      if (apiEndPoint.endsWith("/")) {
        return apiEndPoint + url;
      }
      return apiEndPoint + "/" + url;
    }
    async init() {
    }
    async dispose() {
    }
  };

  function ensureMaxLength(input, maxLength) {
    logInfo(`保留末尾字符数量: ${maxLength}`);
    return input.length > maxLength ? input.substring(input.length - maxLength) : input;
  }
  // src/client.ts
  var freexiaoxueClient = class extends import_client.PlatformModelAndEmbeddingsClient {
    constructor(ctx, _config, clientConfig, plugin) {
      super(ctx, clientConfig);
      this._config = _config;
      this._requester = new freexiaoxueRequester(clientConfig, plugin);
    }
    static {
      __name(this, "freexiaoxueClient");
    }
    platform = "freexiaoxue";
    _requester;
    _models;
    async init() {
      await this.getModels();
    }
    async refreshModels() {
      try {
        const rawModels = await this._requester.getModels();
        return rawModels.filter(
          (model) => model.includes("gpt") || model.includes("text-embedding")
        ).filter(
          (model) => !(model.includes("instruct") || model.includes("0301"))
        ).map((model) => {
          return {
            name: model,
            type: model.includes("gpt") ? import_types.ModelType.llm : import_types.ModelType.embeddings,
            functionCall: true,
            supportMode: ["all"]
          };
        });
      } catch (e) {
        throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.MODEL_INIT_ERROR, e);
      }
    }
    async getModels() {
      if (this._models) {
        return Object.values(this._models);
      }
      const models = await this.refreshModels();
      this._models = {};
      for (const model of models) {
        this._models[model.name] = model;
      }
    }
    _createModel(model) {
      const info = this._models[model];
      if (info == null) {
        throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.MODEL_NOT_FOUND);
      }
      if (info.type === import_types.ModelType.llm) {
        return new import_model.ChatLunaChatModel({
          modelInfo: info,
          requester: this._requester,
          model,
          maxTokens: this._config.maxTokens,
          frequencyPenalty: this._config.frequencyPenalty,
          presencePenalty: this._config.presencePenalty,
          timeout: this._config.timeout,
          temperature: this._config.temperature,
          maxRetries: this._config.maxRetries,
          llmType: "freexiaoxue"
        });
      }
      return new import_model.ChatLunaEmbeddings({
        client: this._requester,
        model,
        maxRetries: this._config.maxRetries
      });
    }
  };
}

// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  usage,
  logger,
  name
});