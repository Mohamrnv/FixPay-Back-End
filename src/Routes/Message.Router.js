import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { sendMessage, getConversation } from "../Modules/Message/message.controller.js";

const router = Router();

// All chat routes require authentication
router.use(verifyToken);

router.post("/", sendMessage);
router.get("/:otherUserId", getConversation);

export default router;
