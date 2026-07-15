# 07. Feature Specifications

> Only one worked example exists so far. Describe every remaining screen/feature (channel selection, plan generation, todo board, analytics, etc.) using the same format.

## Feature: Campaign Creation

**Purpose**

Create a campaign from a business goal.

**Inputs**

- Goal
- Optional timeframe

**Outputs**

- Campaign
- Goal
- Plans
- Todos

## Feature: Toolbox

**Purpose**

A dashboard section where users browse the catalog of AI and marketing tools (e.g. post writers, image generators, launch schedulers), independent of any single campaign.

**Inputs**

- Category filter (ai, marketing, content, analytics, outreach, ...)
- Search query

**Outputs**

- List of Tools with name, category, description, status
- Entry point to connect/configure a tool (for `api` integration types)

## Feature: Tool Suggestions (per Plan)

**Purpose**

AI attaches relevant tools from the Toolbox to each generated Plan, and a specific tool can be assigned to a Todo to execute that step.

**Inputs**

- Plan (channel, objective)

**Outputs**

- Suggested Tools for the Plan, each with a reason
- `tool_id` assignment on relevant Todos

## TODO

- Feature: Channel Recommendation
- Feature: Channel Selection
- Feature: Plan Generation
- Feature: Todo Board / Execution
- Feature: Campaign Dashboard
- Feature: Analytics
