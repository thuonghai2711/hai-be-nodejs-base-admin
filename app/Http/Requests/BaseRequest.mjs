import {validationResult} from 'express-validator';
import { responseErrors } from "../../Common/helper.mjs";
export const baseRequest = (validations) => {
    return (
        async (req, res, next) => {
            for (let validation of validations) {
                const result = await validation.run(req);
                if (result.errors.length) break;
            }

            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }

            return responseErrors(res, 401, { errors: errors.array() });
        }
    )
}