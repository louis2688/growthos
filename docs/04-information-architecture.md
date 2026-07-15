# 04. Information Architecture

## Objects

- Campaign
- Goal
- Channel
- Plan
- Todo
- Tool
- Agent
- Workspace
- User

## Relationships

```
Campaign
    │
    ├── Goal
    ├── Channel
    ├── Plan
    │      ├── Todo (→ Tool)
    │      └── Tool (suggested, many-to-many)
    │
Toolbox (catalog of all Tools, not scoped to a Campaign)
```

`Tool` lives in two places in the IA:

- **Toolbox** — the global catalog, surfaced as its own dashboard section, independent of any campaign.
- **Plan suggestions** — a many-to-many link where AI attaches relevant tools from the catalog to a Plan; a `Todo` can then reference one specific `Tool` (`tool_id`) to execute that step.

> Note: `Agent`, `Workspace`, and `User` are listed as objects in scope but their relationships to `Campaign` still need to be mapped out (see [05 Domain Model](./05-domain-model.md) for full field-level detail on Campaign, Goal, Channel, Plan, Todo, and Tool).
