import { Router } from "express";
import UrlController from "./url-creation.controller.js";
import { createUrlSchema } from "./url-creation.valiation.js";
import validate from "../../middleware/validate.js";

const urlRouter = Router();

urlRouter.post("/", validate(createUrlSchema), UrlController.createUrl);

export default urlRouter;
