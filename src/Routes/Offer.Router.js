import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { offerValidationSchema } from "../Modules/Offer/offer.validation.js";
import { createOffer, acceptOffer, counterOffer, respondToCounter } from "../Modules/Offer/offer.controller.js";

const router = Router();

router.patch("/:offerId/accept", verifyToken, allowedTo(Roles.customer), acceptOffer);
router.patch("/:offerId/counter", verifyToken, allowedTo(Roles.customer), counterOffer);
router.patch("/:offerId/respond", verifyToken, allowedTo(Roles.worker), respondToCounter);
router.post("/",
    verifyToken,
    offerValidationSchema,
    createOffer
);

export default router;
