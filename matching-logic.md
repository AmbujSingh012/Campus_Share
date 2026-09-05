# CampusShare — Matching Logic

## 1. Objective

The goal of the CampusShare matching system is to connect a student's request with the most suitable available helper or resource owner.

The system should:
1. Understand the requirements of the task.
2. Find available and relevant helpers.
3. Filter out unsuitable helpers.
4. Calculate a matching score.
5. Rank the suitable helpers.
6. Recommend the top 3 helpers.

This matching system will later become the foundation for the agentic matching feature.

## 2. Matching Parameters

| Parameter | Weight | Description |
|---|---:|---|
| Category | 30 | Checks whether the helper has the required resource/skill |
| Location | 25 | Checks how close the helper is to the requester |
| Availability | 20 | Checks whether the helper is available |
| Task Type | 15 | Checks whether the helper can perform the requested task |
| Reward Compatibility | 10 | Checks whether the requested reward is acceptable |
| **Total** | **100** | Maximum matching score |

## 3. Matching Score

```text
Matching Score =
Category Score
+ Location Score
+ Availability Score
+ Task Type Score
+ Reward Compatibility Score
```

The maximum score is 100.

### Example

If a helper has:
- Correct category: 30/30
- Same location: 25/25
- Available at requested time: 20/20
- Correct task/resource type: 15/15
- Acceptable reward: 10/10

Then:

```text
30 + 25 + 20 + 15 + 10 = 100
```

## 4. Matching Process

```text
Student request
      ↓
Identify requirements
      ↓
Find available helpers
      ↓
Filter unsuitable candidates
      ↓
Calculate matching score
      ↓
Rank candidates
      ↓
Select Top 3
      ↓
Recommend suitable helpers
```

## 5. Requirement Identification

Example request:

```text
"I need a calculator near Block A from 2 PM to 4 PM."
```

The system identifies:

```text
Category: Calculator
Location: Block A
Availability: 2 PM - 4 PM
Task Type: Resource Sharing
Reward: Based on request
```

## 6. Candidate Filtering

Candidates that clearly do not satisfy mandatory requirements are removed.

Example:

```text
Required resource = Calculator
Helper resource = Notebook
```

The helper is removed because the category does not match.

Another example:

```text
Required time = 2 PM - 4 PM
Helper available = 6 PM - 8 PM
```

The helper is removed because the availability does not match.

## 7. Scoring and Ranking

Example:

| Helper | Category | Location | Availability | Task Type | Reward | Total |
|---|---:|---:|---:|---:|---:|---:|
| Helper A | 30 | 25 | 20 | 15 | 10 | **100** |
| Helper B | 30 | 20 | 20 | 15 | 10 | **95** |
| Helper C | 30 | 15 | 20 | 15 | 8 | **88** |
| Helper D | 30 | 10 | 20 | 15 | 8 | **83** |

The candidates are sorted from highest score to lowest score.

## 8. Top 3 Recommendation

The system returns the three highest-ranked suitable helpers.

Example:

```text
1. Rahul — Score: 100
2. Aman — Score: 95
3. Priya — Score: 88
```

Each recommendation should include a short explanation.

Example:

```text
Rahul — 100%
Reason:
Same location, available at the requested time,
and provides the required calculator.
```

## 9. Future Agentic Matching

The basic matching system will later be extended into an agentic matching system.

Example:

```text
"I need a laptop for my project tomorrow afternoon.
Someone near the library would be preferred."
```

The agent can identify:

```text
Resource → Laptop
Time → Tomorrow afternoon
Location Preference → Library
Purpose → Project
```

The agent can then:
1. Parse the request.
2. Search candidates.
3. Apply matching rules.
4. Rank candidates.
5. Select the best matches.
6. Explain the recommendations.

## 10. Day 1 Deliverable

Day 1 focuses on designing and documenting the matching logic and user flow.

The recommendation API, agentic implementation, payment integration, and end-to-end implementation will be developed in later stages.
