# {{competitor_display}} 双周竞品动作报告

- 调研周期：{{start_date}} ~ {{end_date}}
- 调研时间：{{generated_at}}
- 排序规则：按可证明的发生时间升序
- 事实口径：只记录来源直接支持的已发生内容，不推断目的、人群或战略意图
- 本期记录：{{event_count}} 个事件，{{confirmation_summary}}

## 1. 本期事件时间线

| 日期 | ID | 已发生事件 | 分类 | 确认状态 |
|---|---|---|---|---|
| {{date}} | {{event_id}} | {{event_name}} | {{category}} | {{verification_status}} |

## 2. 事件详细记录

### {{event_id}}｜{{date}}｜{{event_name}}

- 分类：{{category}}
- 发生时间：{{occurred_at}}
- 时间依据：{{time_basis}}
- 发现时间：{{discovered_at}}

#### 已发生内容

- {{fact_1}}
- {{fact_2}}

#### 信源核验

| 项目 | 主信源 | 二次信源 |
|---|---|---|
| 来源名称 | {{primary_name}} | {{secondary_name}} |
| 来源归属 | {{primary_attribution}} | {{secondary_attribution}} |
| 来源类型 | {{primary_type}} | {{secondary_type}} |
| 来源时间 | {{primary_date}} | {{secondary_date}} |
| 链接 | [打开]({{primary_url}}) | [打开]({{secondary_url}}) |
| 证明内容 | {{primary_proven_fact}} | {{secondary_proven_fact}} |

- 来源关系：{{source_relationship}}
- 确认状态：{{verification_status}}
- 已确认范围：{{verified_scope}}
- 未确认事项：{{unverified_scope}}

## 3. 时间未确认或未纳入线索

### 3A. 待跟踪线索

| 线索 | 信号内容 | 原因 | 建议下期动作 |
|---|---|---|---|
| {{signal}} | {{content}} | {{reason}} | {{next_action}} |

### 3B. 已排除线索

| 线索 | 处理结果 | 排除理由 |
|---|---|---|
| {{signal}} | {{result}} | {{reason}} |

## 4. GIQ 核对

| 问题 | 结果 | 事件 ID / 说明 |
|---|---|---|
| {{question}} | {{result}} | {{note}} |

## 5. 信源总表

| ID | 信源与链接 | 归属 | 类型 | 来源时间 | 获取时间 | 支撑事件 | 证明内容 |
|---|---|---|---|---|---|---|---|
| {{source_id}} | [{{source_name}}]({{source_url}}) | {{attribution}} | {{type}} | {{source_date}} | {{fetched_at}} | {{events}} | {{proven_fact}} |

### 信源使用边界

| 信源类型 | 本报告如何使用 | 不能证明什么 |
|---|---|---|
| {{source_type}} | {{how_used}} | {{cannot_prove}} |

## 6. 信源采集执行台账

| ID | 信源/平台 | 入口或账号 | 检索动作 | 执行时间 | 候选数 | 状态 | 事件/失败原因 |
|---|---|---|---|---:|---:|---|---|
| {{ledger_id}} | {{platform}} | {{entry}} | {{action}} | {{executed_at}} | {{result_count}} | {{status}} | {{note}} |

## 7. 调研覆盖与缺口

| 信源组 | 必查渠道 | 已覆盖 | 部分/未覆盖 | 说明 |
|---|---|---|---|---|
| {{group}} | {{channels}} | {{covered}} | {{partial_or_uncovered}} | {{note}} |
