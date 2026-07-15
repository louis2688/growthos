# 05. Domain Model

## Final Data Model

```
Campaign
│
├── Goal
│
├── Channels
│
├── Plans
│     ├── Channel
│     ├── Todos (→ Tool)
│     └── Tools (suggested)
│
└── Metrics

Toolbox
│
└── Tools (global catalog, independent of any Campaign)
```

## 1. Campaign

The top-level container.

```
Campaign
---------
id
name
description
status

goal_id

created_by
created_at
updated_at
```

**Example:** Launch AI Budgeting App

## 2. Goal

One campaign has one primary goal.

```
Goal
---------
id

campaign_id

objective
target_metric
target_value
timeframe

success_definition
```

**Example**

| Field | Value |
|---|---|
| Objective | Acquire Users |
| Metric | Signups |
| Target | 100 |
| Timeframe | 30 Days |

## 3. Channel

Represents where you'll reach the audience.

```
Channel
---------
id

campaign_id

name
platform
type

reason

selected
```

**Examples**

- **r/personalfinance** — Platform: Reddit. Reason: Users actively discuss budgeting.
- **Product Hunt** — Platform: Independent. Reason: Ideal for new software launches.

## 4. Plan

Represents the strategy for a selected channel.

```
Plan
---------
id

campaign_id

channel_id

title

objective

status

priority

generated_by_ai
```

**Examples**

- Plan: Reddit Outreach
- Plan: Product Hunt Launch
- Plan: Influencer Outreach

## 5. Todo

Execution tasks inside a plan.

```
Todo
---------
id

plan_id

title

description

status

priority

tool_id

estimated_time

output
```

> `tool` was a free-text field; it's now `tool_id` (FK → Tool), pointing at a specific entry in the Toolbox catalog.

**Example sequence**

Research subreddit rules → Write educational post → Generate image → Publish → Reply to comments

## 6. Tool

A catalog entry for an AI or marketing tool that can be suggested on a Plan and assigned to a Todo. Tools live in the global **Toolbox** and are not scoped to a single campaign.

```
Tool
---------
id

name
category        (ai | marketing | content | analytics | outreach | ...)
description

integration_type   (internal | api | link-out)
status             (active | beta | disabled)

created_at
updated_at
```

**Examples**

- Post Writer — category: ai, integration_type: internal — drafts educational posts for a subreddit.
- Image Generator — category: ai, integration_type: internal — generates supporting graphics.
- Product Hunt Scheduler — category: marketing, integration_type: api — schedules a PH launch.

## 7. Plan ↔ Tool (suggestion)

Join table representing the AI's suggested tools for a given Plan. Many-to-many: a Plan can have several suggested tools, and a Tool can be suggested across many plans.

```
Plan_Tool
---------
id

plan_id
tool_id

reason          (why the AI suggested this tool for this plan)
generated_by_ai
```
