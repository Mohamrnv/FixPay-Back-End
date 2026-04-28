import { Router } from "express";
import { checkSchema } from "express-validator";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "../Middlewares/validationSchema.js";
import { localFileUpload, memoryFileUpload } from '../multer/multer.js';
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { normalizeAuthFields } from "../Middlewares/normalizeInput.js";
import express from "express";
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
  assignAdmin,
  suspendUser,
  googleLogin,
  completeProfile,
  verifyIdentity
} from "../Modules/User/user.controller.js";

const router = Router();

router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.patch("/:id", verifyToken, allowedTo(Roles.admin), editUser);
router.delete("/:id", verifyToken, allowedTo(Roles.admin), deleteUser);
router.patch("/assign-admin/:id", verifyToken, allowedTo(Roles.admin), assignAdmin);
router.patch("/suspend/:id", verifyToken, allowedTo(Roles.admin), suspendUser);

router.post("/register", normalizeAuthFields, checkSchema(registerSchema), register);
router.post("/login", normalizeAuthFields, checkSchema(loginSchema), login);
router.post("/logout", verifyToken, logout);
router.post("/confirmEmail", verifyToken, confirmEmail);
router.post("/resend-confirmation-otp", verifyToken, resendConfirmationOtp);
router.post("/complete-profile", verifyToken, completeProfile);
router.post("/google-login", googleLogin);

router.post("/verify-identity",
  verifyToken,
  memoryFileUpload().fields([
    { name: "id_image", maxCount: 1 },
    { name: "live_image", maxCount: 1 }
  ]),
  verifyIdentity
);

router.post(
  "/upload",
  verifyToken,
  localFileUpload({ customPath: "user" }).single("file"),
  profileImage
);

router.post("/forgotPassword", normalizeAuthFields, checkSchema(forgotPasswordSchema), forgotPassword);
router.post("/resend-resetpassword-otp", normalizeAuthFields, checkSchema(forgotPasswordSchema), resendResetPasswordOtp);
router.post("/resetPassword", normalizeAuthFields, checkSchema(resetPasswordSchema), resetPassword);

export default router;
