import { Router } from "express";
import { requireAuth } from "../../api/middleware/auth";
import { attachOperatorOrgScope } from "../../api/middleware/operatorOrgScope";
import { getOnboardingState } from "./getOnboardingState";
import { updateOnboardingState } from "./updateOnboardingState";

const router = Router();

router.use(requireAuth);
router.use(attachOperatorOrgScope);
router.get("/", getOnboardingState);
router.post("/", updateOnboardingState);

export default router;
