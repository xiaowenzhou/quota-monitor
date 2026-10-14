# 多 Key 额度与路由（0.1.7）

使用当前 Web 的「用量统计」页面。顶部每个按钮只代表一个 provider；选中后在「此供应商的 Key」列表查看该 provider 的所有 key。

- 点击 key 行：查看该 key 的额度和重置窗口。
- 「设为当前」：切换该 provider 实际请求使用的 key，并固定为手动模式。
- 「添加 Key」：填写名称和 API Key，保存到服务端凭据库。名称可之后修改。
- 如果账户接口提供 name、email 或 key label，列表和账户详情会展示；没有提供时使用自定义名称或凭据引用。
- 「移出列表」只解除监控，不删除凭据；需先切走当前 key，并保留至少一个 key。

## 与模型配置联动

当前供应商和 Key 管理列表以宿主 LLM 注册表为准。模型插件新增、改名、禁用或删除 provider 后，额度页面通过同一拓扑事件更新；删除或禁用的 provider 不再接受额度刷新或 Key 管理请求。当前选中的 provider 或 Key 失效时，页面自动选择有效项，并丢弃旧请求的延迟响应。

过去的 Token 用量不会随 provider 删除：它们仍在下方统计中显示为「历史供应商」，可以查看历史统计，但没有当前账户或 Key 管理入口。移除 provider 不会删除凭据库中的源 Key；重新启用相同 provider 时仍可恢复已保存的 Key 监控配置。

## 路由

「手动固定」使用当前 key。「按剩余额度」在同一 provider 内选择可用额度最多的 key：订阅取最紧张的限额窗口，余额取可用比例；排除额度耗尽、读取失败、过期读数和近期请求失败的 key。保存自动路由会查询额度，并把该 provider 的 `apiKeyEnv` 连接到独立的活动凭据引用；源 key 不会被覆盖。当前模型不变。

「Jev 智能选择」使用 OpenRouter Decisions API，默认模型 `typesafe/jev-1.13`。界面填入 **Jev 使用的 OpenRouter API Key**；只发送匿名候选编号、剩余比例和重置时间，不发送对话或源 key。超时、无效或低置信度决策回退额度规则。Jev 调用会产生 OpenRouter 用量。没有提供 Jev key 时可先使用本地额度路由。

路由参数可在插件配置的 `routing` 中调整：`maxAgeMs`（读数有效期）、`cooldownMs`（请求失败后冷却）、`jevTimeoutMs`、`jevMinConfidence` 和 `jevModel`。受路由管理的同一 provider 请求串行使用活动凭据，保证并发切换不会串 key。已开始输出的请求不会自动重放；失败 key 的冷却影响后续请求。

## 供应商

新增 Command Code / GOAT，识别 `command`、`commandcode`、`command-code`、`command-goat` 和 commandcode.ai 域名。读取 `/alpha/whoami`、`/alpha/billing/credits` 中账户、组织、5 小时/周额度；只有接口返回月总额时计算月百分比。月剩余按接口原值显示，未提供重置时间时保留未知。

OpenCode Zen / Go 均识别，使用参考插件已验证的共享 `/zen/go/v1/usage` 读取 5 小时、周、月窗口。OpenRouter 保留 Management Key 账户余额查询；普通 key 被账户接口拒绝时查询 `/api/v1/key` 的限额、使用量和 label。无 key 限额不等同于账户余额无限。

这些订阅接口部分来自社区兼容实现，真实账户验证需供应商可用 key；界面会如实显示读取失败或未支持状态。

## 数据及回退

源 key 和 Jev key 存在宿主 credentials 服务，provider 的引用、名称和模式存到 `quota_keys` storage domain。快照和导出不包含 key 明文。若回退到旧插件，应把 provider 的 `apiKeyEnv` 改回需要使用的源凭据引用；移出监控的凭据仍保留在凭据库。

## 参考

- https://github.com/shxtmaker/dsh-token-quota （Command Code 兼容接口）
- https://github.com/xiaojiecode/opencode-helper （OpenCode Zen / Go 共享用量接口）
- https://openrouter.ai/docs/guides/community/jev （Jev Decisions API）
- https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key （普通 key 查询）
