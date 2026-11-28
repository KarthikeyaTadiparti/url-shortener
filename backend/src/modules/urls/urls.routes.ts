import { Router } from "express";
import UrlController from "./urls.controller.js";
import { createUrlSchema, redirectUrlParamsSchema } from "./urls.valiation.js";
import validate from "../../middleware/validate.js";

const urlRouter = Router();

urlRouter.post("/", validate(createUrlSchema), UrlController.createUrl);
urlRouter.get(
    "/:shortcode",
    validate(redirectUrlParamsSchema, "params"),
    UrlController.redirectUrl,
);

export default urlRouter;
