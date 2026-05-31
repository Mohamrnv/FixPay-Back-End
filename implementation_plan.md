# Worker Recommendation based on Location and Rating

This plan covers adding a recommendation endpoint that suggests the nearest workers to a given task, based on the task's category and geographic coordinates. The results are ranked by proximity, displaying each worker's profile details, address, straight-line distance, OSRM driving distance and duration, and their rating.

## Proposed Changes

### Geolocation & Task Modules

#### [NEW] [geo.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Utils/geo.js)
- Create a reusable geospatial utility file with the Haversine formula to compute geodesic (straight-line) distance in kilometers between two coordinates.

#### [MODIFY] [task.controller.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Modules/Task/task.controller.js)
- Implement `getRecommendedWorkers`:
  1. Fetch the target task by `taskId`.
  2. Perform authorization checks (only the task's customer or an admin can access this).
  3. Validate that the task has valid geographic coordinates (`locationCoords`).
  4. Query the `Users` collection for active workers (`role: Roles.worker`) in the task's category (`categoryId`), filtering out deleted, banned, or suspended workers, and filtering to those who have set `locationCoords`.
  5. Calculate straight-line distance for each worker and sort ascending.
  6. Call the Open Source Routing Machine (OSRM) driving route API concurrently for the top 5 nearest workers to get estimated driving distance and time.
  7. Return the recommended workers along with their coordinates, address, rating, straight-line distance, and estimated driving metrics.

#### [MODIFY] [Task.Router.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/src/Routes/Task.Router.js)
- Add the recommendation route:
  `router.get("/:taskId/recommend-workers", verifyToken, allowedTo(Roles.customer, Roles.admin), getRecommendedWorkers);`

### Testing

#### [NEW] [recommendation.test.js](file:///c:/New%20folder/Graduation%20Project/FixPay/FixPay-Back-End/tests/recommendation.test.js)
- Create integration tests covering:
  - Successful recommendation of workers matching a task's category.
  - Correct calculation and sorting of distances (nearer workers should come first).
  - Showing worker ratings in the response payload.
  - Proper authorization checks (only task customer and admins allowed).
  - Validation checks when a task doesn't have coordinates.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify the new endpoint behavior, including distance ranking, category filtering, and authorization.

### Manual Verification
- We can perform manual API validation by starting the development server and querying the GET `/api/tasks/:taskId/recommend-workers` endpoint using Postman or curl.
