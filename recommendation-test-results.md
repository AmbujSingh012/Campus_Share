# CampusShare — Day 3 Recommendation System

## Objective

Build a recommendation layer on top of the Day 2 matching engine.

The system compares a student's request with all available helpers,
calculates a match score, sorts helpers from highest to lowest score,
and returns the **Top 3** recommendations.

## Recommendation Flow

```text
Student Request
      ↓
Get Available Helpers
      ↓
Calculate Match Score
      ↓
Sort by Score
      ↓
Select Top 3
      ↓
Return Recommendations
```

## Matching Parameters

The Day 3 recommendation system uses the Day 2 scoring weights:

| Parameter | Weight |
|---|---:|
| Category | 30 |
| Location | 25 |
| Availability | 20 |
| Task Type | 15 |
| Reward Compatibility | 10 |
| **Total** | **100** |

## Example Request

- Category: calculator
- Location: Block A
- Availability: 2-4 PM
- Task Type: resource-sharing
- Reward: ₹20

## Sample Helpers

| Helper | Category | Location | Availability | Task Type | Reward |
|---|---|---|---|---|---:|
| Rahul | calculator | Block A | 2-4 PM | resource-sharing | ₹20 |
| Aman | calculator | Block B | 2-4 PM | resource-sharing | ₹20 |
| Ravi | calculator | Block A | 2-4 PM | resource-sharing | ₹25 |
| Neha | laptop | Block A | 2-4 PM | resource-sharing | ₹20 |
| Priya | calculator | Block A | 5-7 PM | resource-sharing | ₹20 |

## Expected Scores

- Rahul = 100/100
- Aman = 75/100
- Ravi = 90/100
- Neha = 70/100
- Priya = 80/100

Therefore, the Top 3 recommendations should be:

1. Rahul — 100/100
2. Ravi — 90/100
3. Priya — 80/100

## Test Cases

| Test Case | Expected Result | Status |
|---|---|---|
| One perfect helper | Highest score is first | PASS |
| Five helpers available | Only 3 are returned | PASS |
| Different scores | Highest score appears first | PASS |
| Category mismatch | Category points are not added | PASS |
| Location mismatch | Location points are not added | PASS |
| Availability mismatch | Availability points are not added | PASS |
| Reward mismatch | Reward points are not added | PASS |
| No helpers | Empty recommendation list is returned | PASS |

## Conclusion

Day 3 successfully adds a recommendation layer above the basic
matching engine. Instead of checking one helper at a time, CampusShare
can now rank multiple helpers and return the **Top 3 most suitable
helpers**.

This recommendation layer will later support the agentic matching
feature and backend integration.
