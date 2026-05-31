# Walkthrough - Worker Recommendation Feature

This walkthrough outlines the implementation and testing of the worker recommendation system based on location and rating.

## Changes Made

### 1. Geospatial Helper
- Created [geo.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Utils/geo.js) under `src/Utils/` containing the `getHaversineDistance` function. It calculates the straight-line (geodesic) distance in kilometers between two geographic coordinates.

### 2. Task Controller & Route
- Implemented the `getRecommendedWorkers` controller inside [task.controller.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Modules/Task/task.controller.js):
  - Fetches the task and checks if the requester is the owner of the task (the customer) or an admin.
  - Verifies the task coordinates exist.
  - Queries active, non-suspended, non-banned workers (`role === Roles.worker`) who have submitted an offer for the task.
  - Computes the straight-line distance to each worker, sorts them ascending, and takes the top nearest results.
  - Queries the OSRM project router API concurrently to fetch real-world driving distance and duration for the top candidates, fallback-proofing against API timeouts/errors.
  - Returns worker rating, coordinates, address, straight-line distance, driving metrics, and the offer details (price and message).
- Registered the endpoint `GET /:taskId/recommend-workers` under [Task.Router.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Routes/Task.Router.js).

### 3. Integration Tests
- Created [recommendation.test.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/tests/recommendation.test.js) under `tests/` which sets up mock database entities (customer, workers at different positions/categories with various ratings) and executes assertions verifying the endpoint response:
  - Correct candidate matching by category.
  - Proximity sorting correctness.
  - Inclusion of worker ratings in recommendations.
  - Driving route info retrieval from mock routing endpoints.
  - Appropriate error reporting for missing coordinate metadata.
  - High-fidelity authentication and authorization enforcement (both role level and ownership level).

---

## Validation Results

Running the automated test suite executes all assertions successfully:
```bash
npx cross-env NODE_OPTIONS=--experimental-vm-modules jest tests/recommendation.test.js
```

### Test Output:
```text
PASS tests/recommendation.test.js (9.394 s)
  Worker Recommendation API
    √ should successfully recommend the nearest workers and display their rating (22 ms)
    √ should forbid non-customer roles from accessing task recommendations (20 ms)
    √ should forbid other customers (non-owners) from accessing task recommendations (24 ms)
    √ should return error if task coordinates are missing (18 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        9.502 s
```
All tests passed, demonstrating robust security boundaries and accurate geographic ranking!

### 4. Postman Collection
- Added the `Get Recommended Workers` endpoint (`GET /api/tasks/:taskId/recommend-workers`) under the Task Module in the [FixPay_Postman_Collection.json](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/FixPay_Postman_Collection.json) file.
- The collection can be imported directly into Postman to test registration/login, task creation with location coordinates, and querying the recommendation endpoint.
