import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usuariosRouter from "./usuarios";
import contatosRouter from "./contatos";
import dashboardRouter from "./dashboard";
import regioesRouter from "./regioes";
import eventosRouter from "./eventos";
import configuracaoRouter from "./configuracao";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usuariosRouter);
router.use(contatosRouter);
router.use(dashboardRouter);
router.use(regioesRouter);
router.use(eventosRouter);
router.use(configuracaoRouter);

export default router;
