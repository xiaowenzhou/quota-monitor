---
description: "DeepSeek Harness Web 界面的提供商账户余额与订阅窗口、会话日志 token 分析、开销推算，以及用量面板。"
kind: "package-reference"
---

# @deepseek-ai/dsh-extension-quota-monitor

[English](README.md) | 中文

## 概述

`dsh-extension-quota-monitor` 回答关于运行中 harness 的两个问题：已经花了多少，还剩多少。宿主半边通过十七个适配器读取各已配置提供商的账户端点，把每份已持久化的会话日志折叠为按天、按 `provider · model` 的 token 总量，并挂接 `llm/stream` 瀑布以维护实时计数。其侧边栏面板把每个受监控账户显示为一枚状态标签，并给出所选账户的数字、今日与本月与累计总量及其推算开销与预算进度条、每日用量日历、按天与按会话的明细，以及 CSV/JSON 导出。凭据不会离开宿主进程；读不到的账户会说明原因，而不是显示 0。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用本包

当运维者希望在运行中的会话旁边看到开销与剩余额度时挂载本插件。它是叠加在既有提供商配置之上的只读统计：提供商通过设置注册表发现，而不由本包持有凭据，因此增删一条提供商配置即可改变面板报告的内容，无需改动这里。

### 面板报告什么

- **输入框旁** —— 模型选择器所对应的那条路由会在工具行上显示自己的额度：订阅最紧的两个窗口（5 小时、本周…）或钱包余额，按严重度着色。点击它会展开完整读数：每个窗口及其重置倒计时与公布的剩余量、余额、预算池，以及该端点自己上报的这份凭据用量，外加一个立即刷新的按钮。没有账户端点的供应商不渲染任何东西；只有当同座位别的插件自己的额度 chip 正是在为**当前这条路由**说话时，本插件才让位，因此同一条路由不会同时挂两个。
- **全部受监控账户排成一列** —— 每个提供商一枚带严重度圆点的标签，因此额度耗尽的账户不必打开卡片也能看见。
- **一次一个账户** —— 所选标签的卡片显示该提供商公开的那一种：余额（剩余、已用、额度、币种）或订阅的方案窗口。
- **方案窗口** —— 订阅账户把每个窗口渲染为一条已用占比进度条，各自带独立的重置倒计时：提供商自己的滚动会话窗口、5 小时、每日、每周、每月、订阅周期，以及独立的配额。
- **预算池** —— AgentRouter 账户在账户余额之外，为每个预算池给出一行，各含该池自己的剩余与额度。
- **账号用量** —— 账户端点若自行公布用量表，卡片下方会按天、按模型或按预算池逐行列出。这份账是该次读取所用凭据自己的，因此同一条 provider 路由背后的两把 Key 各自报自己的数字——这正是本地折叠做不到的那个拆分：模型请求只带路由名，从不带服务它的那把 Key。
- **Token 分析** —— 今日、本月与累计，各自拆分为输入、输出、缓存读取、缓存写入，并给出今日缓存命中占计费输入的比例。
- **跟随所选路由** —— 在供应商选择器里选中的那条路由，同时决定统计范围：今日/本月/累计、每日用量日历及其按天下钻、会话列表都只描述这条路由，因此没有一个数字会混进两个供应商。在任意位置选中路由（账户卡片的选择器，或下方统计行）都会让整块面板切到它。
- **按供应商拆分** —— 每条路由在所选范围（今日 / 本月 / 累计）内的折叠 token，以及该路由在该范围内的占比、调用次数、涉及模型、缓存命中率、最近使用日期与推算费用。列表默认只显示当前聚焦的那条路由，点一下即可展开全部；路由是折叠能提供的最细身份——一次请求只给出 provider 与模型，从不给出凭据——因此同一条路由背后的两把 Key 仍合并为一行。
- **推算开销** —— 一旦配置了 `pricing.rules`，每项总量、每天、每条路由行与每个会话都同时带上金额，并在旁边写明有多少次调用没有任何规则可定价。
- **开销上限** —— `budgets.daily` 与 `budgets.monthly` 呈现为进度条，推算开销逼近上限时依次转为琥珀色与红色。
- **每日日历** —— 当月按星期对齐的日历，每天一个带 token 数的着色格子，今天带描边；点选某天即展开该天的 `provider · model` 明细。
- **最活跃的会话** —— 最近活跃的二十个会话，含其路由、调用次数、token 与开销。
- **导出** —— 按天明细导出为 CSV、按会话明细导出为 CSV，或整份报告导出为 JSON，直接从浏览器保存。
- **手动额度** —— 无可读账户端点的提供商可手动填写额度，按观测到的 token 量估算消耗。

### 哪些账户可以读取

| 适配器 | 提供商 | 读取 |
|---|---|---|
| `deepseek-balance` | DeepSeek | `GET {origin}/user/balance`，优先取 CNY 条目 |
| `openrouter-balance` | OpenRouter | `/api/v1/credits`，需要 Management Key |
| `moonshot-balance` | Moonshot / Kimi API | `/v1/users/me/balance` |
| `zai-balance` | Z.ai / 智谱开放平台 | `/api/paas/v4/balance` |
| `orcarouter-balance` | OrcaRouter | `/v1/balance`，其次是 OpenAI 兼容计费接口对 |
| `new-api` | new-api 网关 | `/api/usage/token/`，其次 `/api/user/self`，计价单位取自 `/api/status` |
| `sub2api` | Sub2API 协议网关 | `{origin}/v1/usage`：按响应自述为钱包、总配额或订阅窗口 |
| `sub2api-auth` | Sub2API 转售面板 | `{origin}/user/balance` 加今日开销，读不到时回落到 `/v1/usage` |
| `agent-router` | AgentRouter | `{origin}/desk/v1/stepcode/user/info` |
| `stepcode` | StepCode / AgentRouter desk | 同一路径，读作账户汇总加其预算池、用量占比与计费周期 |
| `general` | CC Switch 风格网关 | `GET {baseURL}/user/balance` |
| `zai-token-plan` | Z.ai / GLM Coding Plan | 配额上限加订阅列表 |
| `kimi-token-plan` | Kimi For Coding | `https://api.kimi.com/coding/v1/usages` |
| `minimax-token-plan` | MiniMax Coding Plan | token plan 余量，海外或国内域名 |
| `opencode-go` | OpenCode Go | `https://opencode.ai/zen/go/v1/usage` |
| `ollama` | Ollama 云端 | `https://ollama.com/api/usage` |
| `cline-plan` | Cline Pass | `{baseURL}/users/me/plan/usage-limits` |
| `declarative` | 任意网关 | 配置的 URL 加 JSON Pointer |

一条路由的适配器按此优先级解析：显式配置、规范路由 id、base URL 所指的主机名。三者都不匹配的路由会被反问它是什么：一次不带凭据的 `GET {origin}/api/v1/settings/public`，凭只有 Sub2API 转售面板才会提供的公开设置文档识别出该面板。`detection.enabled: false` 会跳过这次探测；仍然解析不出适配器的路由报告 `unsupported`——这是确定的结论而非失败——并改为提供手动额度。

### 挂载

宿主半边是 `quotaMonitor` Remote 服务；浏览器半边通过本包的 `dsh.client` 字段声明。随附的 Web bundle 通过其 `cordis.patch.yml` 同时挂载两者；自定义组合只需加一行：

```yaml
- insert:
    - id: quota-monitor
      name: '@deepseek-ai/dsh-extension-quota-monitor'
      config:
        refresh:
          enabled: true
          activeMs: 60000
          backgroundMs: 300000
        thresholds:
          warningRemaining: 10
          criticalRemaining: 2
          warningPercentUsed: 80
          criticalPercentUsed: 95
        detection:
          enabled: true
```

`refresh.enabled: false` 关闭全部无人值守请求，同时保留面板的按需读取。`thresholds` 决定数字何时转为琥珀色或红色；默认值适用于以 CNY 或 USD 计价的小额预付账户，其他量级的账户可按提供商覆盖。

### 声明价格与上限

本包不随附任何价目表。中转会按自己的费率转售同一个模型，内置表格过期后只会给出自信而错误的数字，因此开销只从部署自己声明的规则推算：

```yaml
config:
  pricing:
    currency: USD
    rules:
      - model: deepseek-chat
        inputPerMillion: 0.27
        outputPerMillion: 1.1
        cacheReadPerMillion: 0.07
      - provider: my-relay
        model: glm-4*
        from: 2026-03-01
        inputPerMillion: 0.6
        outputPerMillion: 2.2
  budgets:
    daily: 5
    monthly: 100
    warningPercent: 80
    criticalPercent: 100
```

规则按其给出的最窄名字匹配 `provider · model` 路由：提供商加精确模型、以 `*` 结尾的模型系列、按提供商、全量兜底。`from` 让规则自某个本地日历天起生效，因此提价不会改动更早那些天当时的计价。`cacheReadPerMillion` 与 `cacheWritePerMillion` 默认取输入费率，对应那些计量缓存 token 却不单独定价的提供商。没有规则覆盖的调用会被计数，而不是按零计费，面板会把这个次数写在金额旁边。预算以 `pricing.currency` 计价，因此没有任何价格支撑却配置了预算会在加载时失败，而不是渲染为未知。

把价格目录留在文件里维护的部署，改用 `pricing.imports` 引用它，而不必在配置里重述：

```yaml
config:
  pricing:
    currency: USD
    fuzzyMatch: true
    imports:
      - path: /srv/dsh/prices/provider-pricing.json
    rules:
      - provider: my-relay
        model: glm-4*
        inputPerMillion: 0.6
        outputPerMillion: 2.2
```

每个路径都必须是绝对路径，并会在每轮后台刷新时重新读取；支持两种格式：本包自己的格式（`{ currency, rules }`，或直接一个规则数组），以及公开的厂商目录（`providers.<vendor>.models.<id>.{ input, output, cachedInput, cacheWrite }`，单位为美元/百万 token）。在同等具体的匹配上，`pricing.rules` 里写下的规则优先于导入的规则，因此部署可以只覆盖目录中的某一个模型而不必复制整份目录。金额从不换算：文档单位与 `pricing.currency` 不一致会在加载时失败。`fuzzyMatch` 让精确匹配与前缀匹配都未命中的模型退回到归一化比较——忽略大小写、空格、连字符、点号与括号附注——有了它，厂商目录才能用于那些把同一模型拼得不一样的 route id；默认关闭，因为这种命中是推断而不是陈述。目录条目里的上下文长度分档与峰谷费率不在建模范围内，会被忽略。

### 导出

三个导出按钮请求宿主用屏幕上已有的那份报告构建文档，并经面板读取时用的同一个 Remote 面回传。两份 CSV 都以 UTF-8 在电子表格中打开，为每个单元格加引号，并给以 `=`、`+`、`-`、`@` 开头的单元格加上单引号前缀，因此路由 id 永远不会被当作公式求值。JSON 文档携带整份用量报告，外加每条受监控路由一行、写明其适配器与状态；账户余额、方案窗口与凭据引用只留在面板里。

### 让它认识新网关

`monitors` 条目可覆盖单条路由的解析结果：强制指定适配器、改指另一个端点、改用另一个凭据、为该提供商单独设阈值，或者完整描述这次读取：

```yaml
config:
  monitors:
    my-gateway:
      declarative:
        url: /api/account
        remainingPointer: /data/credits/available
        limitPointer: /data/credits/total
        currency: USD
```

声明式形式是数据而非代码：它只给出一个端点和若干 RFC 6901 JSON Pointer，因此接入新网关不会扩大本插件可执行的范围。

`usageBaseURL` 用于账户端点不在推理 base URL 之下的网关；`credentialRef` 用于网关期望的凭据引用与 provider 档案里存的 key 名不同时。`allowPlaintextEndpoint: true` 是传输规则唯一一处刻意例外：内网网关的地址看起来与公网地址无异，只能走明文读取，写下这条路由即是运维者的批准。该许可只覆盖这一条路由——其余路由仍然需要 TLS 或回环。`allowedHosts` 把一条路由限制在它被允许访问的确切主机上（写 `host` 或 `host:port`）：这样一份被改过 base URL 的复制配置会以 `blocked` 失败，而不会把那把 Key 发到部署从未提过的地方。留空或不写表示这条路由只受传输规则约束。

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 —— 点击展开</summary>

两个半边共享同一套线格式：浏览器半边从不直接读取提供商状态，它渲染的每个数字都经由网关上的 `quotaMonitor` Remote 方法抵达。

### 源码索引

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | `quotaMonitor` 服务：`llm/stream` 挂接、账户读取、网关识别、刷新定时器与 Remote 方法 |
| [`src/config.ts`](src/config.ts) | 刷新节奏、告警阈值、网关识别、价格、上限与按提供商的监控覆盖项 |
| [`src/identity.ts`](src/identity.ts) | 某条路由由哪个适配器服务，以及私有主机判定 |
| [`src/http.ts`](src/http.ts) | 各适配器共用的受限 JSON GET 与失败分类 |
| [`src/parse.ts`](src/parse.ts) | 数值转换、字段探测、百分比钳制、时间戳归一 |
| [`src/adapters/`](src/adapters/) | 每类账户一个模块，外加 Sub2API 指纹与声明式读取器 |
| [`src/pricing.ts`](src/pricing.ts) | 按路由与日期匹配规则，以及各口径共用的开销累加器 |
| [`src/price-import.ts`](src/price-import.ts) | 从配置指定的文档读取价格规则（两种受支持格式） |
| [`src/usage-fold.ts`](src/usage-fold.ts) | 把会话事件纯函数式折叠为按天、按路由的计数，并汇总出按供应商的视图 |
| [`src/usage-store.ts`](src/usage-store.ts) | 折叠轮次：读取会话、缓存折叠结果、组装报告 |
| [`src/usage-domain.ts`](src/usage-domain.ts) | `quota_usage` 存储域，每个会话一条折叠记录 |
| [`src/export.ts`](src/export.ts) | 面板下载的两份 CSV 文档与 JSON 报告 |
| [`src/types.ts`](src/types.ts) | 两个半边共享的账户、用量与快照类型 |
| [`src/client/index.ts`](src/client/index.ts) | 浏览器挂载、词典注册与两处 slot 注册 |
| [`src/client/UsagePanel.tsx`](src/client/UsagePanel.tsx) | 面板根组件：数据加载与七个区块 |
| [`src/client/QuotaPill.tsx`](src/client/QuotaPill.tsx) | 输入框旁的额度药丸：所选路由的窗口或余额 |
| [`src/client/windows.ts`](src/client/windows.ts) | 套餐窗口词汇，以及账户卡片与药丸共用的排序 |
| [`src/client/ProviderUsage.tsx`](src/client/ProviderUsage.tsx) | 按供应商的 token 拆分，以及每条路由占全部 token 的比例 |

### 一次账户读取如何解析

读取从设置注册表出发，而非硬编码的提供商清单。对每条路由，它解析设置档案（`baseURL` 与 `apiKeyEnv`），经凭据服务解析该引用，选定适配器并执行。任何失败都转化为卡片如实呈现的账户状态：`not-configured`、`unauthorized`、`rate-limited`、`unsupported`、`invalid-response`、`unavailable` 或 `blocked`。没有任何失败会产出数字。

三条规则防止误配置的监控变成数据外泄通道。凭据只发往绝对 `https:` URL，自托管网关允许回环 `http:`；URL 内嵌凭据或指向明文公网主机的，在发出任何请求之前就被判为 `blocked`。永不跟随重定向，因为重定向会把 `Authorization` 头带到本配置从未认可的主机。响应体上限 1 MiB。

网关识别遵守同样的规则，并另加一条自己的：指纹探测不携带凭据，仅在没有任何规则解析出适配器、且事后确实有凭据可用时才运行，其结论按提供商与 base URL 缓存，因此不认识的网关只被问一次，而不是每次刷新都问。

有一类网关在同一套协议下会给出三种不同的回答，因此 Sub2API 的读取结果自述其形态——钱包卡片或计量订阅——面板据此形态而非适配器 id 来组织卡片。

私有主机判定是为 Ollama 而设：本机 `localhost:11434` 守护进程与云端共用同一路由 id，却并无订阅，把它当作配额账户就会凭空造出并不存在的窗口。因此指向本机的规范路由 id 解析为无适配器。

### 用量如何折叠

报告折叠自持久化的会话日志而非进程内计数，因此能跨重启留存，也涵盖本进程从未运行过的会话。一轮折叠列出全部会话，读取日志有增长的那些，把携带提供商上报 `usage` 的 `assistant/message` 事件累加到该事件所属的本地日历天。`provider · model` 路由取自最近一条 `request/context` 事件，因此中途切换模型的会话会保留为不同的行。

只折叠提供商上报的用量。适配器未上报用量的步骤不贡献任何数字，也不做估算，因此每个数字都能追溯到提供商自己的记账。

每个会话的折叠结果连同已到达的日志 `seq` 一起缓存在 `quota_usage` 存储域中，因此稳态下一轮的开销是一次列举加上真正发生变化的那些会话。日志若是变短而非增长，则从头重折：它此前的 seq 已不再指向同一批事件。缓存只保存计数、路由 id 与最后一次记录用量的时刻——没有提示词文本、工具输出或文件路径——记录丢失的代价只是重折一次，绝不会产生错误数字。

按天是本地时区而非 UTC。读者口中的"今天"指他们自己的一天，而按 UTC 折叠会把中国工作日中八小时的用量挪进错误的格子。

### 开销如何推算

开销在组装报告时按每天各自的计数推算，而不是靠一个流水累计值。每一行都用它自己那天生效的规则定价，因此按天、按会话、按月与累计四个数字彼此一致，日后调价也绝不会重算历史。每个口径都带上自己的金额，以及它无法定价的调用次数——这正是部分定价的总量仍然可读、而不是塌缩成一个破折号的原因。

预算窗口以同一币种把上限与推算开销相比。若某个窗口的开销全部落在无法定价的调用上，它报告 `unknown`，而不是一个让人安心的 0%。

### 为什么读取留在进程内

账户读取使用 Node 自带的 TLS 栈，而不是外挂 sidecar 或 CLI，因此插件保持单进程安装方式，部署主机上不需要额外二进制。它们也运行在任何会话之外，这正是其流量不会进入流挂接、不会污染该挂接所维护计数的原因。

</details>

<a id="further-exploration"></a>
## 进一步探索

需要本包依赖的能力接缝或所遵循的约定时，请阅读这些页面。

- [扩展子系统](../../../docs/subsystems/extensions.zh.md) —— Cordis 扩展包如何组合与挂载。
- [设置子系统](../../../docs/subsystems/settings.zh.md) —— 账户读取所依据的提供商档案注册表。
- [LLM 流式子系统](../../../docs/subsystems/llm-streaming.zh.md) —— 本包为实时计数所挂接的瀑布。
- [会话查询](../../session-query/session-query/README.zh.md) —— 用量折叠读取的会话集合。
- [存储域](../../storage/storage-domain/README.zh.md) —— 折叠缓存所在的 KV 域层。

<a id="model-experience"></a>
## 模型体验

无。监控器只观测 `llm/stream` 流量、读取账户端点、折叠持久化日志并响应浏览器读取；不注册任何提示词章节、工具或请求改写。

#### KV 缓存影响

面板及其宿主服务不向模型上下文添加任何内容。Token 数字是对已完成流式调用的读侧统计，账户读取运行在任何会话之外，因此不会因本包而增长任何 KV 缓存。

## 已知限制与延期工作
<a id="known-limitations-and-deferred-work"></a>

- 输入框旁的额度药丸显示 Host 缓存中该路由的读数，每分钟重读一次，也可在展开的读数里点「刷新」强制读取，因此数字可能比端点滞后一个刷新间隔。它用会话的 `modelSelection` 投影判断路由，并且只对「既自称额度、又声称是当前这条路由」的兄弟条目让位——`cline-pass-usage` 仅在 `cline-pass` 正是当前路由时挡住它；而像裸 `usage` 这种不指明路由的 id 会声称所有路由。该座位会被持续观察，后加载的插件同样优先。
- 用量总量折叠自持久化的会话日志，因此日志从未写出的会话不贡献任何数字。进程内实时计数只覆盖当前进程并随之重置，手动额度同理。
- 会话列表以 id、最后活跃时刻与路由标识一个会话，不带对话标题：标题是由提示词衍生的文本，而 `quota_usage` 折叠只保存计数与路由 id。要显示标题就得把面板列出的每份会话日志再读一遍。
- 开销的完整程度取决于所配置的价格。本包不随附价目表，没有规则覆盖的路由报告为未定价而不是免费，且一条规则只表达一个固定的每百万费率，因此阶梯价、批量价与按上下文长度计价都无法表达。
- 导入的目录按模型给出单一费率。这类文档可能携带的上下文长度分档与峰谷费率会被忽略，且导入金额从不换算，因此单位不一致的文档会被拒绝而不是缩放。本包也不按时段计价：同一模型在峰时与谷时费率不同的提供商，在这里一律按其规则陈述的那一个费率计费。`fuzzyMatch` 比较归一化后的模型 id，可能把某个恰好归一化相同的 route 计成目录中的条目；关掉它，匹配就只认规则字面写明的内容。
- 适配器覆盖面是端点特定的。既未公开任何已识别端点、也不响应指纹的网关报告 `unsupported`；声明式监控与手动额度是两种变通方式。
- 网关识别只认得一类。它只探测一个公开设置文档，因此隐藏该路由、或把它放在登录之后的中转，仍然需要 `monitors.<id>.adapter`。
- AgentRouter 的账户与预算池数字不附带单位，因此面板标注为 `credits` 并原样呈现端点上报的值。其字段名取自一组按序候选而非某个钉死的拼写，因此字段改名只会让该行降级，而不会报出错误数字。
- Cline Pass 账户只通过方案窗口读取；独立的信用余额端点不在读取范围内，因此没有生效方案的按量付费 Cline 账户会回落到手动额度。
- OpenCode Go 的用量端点并非其公开提供商 API 的一部分，上游可能变更；变更会在该卡片上表现为 `invalid-response`。
- 折叠读取完整的会话日志。会话数量很多且很长的集合，冷启动后的第一轮会按比例变慢；后续轮次只读取发生变化的部分。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 —— 点击展开</summary>

本包不发布运行时不变式伴随模块。服务持有一处 `llm/stream` 挂接、三个定时器、用量存储与若干内存映射，而 `[Service.init]` 中安装的那一个 effect disposer 会释放全部这些，因此不存在第二个权威源可供伴随模块在运行时核对。

面板文案归属 locale：`src/client/locales.ts` 声明 `quotaMonitor` 命名空间与两份随附词典，`main` 注册声明 `locale: NS`，每个组件都通过框架的 `t` 座位读取字符串。`verify-client-ui-i18n` 会拒绝重新写回组件的字符串。

`lib/typert.host.js` 与 `lib/typert.remote-client.js` 由仓库的 Typert 环节生成，而该环节只在**根目录**的 host 构建中运行（`pnpm run build:lib:host`，或在仓库根执行 `tsdown --env.DSH_BUILD_FACE host`）。只跑包内 `tsdown` 只会产出 `lib/index.js` 与 `lib/client.js`，因此改动 Remote 的请求或结果类型时，随包发布的线上 schema 会停留在旧版本——而 schema 未声明的参数会在服务看到它之前就被丢弃。请走根构建，让清单与类型一起更新。

侧边栏入口 id 与 `main` slot key 是同一个字符串（`quota-monitor`）；这个同一性正是侧边栏据以定位所选面板的方式，只改其中一处会让入口静默失联。

面板的着色梯度、状态配色与进度条只由 design-platform 的别名 token 构成；五级日历梯度出自对 `--dsw-alias-state-business-primary` 的 `color-mix`，因此日历随主题切换而变化，不需要第二套调色板。

</details>
