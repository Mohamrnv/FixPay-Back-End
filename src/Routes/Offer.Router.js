import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { offerValidationSchema } from "../Modules/Offer/offer.validation.js";
import { createOffer } from "../Modules/Offer/offer.controller.js";

const router = Router();

router.post("/",
    verifyToken,
    offerValidationSchema,
    createOffer
);

export default router;
