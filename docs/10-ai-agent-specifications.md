# 10. AI Agent Specifications

Document each AI agent's inputs and outputs.

## Goal Analyzer

**Input**

- Goal

**Output**

- Audience
- Objectives
- Validation
- Suggested KPIs

## Channel Research Agent

**Input**

- Goal
- Audience

**Output**

- Recommended channels
- Reasoning
- Confidence

## Campaign Generator

**Input**

- Goal
- Selected channels

**Output**

- Campaign
- Plans
- Todos

## Tool Recommender Agent

**Input**

- Plan (channel, objective, todos)

**Output**

- Suggested tools from the Toolbox catalog
- Reasoning per suggestion
- Confidence
- Optional `tool_id` assignment on individual todos
