import { Router, type IRouter } from "express";
import healthRouter from "./health";
import peopleRouter from "./people";
import holidaysRouter from "./holidays";
import insightsRouter from "./insights";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(peopleRouter);
router.use(holidaysRouter);
router.use(insightsRouter);
router.use(settingsRouter);

export default router;
