import type { RequestHandler } from "express";
import urlService from "./url-creation.service.js";

class UrlController {
    createUrl: RequestHandler = async (req, res) => {
        const url = await urlService.createUrl(req.body);

        req.log.info({ urlId: url.id }, "URL Created Successfully");

        return res.status(201).json({
            success: true,
            message: "URL created successfully",
            data: url,
        });
    };
}

export default new UrlController();
