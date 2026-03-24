import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usuariosRouter from "./usuarios";
import contatosRouter from "./contatos";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usuariosRouter);
router.use(contatosRouter);
router.use(dashboardRouter);

export default router;
