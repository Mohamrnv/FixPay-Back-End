import { Router } from "express";
import { checkSchema } from "express-validator";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "../Middlewares/validationSchema.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import {localFileUpload} from '../multer/multer.js'
import { normalizeAuthFields } from "../Middlewares/normalizeInput.js";
import express from "express"
import {
    editUser,
    getAllUsers,
    getUserById,
    deleteUser,
    register,
    login,
    confirmEmail,
    resendConfirmationOtp,
    logout,
    forgotPassword,
    resetPassword,
    resendResetPasswordOtp,
    profileImage,
    restoreDeletedAccount,
    assignAdmin
} from "../Modules/User/user.controller.js";

const router = Router();


router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.patch("/:id", verifyToken, editUser);
router.delete("/:id", verifyToken, deleteUser);
router.patch("/assign-admin/:id", verifyToken, allowedTo(Roles.admin), assignAdmin);

router.post("/register", normalizeAuthFields, checkSchema(registerSchema), register);
router.post("/login", normalizeAuthFields, checkSchema(loginSchema), login);
router.post("/logout", verifyToken, logout);
router.post("/confirmEmail", verifyToken, confirmEmail);
router.post("/resend-confirmation-otp", verifyToken, resendConfirmationOtp);
router.post(
  "/upload",
verifyToken,
  localFileUpload({ customPath: "user" }).single("file",1),
  profileImage
);

router.post("/forgotPassword", normalizeAuthFields, checkSchema(forgotPasswordSchema), forgotPassword); 
router.post("/resend-resetpassword-otp", normalizeAuthFields,checkSchema(forgotPasswordSchema), resendResetPasswordOtp);
router.post("/resetPassword", normalizeAuthFields, checkSchema(resetPasswordSchema), resetPassword);


export default router;
