# SPECIFICATION TEMPLATES (SDD)

## 1. Light Spec (CRUD đơn giản, UI component, bug fix)
```markdown
# Feature: [Tên tính năng]
Status: Draft | Review | Approved
Author: [Tên] | Date: [YYYY-MM-DD]

## User Story
As a [user type], I want to [action] so that [benefit].

## Acceptance Criteria (EARS notation)
WHEN [trigger] THE SYSTEM SHALL [action].
WHEN [error trigger] THE SYSTEM SHALL [error handling].

## Technical Notes
- API endpoint: [METHOD] /api/v1/[resource]
- DB changes: [none / add column X to table Y]
- Validation: [list input validation rules]
```

---

## 2. Standard Spec (Feature có business logic)
```markdown
# Feature: [Tên tính năng]
Status: Draft | Review | Approved
Author: [Tên] | Reviewer: [Tên] | Date: [YYYY-MM-DD]
Priority: High | Medium | Low

## 1. Business Context
[Giải thích tại sao feature này cần tồn tại]

## 2. User Stories
- Story 1 (Happy Path): As a [user], I want to [action] so that [benefit].
- Story 2 (Edge Case): As a [user], when [condition], I want to [action].

## 3. Acceptance Criteria (EARS)
- WHEN [trigger] THE SYSTEM SHALL [action].
- WHEN [error condition] THE SYSTEM SHALL [error action].

## 4. API Contract & Data Schema
Endpoint: [METHOD] /api/v1/[resource]
Request: { ... }
Response: { success: true, data: { ... } }

## 5. Technical Constraints & Out of Scope
```
