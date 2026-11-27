import encodeShortCode from "../../utils/encodeShortCode.js";
import UrlRepository from "./url-creation.repository.js";
import type { createUrlType } from "./url-creation.types.js";

class UrlService {
    async createUrl(body: createUrlType) {
        const originalUrl = body.originalUrl;

        //get the id
        const id = await UrlRepository.getNextId();

        //generate code
        const shortCode = encodeShortCode(id);

        //insert url
        const createdUrl = await UrlRepository.insertUrl(id, originalUrl, shortCode);

        return createdUrl;
    }
}

export default new UrlService();
