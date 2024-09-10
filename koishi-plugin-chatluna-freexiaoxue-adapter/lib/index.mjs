var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { ChatLunaPlugin } from "koishi-plugin-chatluna/services/chat";
import { Schema } from "koishi";

// src/client.ts
import { PlatformModelAndEmbeddingsClient } from "koishi-plugin-chatluna/llm-core/platform/client";
import {
  ChatLunaChatModel,
  ChatLunaEmbeddings
} from "koishi-plugin-chatluna/llm-core/platform/model";
import {
  ModelType
} from "koishi-plugin-chatluna/llm-core/platform/types";
import {
  ChatLunaError as ChatLunaError2,
  ChatLunaErrorCode as ChatLunaErrorCode2
} from "koishi-plugin-chatluna/utils/error";

// src/requester.ts
import { ChatGenerationChunk } from "@langchain/core/outputs";
import {
  ModelRequester
} from "koishi-plugin-chatluna/llm-core/platform/api";
import {
  ChatLunaError,
  ChatLunaErrorCode
} from "koishi-plugin-chatluna/utils/error";
import { sseIterable } from "koishi-plugin-chatluna/utils/sse";

// src/utils.ts
import {
  AIMessageChunk,
  ChatMessageChunk,
  FunctionMessageChunk,
  HumanMessageChunk,
  SystemMessageChunk,
  ToolMessageChunk
} from "@langchain/core/messages";
import { zodToJsonSchema } from "zod-to-json-schema";
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
      parameters: zodToJsonSchema(tool.schema)
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
    return new HumanMessageChunk({ content });
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
    return new AIMessageChunk({
      content,
      tool_call_chunks: toolCallChunks,
      additional_kwargs
    });
  } else if (role === "system") {
    return new SystemMessageChunk({ content });
  } else if (role === "function") {
    return new FunctionMessageChunk({
      content,
      additional_kwargs,
      name: delta.name
    });
  } else if (role === "tool") {
    return new ToolMessageChunk({
      content,
      additional_kwargs,
      tool_call_id: delta.tool_call_id
    });
  } else {
    return new ChatMessageChunk({ content, role });
  }
}
__name(convertDeltaToMessageChunk, "convertDeltaToMessageChunk");

// src/requester.ts
var freexiaoxueRequester = class extends ModelRequester {
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
          // remove max_tokens
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
      const iterator = sseIterable(response);
      let content = "";
      const findTools = params.tools != null;
      let defaultRole = "assistant";
      let errorCount = 0;
      for await (const event of iterator) {
        const chunk = event.data;
        if (chunk === "[DONE]") {
          return;
        }
        try {
          const data = JSON.parse(chunk);
          if (data.error) {
            throw new ChatLunaError(
              ChatLunaErrorCode.API_REQUEST_FAILED,
              new Error(
                "error when calling freexiaoxue completion, Result: " + chunk
              )
            );
          }
          const choice = data.choices?.[0];
          if (!choice) {
            continue;
          }
          const { delta } = choice;
          const messageChunk = convertDeltaToMessageChunk(
            delta,
            defaultRole
          );
          if (!findTools) {
            content = content + messageChunk.content;
            messageChunk.content = content;
          }
          defaultRole = delta.role ?? defaultRole;
          const generationChunk = new ChatGenerationChunk({
            message: messageChunk,
            text: messageChunk.content
          });
          yield generationChunk;
        } catch (e) {
          if (errorCount > 5) {
            logger.error("error with chunk", chunk);
            throw new ChatLunaError(
              ChatLunaErrorCode.API_REQUEST_FAILED,
              e
            );
          } else {
            errorCount++;
            continue;
          }
        }
      }
    } catch (e) {
      if (e instanceof ChatLunaError) {
        throw e;
      } else {
        throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e);
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
      throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, error);
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
    const requestUrl = this._concatUrl(url);
    for (const key in data) {
      if (data[key] === void 0) {
        delete data[key];
      }
    }
    const body = JSON.stringify(data);
    return this._plugin.fetch(requestUrl, {
      body,
      headers: this._buildHeaders(),
      method: "POST",
      ...params
    });
  }
  _get(url) {
    const requestUrl = this._concatUrl(url);
    return this._plugin.fetch(requestUrl, {
      method: "GET",
      headers: this._buildHeaders()
    });
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

// src/client.ts
var freexiaoxueClient = class extends PlatformModelAndEmbeddingsClient {
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
          type: model.includes("gpt") ? ModelType.llm : ModelType.embeddings,
          functionCall: true,
          supportMode: ["all"]
        };
      });
    } catch (e) {
      throw new ChatLunaError2(ChatLunaErrorCode2.MODEL_INIT_ERROR, e);
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
      throw new ChatLunaError2(ChatLunaErrorCode2.MODEL_NOT_FOUND);
    }
    if (info.type === ModelType.llm) {
      return new ChatLunaChatModel({
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
    return new ChatLunaEmbeddings({
      client: this._requester,
      model,
      maxRetries: this._config.maxRetries
    });
  }
};

// src/index.ts
import { createLogger } from "koishi-plugin-chatluna/utils/logger";
var logger;
function apply(ctx, config) {
  const plugin = new ChatLunaPlugin(ctx, config, "freexiaoxue");
  logger = createLogger(ctx, "chatluna-freexiaoxue-adapter");
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
}
__name(apply, "apply");
var Config = Schema.intersect([
  ChatLunaPlugin.Config,
  Schema.object({
    apiKeys: Schema.array(
      Schema.tuple([
        Schema.string().role("secret").description("freexiaoxue 的 API Key").required(),
        Schema.string().description("请求 freexiaoxue API 的地址").default("https://api.freexiaoxue.com/v1")
      ])
    ).description("freexiaoxue 的 API Key 和请求地址列表").default([["", "https://api.freexiaoxue.com/v1"]])
  }).description("请求设置"),
  Schema.object({
    maxTokens: Schema.number().description(
      "回复的最大 Token 数（16~128000，必须是16的倍数）（注意如果你目前使用的模型的最大 Token 为 8000 及以上的话才建议设置超过 512 token）"
    ).min(16).max(128e3).step(16).default(1024),
    temperature: Schema.percent().description("回复温度，越高越随机").min(0).max(1).step(0.1).default(0.8),
    presencePenalty: Schema.number().description(
      "重复惩罚，越高越不易重复出现过至少一次的 Token（-2~2，每步0.1）"
    ).min(-2).max(2).step(0.1).default(0.2),
    frequencyPenalty: Schema.number().description(
      "频率惩罚，越高越不易重复出现次数较多的 Token（-2~2，每步0.1）"
    ).min(-2).max(2).step(0.1).default(0.2)
  }).description("模型设置")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
]);
var inject = ["chatluna"];
var name = "chatluna-freexiaoxue-adapter";
export {
  Config,
  apply,
  inject,
  logger,
  name
};
