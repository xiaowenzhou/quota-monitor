# Agent Note：按具体模型与结算统计用量

Status: implemented

[English](2026-10-13-quota-model-accounting.md) | 中文

## Problem

[已发布插件的决策](2026-09-18-quota-monitor-as-a-published-package.zh.md)提供了持久化用量与配置费率，但只比较日志长度的续扫无法识别等长修正。只读取消息会漏掉有费用的尝试，也无法识别当前日志的权威路由。分叉继承历史和重复结算可能重复计数。面板已有每日模型行，但缺少今日、本月和累计的模型对比以及有效费率展示。

## Decision

每次刷新完整回放每个可读会话，以 `request/header.config` 为路由；无请求头的旧日志才回退到 `request/context`。对 `assistant/message` 和 `assistant/attempt`，读取直接携带的 usage 或流中最后一个 usage 样本。同一 turn/step 的后续结算替换之前的结算；匹配的 `llm/retry-started` 边界开启独立尝试，不相关重试不影响原结算。分叉只计入最后一个继承型 `session/end-seed` 标记之后的事件，普通恢复标记保留历史。推理仍包含在输出中，四类 token 桶互不重叠。

完整回放替代先前的游标续扫统计决策。存储域保留版本 2 及版本 1 兼容性，增加统计修订号 3，忽略旧修订缓存。回放结果相同则不重复写入；不可读会话保留当前缓存。宿主本地日期改变时重新生成日历范围，即使没有新请求。

按 `provider · model` 聚合今日、本月与累计范围，每行携带四类 token、调用次数、缓存命中率与可选费用。历史费用按使用当天匹配的规则计算，展示单价采用今日有效规则。继续采用部署配置或导入的费率，因为中转商价格不同。明确披露未定价调用，缺失费率不能当作免费。Client 请求代次防止慢响应覆盖刚切换的提供商。

将插件两侧的叶项目纳入根 Host 与 Client 聚合，让标准 Typert 生成器发现插件并生成带 `models` 的 Remote 结果。

## Verification

最终完整插件套件的 13 个测试文件、197 个测试全部通过。统计与正式 Loader 组合套件还单独通过 14 个测试，包括不相关重试回归。Host 与 Client TypeScript 检查通过；标准 `WorkspaceTypertGenerator` 生成带模型和费率的 Host/Remote schema，插件两侧 bundle 均构建成功。

回归覆盖权威请求头、流 usage、跨日和跨路由的结算替换、匹配及不相关重试、嵌套继承分叉、等长改写、旧缓存失效、午夜切换、按日期计价与未定价模型。Client 测试覆盖模型范围、单价与切换提供商后的迟到响应。Loader 组合验证正式服务返回模型行，以及 400 输入、100 输出、50 缓存读取 token 的 USD 0.000605 估算费用。

通过 PluginManager 将 `0.1.6-alpha.1.local.6246bcaa8ea4` 安装到正在使用的 `desktop` profile，保留监控与价格配置。安装后的 Host、Client 和 Remote 文件哈希与构建包一致。用户授权重启 Desktop/Host 后，既有 `http://127.0.0.1:19387` 的已认证 `quotaMonitor/getUsage` 返回 HTTP 200，汇总 105 个会话、18 个模型，并携带已配置费率和预估费用。Chromium 验证模型表真实渲染、全部十个列标题、今日／本月／累计切换、费用估算说明和额度 RPC 的 HTTP 200 响应，控制台和页面均无报错。证据见 `.artifacts/quota-desktop-post-restart-verification.json` 与 `.artifacts/quota-desktop-installed-panel.png`。浏览器预览说明无法保存确认状态；仅在隔离验收浏览器内收起其遮罩并解除根节点 inert 状态，以检查额度面板。该检查不验证预览说明的确认流程。

## Alternatives considered

- 保留日志长度游标：等长改写和旧结算替换会留下过时用量。前缀指纹可作为未来优化，但需要新的持久化契约。
- 累加每个 usage 样本：尝试和最终消息可能对同一次调用重复结算。
- 内置官方标价：部署中转费率可能不同，过时标价会产生误导。继续以现有带日期的自定义规则和本地导入为准。
- 将存储域升到版本 3：后端可能已经打开版本 2 表，只需统计修订号即可使派生缓存失效。

## Consequences

每轮刷新完整读取和回放会话日志。大日志库会增加 CPU 与 I/O；不变结果只省去写入，不省去回放。提供商没有在持久化事件中上报的用量无法恢复。费用采用现有每百万 token 费率结构，属于估算；阶梯、税费、订阅固定费用与结算舍入可能与账单不同。模型汇总在 wire 上保持可选以兼容旧调用者和测试夹具，当前单价不会反向重算历史。
