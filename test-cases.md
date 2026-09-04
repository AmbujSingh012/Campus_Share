# CampusShare — Matching Test Cases

## 1. Purpose

These test cases verify whether the CampusShare matching logic produces sensible recommendations.

The tests focus on:
- Category
- Location
- Availability
- Task Type
- Reward
- Ranking
- Top 3 recommendations

## 2. Test Case 1 — Perfect Match

### Request

```text
Need a calculator in Block A from 2 PM to 4 PM.
```

### Helper

```text
Resource: Calculator
Location: Block A
Availability: 2 PM - 4 PM
Task Type: Resource Sharing
Reward: Compatible
```

### Expected Result

```text
Helper should receive a very high score.
Expected score: 100/100
```

## 3. Test Case 2 — Wrong Category

### Request

```text
Need a calculator.
```

### Helper

```text
Resource: Notebook
```

### Expected Result

```text
Helper should be filtered out.
Reason: Required category does not match.
```

## 4. Test Case 3 — Location Mismatch

### Request

```text
Need a calculator near Block A.
```

### Helper

```text
Resource: Calculator
Location: Block D
```

### Expected Result

```text
Helper may remain a candidate but should receive a lower
location score than a helper near Block A.
```

## 5. Test Case 4 — Availability Mismatch

### Request

```text
Need a calculator from 2 PM to 4 PM.
```

### Helper

```text
Resource: Calculator
Available: 6 PM - 8 PM
```

### Expected Result

```text
Helper should be filtered out if availability is mandatory.
Reason: Helper is not available during the requested time.
```

## 6. Test Case 5 — Multiple Suitable Helpers

### Request

```text
Need a laptop tomorrow afternoon near the library.
```

### Candidates

```text
Helper A → Laptop, near library, available
Helper B → Laptop, medium distance, available
Helper C → Laptop, far from library, available
Helper D → Notebook, near library, available
```

### Expected Result

```text
Helper D → Filtered out
```

The remaining helpers should be scored and ranked:

```text
1. Helper A
2. Helper B
3. Helper C
```

## 7. Test Case 6 — Top 3 Recommendation

### Candidates

```text
Helper A → 96
Helper B → 92
Helper C → 87
Helper D → 81
Helper E → 75
```

### Expected Result

The system should return:

```text
1. Helper A → 96
2. Helper B → 92
3. Helper C → 87
```

Helpers D and E should not appear in the Top 3 results.

## 8. Test Case 7 — Reward Mismatch

### Request

```text
Reward offered: ₹20/hour
```

### Helper

```text
Minimum acceptable reward: ₹50/hour
```

### Expected Result

The helper should receive a lower reward compatibility score or be filtered out if reward compatibility is mandatory.

## 9. Test Case 8 — No Suitable Helper

### Request

```text
Need a projector tomorrow from 10 AM to 12 PM.
```

### Available Resources

```text
Calculator
Laptop
Notebook
Charger
```

### Expected Result

The system should not return unrelated helpers.

```text
No suitable helper found.
```

## 10. Test Case 9 — Natural Language Request

### Request

```text
"I have a presentation tomorrow and need a laptop
near the library in the afternoon."
```

### Expected Requirements

```text
Resource: Laptop
Location Preference: Library
Time: Afternoon
Purpose: Presentation
```

### Expected Result

The future agentic system should identify these requirements and use them for matching.

## 11. Test Case 10 — Ranking Quality

| Candidate | Category | Location | Availability | Task Type | Reward | Expected |
|---|---|---|---|---|---|---|
| A | Excellent | Excellent | Excellent | Excellent | Excellent | Highest |
| B | Excellent | Good | Excellent | Excellent | Good | 2nd |
| C | Excellent | Poor | Excellent | Excellent | Good | 3rd |

### Expected Result

```text
A > B > C
```

The candidate with the highest overall matching score should be ranked first.

## 12. Acceptance Criteria

- [x] Matching parameters are defined.
- [x] Matching weights are defined.
- [x] Matching process is documented.
- [x] Candidate filtering is defined.
- [x] Ranking logic is defined.
- [x] Top 3 recommendation concept is defined.
- [x] User flow is documented.
- [x] Important test cases are documented.
- [ ] Recommendation API is implemented.
- [ ] Agentic matching is implemented.
- [ ] End-to-end integration is tested.

The implementation and integration tasks will be completed in later days of the project.
