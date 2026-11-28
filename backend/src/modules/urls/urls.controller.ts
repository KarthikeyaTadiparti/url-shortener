import type { RequestHandler } from "express";
import UrlService from "./urls.service.js";
import { success } from "zod";

class UrlController {
    createUrl: RequestHandler = async (req, res) => {
        const url = await UrlService.createUrl(req.body);

        req.log.info({ urlId: url.id }, "URL Created Successfully");

        return res.status(201).json({
            success: true,
            message: "URL created successfully",
            data: url,
        });
    };

    redirectUrl: RequestHandler<{ shortcode: string }> = async (req, res) => {
        const { shortcode } = req.params;

        const originalUrl = await UrlService.fetchOriginalUrl(shortcode);

        req.log.info({ shortCode: shortcode }, "Original URL Found Successfully");

        return res.redirect(302, originalUrl);
    };
}

export default new UrlController();
