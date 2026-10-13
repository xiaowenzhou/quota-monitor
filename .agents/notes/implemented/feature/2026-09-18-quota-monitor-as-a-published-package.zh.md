# Agent Note: The quota monitor as a published dual-face package

Status: implemented

[English](2026-09-18-quota-monitor-as-a-published-package.md) | 中文

## Problem

额度监控最初是一个动态插件：`cordis.yml` 中的一行内联模块，由运行时求值，面板代码与 Host 代码同处一个文件。这种安排在各个方面都与本仓库自身的规则相抵触。动态插件无法声明由 Loader 校验的 `Config` schema，无法作为工作区的一部分被类型检查，无法发布由模块图排序的 Client 入口，也无法携带通过 tsconfig `paths` 解析的测试。它的面板文案住在文件里而不是 locale 字典里，因此 `verify-client-ui-copy` 看不见它。它的依赖对 `verify-package-dependencies`、`verify-client-packages` 以及各生成式目录同样不可见。

能力本身也有缺口，只是要等面板重建之后才显形。账户读取只懂钱包，不懂套餐窗口、预算池，也不懂按每次读取声明模式的网关。当时完全没有折叠历史，所以面板只能显示本进程见过的内容，更早的一概没有。也没有开销数字、预算、导出，以及区分"该提供商不提供账户接口"与"其接口失败"的办法。

要求是把它做成一个真正的包，其面板与本仓库的用量统计呈现一致，并承载两边功能集的并集，而不是在其中做取舍。

## Decision

**额度监控是一个双面包 `@deepseek-ai/dsh-extension-quota-monitor`。** Host 半边是发布 `ctx.quotaMonitor` 的 `TypertRemoteService`；Client 半边声明 `dsh.client`，注册一个侧栏导航项与一个 `main` 槽面板。两个面各有 `tsconfig.host.json` 与 `tsconfig.client.json` 叶配置，根配置仅作 solution，这是拥有不同 Host 与 Client 程序集的包所要求的。

**本包被豁免自动的 Client/Host 依赖处理。** 它与 `@deepseek-ai/dsh-api-session-controller`、`@deepseek-ai/dsh-api-workspace-controller` 一同列入 `CLIENT_FACE_EXCLUDE`。它的 Host 半边从 `@deepseek-ai/dsh-storage-domain` 值导入 `defineDomain` 与 `domainTable`，而该包是 `peerDependency`，因为领域设施必须与部署的存储后端共享同一个实例。Client/Host 处理会把 peer 摊平进 `dependencies`，从而允许出现第二个有状态 Host 服务的已安装副本——这正是该豁免所要防止的失败。

**面板是两边功能集的并集，按本仓库用量统计面板的布局呈现。** 一条带状态圆点的提供商选择导轨、一张以剩余数字开头的账户卡片、套餐窗口与预算池、三块带推算开销的合计瓦片、预算条、以当月自身峰值为深浅基准的周对齐月历、所选当天的 `provider · model` 明细、最活跃的会话，以及导出行。每个数字都来自 Remote 面；面板只做呈现推导，绝不计算 Host 未曾报告的总量。

**账户读取理解四种卡片框架，而不只是一种。** `QuotaAccountReading.mode` 让网关自行声明其回答是钱包、订阅窗口还是不限量额度，因为确有一个网关家族在同一协议下同时提供这三种。`QuotaAccountStatus` 把 `unsupported`（该提供商不提供账户接口）与 `blocked`（本插件拒绝了该请求）与 `unavailable`（上游失败）区分开来，因此卡片会说明读者面对的是三者中的哪一种。

**开销属于配置。本包不随附价目表。** `pricing.currency` 加 `pricing.rules` 是费率的唯一来源；没有规则时构建出的报告根本不带开销字段，而不是带一个 0。部分定价的数字连同其 `unpricedCalls` 计数一并披露，而不是藏在破折号之后；开销全部落在无法定价的调用上的预算报告 `unknown`，而不是让人安心的 0%。

**折叠历史来自已持久化的会话日志，并缓存在一个存储领域中。** `quota_usage` 是一张按会话 id 为键的带版本领域表，只保存计数与路由 id——绝不含提示文本，绝不含会话标题。每次刷新完整回放可读日志，替换旧结算并识别等长改写；统计修订号 3 使旧派生计数失效，而无需改变领域版本。完整回放、继承分叉与具体模型统计的决策见[模型统计笔记](2026-10-13-quota-model-accounting.zh.md)。

**导出走 Remote 面。** `exportUsage(request)` 返回 `QuotaExportDocument`，由浏览器通过 Blob 保存。新的回环路由会为连接已经承载的操作再引入一套自己的授权与生命周期。

**无法识别的网关会被无凭据地问一次它是什么。** `detectSub2apiPanel` 探测一份公开设置文档，且只接受严格匹配的回答；其 promise 按路由与 base URL 缓存，因此刷新循环无法把它变成重复流量。`detection.enabled`（默认 true）可将其完全关闭。

**账户、用量面板与导出这三类 Remote 方法就是面板在 Host 侧的全部表面。** `getSnapshot`、`getAccount`、`getUsage`、`exportUsage`、`setBalances` 与 `resetStats` 以 `@Remote` 声明；面板没有别的途径可以触达 Host。

## Verification

`tests/service.spec.ts` 在真实的 `llm/stream` waterfall 之上驱动用量记账、手动余额、统计重置，以及无适配器识别某路由时的账户读取。`tests/usage-fold.spec.ts` 钉住重复折叠、被改写的日志、路由继承、按天分桶、缓存命中率分母、按行/天/会话/窗口的开销、披露的未定价计数，以及每一种预算状态。`tests/adapters.spec.ts` 钉住每个提供商的响应语法与 HTTP 层的安全规则。`tests/pricing.spec.ts`、`tests/export.spec.ts`、`tests/config.spec.ts` 与 `tests/detection.spec.ts` 分别覆盖规则特异性、CSV 框架与公式防护、随附的空价目表连同两条 `assertConsistent` 拒绝路径，以及无凭据探测。`tests/panel.client.spec.tsx` 在 jsdom 下通过 Remote 面渲染面板，断言读者看到什么、某个手势触达哪个方法，以及被拒绝的 Remote 结果会保留上一次良好视图。

`tests/composition.spec.ts` 是 `packages/AGENTS.md` 对产品可见插件所要求的 REAL 组合套件：通过 Loader 启动一份仅供测试的 `cordis.yml`，插件按路径解析，断言 `ctx.quotaMonitor` 由 Loader 自身的激活发布、部署注册的路由能到达选择器、已持久化的会话日志会折叠进所服务的合计与导出文档，以及销毁会回卷该注册。

## Alternatives considered

**保持为动态插件。** 否决，因为 Problem 中列出的每道闸都看不见动态插件，也因为 Loader 无法校验配置的插件无法被安全地配置。静态包正是让 Config schema、locale 字典、各生成式目录与工作区类型检查得以适用的东西。

**拆成 `extension-quota-monitor` 与 `ui-quota-monitor`。** 这是本仓库对"Host 服务加浏览器面板"的标准形态，`ui-cordis` 与 `experimental-client-ui-agent-team` 都是先例。本次改动否决了它，因为两个半边共享同一套类型表面——快照、账户、用量报告与导出类型就是它们之间的 Remote 契约——而拆分将凭空多出第三个包的清单、tsconfig 叶配置、目录与文档，却不改变任一半边的行为。双面形态本身是合法的，两个被豁免的先例已在用。

**把 `defineDomain` 与 `domainTable` 登记进 `SAFE_HOST_DEPENDENCY_EXPORTS`。** 否决：该列表的注释禁止自动化 agent 添加条目，且其成员是重复安装确实安全的导出。把本包加进去是在消音这道闸，而不是回答它。

**把 storage-domain 这条边声明进 `PEER_REQUIRED_HOST_EXPORTS`。** 否决，因为那不诚实。`defineDomain` 与 `domainTable` 是纯构造器，它们的身份没有任何需要共享之处。这条边之所以是 peer，原因在*服务*而不在这两个函数，因此把它们标为 peer-required 导出，是为了满足检查器而把机制标错。

**放弃持久化折叠。** 否决，因为它与目标相抵触：没有这张领域表，面板只能报告本进程见过的内容，而那正是折叠历史要填补的缺口。

**随附一张内置价目表。** 否决，因为那是带有无声失败模式的硬编码可调参数：中转会按自己的费率转售同一个模型 id，公开价格会不经发布而变动，过期表格会在正确数字本该出现的位置渲染出一个自信而错误的数字。

**隐藏任何含未定价调用的总量。** 否决，因为它丢弃了已经知道的那部分。金额加未定价计数严格提供更多信息，且不会更具误导性。

**从新的回环 HTTP 路由提供导出。** 否决，因为 Remote 面已经以受认证、受生命周期管理的方式承载了正是这些数据。

## Consequences

- 本包发布 `.`、`./types`、`./client`、`./typert` 与 `./remote`，并出现在模块图、配置目录、Cordis 目录、能力接缝表与事件生产者/消费者矩阵中。以上每一项都是一道闸：本包形态变化而未同步其文档时，闸会失败。
- `verify-doc-graphs` 要求 `SERVICE_ROLES` 中有一条带完整性守卫的 `quotaMonitor` 条目，因此给本包新增服务却不分类会让文档闸失败，而不是默默从接缝表中省略它。
- 未配置任何价格的部署看到的与从前一致：token、余额与窗口，到处都没有开销列。开销是选择加入的，其完整性由部署自己负责。
- 一条价格规则为每个桶声明一个平坦的每百万费率，因此阶梯定价、批处理定价与上下文长度定价无法表达；处于此类方案的部署得到的是下界，不是账单。
- `quota_usage` 领域处于 `version: 2`，`compatibleVersions: [1]`，因为版本 1 的记录没有 `lastActiveAt`。这类会话在会话列表中以零活动时刻出现，直到其日志被重新折叠。
- 检测会为每个无法识别的提供商每进程增加一次无凭据请求，此后走缓存。认为不可接受的部署设置 `detection.enabled: false` 并显式指明适配器。
- 面板月历以所显示月份自身的峰值为深浅基准，而非绝对尺度，因此两个月份无法按颜色比较；绝对数字在单元格标签与导出中。
- Client 半边由 `tests/panel.client.spec.tsx` 在 jsdom 下检验。`packages/extensions/*/src/**` 被排除在逐文件覆盖率闸之外，因此那些组件路径由这套测试覆盖，而不是由覆盖率阈值覆盖。