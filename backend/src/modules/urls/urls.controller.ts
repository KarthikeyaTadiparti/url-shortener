import type { RequestHandler } from "express";
import UrlService from "./urls.service.js";

class UrlController {
    createUrl: RequestHandler = async (req, res) => {
        const { originalUrl } = req.body;
        const createdUrl = await UrlService.createUrl(originalUrl);

        req.log.info({ urlId: createdUrl.id }, "URL Created Successfully");

        return res.status(201).json({
            success: true,
            message: "URL created successfully",
            data: createdUrl,
        });
    };

    redirectUrl: RequestHandler<{ shortcode: string }> = async (req, res) => {
        const { shortcode } = req.params;
        const originalUrl = await UrlService.fetchOriginalUrl(shortcode);

        req.log.info({ shortcode }, "URL redirected successfully");

        return res.redirect(302, originalUrl);
    };
}

export default new UrlController();
