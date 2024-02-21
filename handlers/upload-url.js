'use strict';


module.exports.getSignedUrl = async (req, res) => {

    if (!req.body || !req.pathParameters) throw new Error(`Missing Parameter ${req.body} or ${req.pathParameters}`);

    const schema = Joi.object({
        user_id: Joi.string().required(),
    });

    const {error, value} = schema.validate(req.body);

    if (error) {
        return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: Missing path parameter`);
    }




    return 'Hello World';
}
