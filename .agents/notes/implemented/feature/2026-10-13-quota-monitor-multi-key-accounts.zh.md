# Agent Note: Quota account readings per monitored credential

Status: implemented

[English](2026-10-13-quota-monitor-multi-key-accounts.md) | 中文

## Problem

一次账户读取按 provider route 解析一份凭据：`monitors.<id>.credentialRef`，否则该 route 自己的 `apiKeyEnv`。对一个 route 只用一份凭据付费的部署而言这是正确的 key，但对在同一网关下持有多个 key 的部署则不是：这类部署一次只能盯住其中一把 key，而面板没有地方说明其余 key 还剩多少，因为 chip、卡片和缓存读数都以 route 为键。

## Decision

`monitors.<id>.credentialRefs` 列出该 route 受监控的多把凭据。非空列表取代该 route 的 `credentialRef` 并按书写顺序读取；缺省或空字段保持单槽位行为，这也是所有既有条目以及所有没有条目的 route 继续沿用的行为。`assertConsistent` 按凭据引用文法校验每个名字并拒绝重复名字，因此拼写错误在加载时失败，而不是变成一次静默的 `not-configured` 读数。

Host 为每个槽位读取一份账户。槽位 = route id 加上它可选的凭据引用，这一对就是缓存键，因此每把 key 保留自己的读数。后台轮读取每个 route 的每个受监控凭据——route 之间并行、同一 route 内的槽位串行，从而对同一网关只保留一个在途请求；打开面板则读取尚无轮次读过的槽位。active 定时器仍只读当前聚焦槽位，因为它的职责是让屏幕上的读数保持新鲜。适配器用槽位的引用名解析它要发送的 key；`context.apiKey` 仍是该 route 自己的推理凭据，因此受监控的 key 只增加一份读数，不会取代 route 用于模型调用的凭据。

在 wire 上，`QuotaProviderEntry` 携带 `credentialRefs` 与 `accounts`（至今读到的读数，按槽位顺序），`QuotaAccount` 标明它取自哪个 `credentialRef`。两个 Remote 方法返回新快照：`readPendingAccounts` 读尚无轮次读过的槽位，`refreshAccounts` 重读每个受监控凭据。`getAccount` 接受可选的 `credentialRef`，缺省落到该 route 的第一个受监控凭据——这也正是 `readPendingAccounts` 中“缺省引用”所指的那把 key。

面板按 route 分组渲染 chip。单槽位 route 保持提供商名称并显示该槽位的额度数字。多槽位 route 只渲染一次 route 名称，随后每个 key 一个 chip，各自显示该 key 的数字——余额读数显示金额，订阅读数显示最紧的计划窗口百分比，不限量显示不限量标记。点击 chip 即读取该 key，读数卡片只在 route 有多个槽位时于 meta 行标出该 key，因此单 key route 的呈现与改动前完全一致。

## Verification

插件全量测试 14 个文件 208 个用例全绿。新增 Host 覆盖：读取同一 route 的多把 key、每把按自己的键缓存、一把失败不影响其他、未给引用时落到第一个受监控凭据，以及 `providerEntries` 报告 `credentialRefs` 与 `accounts`；新增面板覆盖：打开面板时对双 key route 每个 chip 各有一个数字，点击 chip 会读取该 key，且表头刷新会重读全部 key。Host 与 Client 的 TypeScript 构建通过，生成的 Typert wire schema 带有两个新方法与新字段。

`0.1.6-alpha.1.local.054d6414e516` 通过 PluginManager 装入 `desktop` profile，profile 的 `cline-pass` monitor 改为三条凭据引用。重启该应用后，在已认证的 `http://127.0.0.1:19387` 上 `refreshAccounts` 为 `cline-pass` 返回三份读数——同一套餐、每把 key 的窗口各不相同（five-hour/monthly/weekly 分别为 100/70/40、100/61/41、8/75/89）——这正是每把 key 都用自己凭据去查询的证据。另用 headless Chromium 连到运行中的应用渲染面板：route 名称只出现一次，三个 chip 分别为 `CLINE_PASS_API_KEY 100%`、`CLINE_PASS_15_KEY 100%`、`CLINE_PASS_ME_KEY 89%`；点击中间 chip 只有它自己的 `aria-pressed` 变为 true，并发出带 `credentialRef: "CLINE_PASS_15_KEY"` 的 `quotaMonitor/getAccount`，随后卡片显示该 key 的 100/61/41 窗口，页面与 console 均无错误。证据见 `.artifacts/quota-desktop-multi-key-panel.png` 与 `.artifacts/quota-desktop-multi-key-top.png`。同一产物也装入了 `web` profile，该 profile 已报告新版本，浏览器见到它之前需要重启。

## Alternatives considered

- 一个 route 一份凭据、每把 key 复制一条 route：否决，因为同一网关发放多把 key 的部署需要多条 provider route，重复模型端点，并让面板比较 route 而不是 key；同时流用量按 route 折叠，只会指向承载该调用的那条 route。
- 每个 key 一条 provider entry：否决，因为用量折叠、定价和流的 route id 都以 route 为作用域；key 这个维度属于 route 内部，而不是取代 route。
- 只有点开 chip 或卡片时才读取该 key：否决，因为 chip 存在的意义就是无需交互地给出数字，读数必须先于显示。
- 每个 active 定时器周期重读全部 key：否决，因为该周期用于让聚焦读数保持新鲜；每分钟读全部 key 会让网关流量翻倍，而这些数字后台轮已经更新。

## Consequences

一个受监控 N 把凭据的 route 每个后台轮会做 N 次账户读取，每把 key 一次已认证请求，因此同一网关下挂很多 key 的部署会放大端点流量并可能触及网关限流；同一 route 内串行读取把并发限制为对每个网关一个在途请求。每个槽位的读数单独缓存，直到被轮次、打开面板或手动刷新取代，因此 chip 可能落后端点一个周期。key 只以引用名配置：监控器通过 credentials 服务解析它们，自身从不读取或保存密钥材料。
