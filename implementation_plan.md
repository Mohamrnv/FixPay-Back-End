# Feature Implementation: Negotiation & Pre-Contract Chat

This plan covers the addition of a messaging system for user interaction and a multi-step bidding logic to allow for price negotiations between Customers and Workers.

## Proposed Changes

### 1. Messaging Component [NEW]
To allow users to discuss tasks before accepting offers.

#### [NEW] [Message.model.js](file:///c:/Projects/FixPay/FixPay-Back-End-/src/Models/Message.model.js)
- Fields: `taskId`, `senderId`, `receiverId`, `content`, `createdAt`.
- Indexing: Compound index on `taskId`, `senderId`, and `receiverId` for fast retrieval of thread history.

#### [NEW] [Message.controller.js](file:///c:/Projects/FixPay/FixPay-Back-End-/src/Modules/Message/message.controller.js)
- `sendMessage`: Validates that the users are either the task owner or a worker who has submitted an offer.
- `getTaskMessages`: Retrieves the conversation history for a specific task between two users.

#### [NEW] [Message.Router.js](file:///c:/Projects/FixPay/FixPay-Back-End-/src/Routes/Message.Router.js)
- Routes for sending and getting messages.
- Protected by `verifyToken`.

---

### 2. Negotiation (Counter-Bidding) Logic

#### [MODIFY] [Offer.model.js](file:///c:/Projects/FixPay/FixPay-Back-End-/src/Models/Offer.model.js)
- Add `negotiationHistory`: Array of `{ price: Number, message: String, bidBy: ObjectId, createdAt: Date }`.
- Update `price` and `message` to always reflect the *latest* proposed terms.
- Add `status` enum extension: `pending`, `accepted`, `rejected`, `countered`.

#### [MODIFY] [offer.controller.js](file:///c:/Projects/FixPay/FixPay-Back-End-/src/Modules/Offer/offer.controller.js)
- `counterOffer`: A new endpoint allowing the Customer to propose a different price.
    - Updates `status` to `countered`.
    - Adds entry to `negotiationHistory`.
- Update `acceptOffer`: Ensure it accepts the *latest* price in the offer object.
- `updateOfferPrice` (Worker): Allowing the worker to respond to a customer's counter.

---

## Technical Considerations
- **Authorization**: Only the Task owner can "Counter" an offer. Only the Worker who created the offer can respond to a counter.
- **Task Lifecycle**: A task must still be in `open` status for negotiations to happen.
- **Relational Integrity**: If the Task owner accepts *any* offer (or counter-offer), all other offers for that task are automatically rejected.

## Verification Plan
1. **Chat Test**: Worker sends a message to Customer -> Customer views message -> Customer responds.
2. **Negotiation Test**:
    - Worker creates offer for 100 EGP.
    - Customer counters with 80 EGP.
    - Worker counters with 90 EGP.
    - Customer accepts 90 EGP.
    - Verify Task status changes to `assigned` and final price is 90 EGP.
