# 12. Database Schema

> Entities and fields are defined at the domain-model level (see [05 Domain Model](./05-domain-model.md)) but not yet as a formal schema. This file mirrors that field list — add column types, constraints, indexes, and migrations here as the schema is finalized.

## Entities

- Campaign
- Goal
- Channel
- Plan
- Todo
- Tool
- Plan_Tool (join)
- Agent
- Notification
- Activity

## Campaign

| Field | Notes |
|---|---|
| id | |
| name | |
| description | |
| status | |
| goal_id | FK → Goal |
| created_by | |
| created_at | |
| updated_at | |

## Goal

| Field | Notes |
|---|---|
| id | |
| campaign_id | FK → Campaign |
| objective | |
| target_metric | |
| target_value | |
| timeframe | |
| success_definition | |

## Channel

| Field | Notes |
|---|---|
| id | |
| campaign_id | FK → Campaign |
| name | |
| platform | |
| type | |
| reason | |
| selected | |

## Plan

| Field | Notes |
|---|---|
| id | |
| campaign_id | FK → Campaign |
| channel_id | FK → Channel |
| title | |
| objective | |
| status | |
| priority | |
| generated_by_ai | |

## Todo

| Field | Notes |
|---|---|
| id | |
| plan_id | FK → Plan |
| title | |
| description | |
| status | |
| priority | |
| tool_id | FK → Tool (nullable) |
| estimated_time | |
| output | |

## Tool

| Field | Notes |
|---|---|
| id | |
| name | |
| category | ai \| marketing \| content \| analytics \| outreach \| ... |
| description | |
| integration_type | internal \| api \| link-out |
| status | active \| beta \| disabled |
| created_at | |
| updated_at | |

## Plan_Tool

| Field | Notes |
|---|---|
| id | |
| plan_id | FK → Plan |
| tool_id | FK → Tool |
| reason | why the AI suggested this tool for this plan |
| generated_by_ai | |

## TODO

- Define `Agent`, `Notification`, and `Activity` field lists (not yet drafted).
- Add column types, constraints, and relationships/indexes for all tables above.
