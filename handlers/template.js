'use strict';
const DynamoDBClient = require("../libs/dynamodb-client"); // Reusable dynamoDB client api
const uuid = require("uuid"); // Used to generate unique UUID
const Joi = require("@hapi/joi"); // Used to validate input request parameter
const {handleSuccess, handleError} = require("../libs/response-handler");
const HttpStatus = require("http-status"); // Used to streamline http status code


module.exports.create = async (event) => {

    // Make sure body exist otherwise throw error
    if (!event.body) throw new Error("Missing Parameter");

    try {
        const requestBody = JSON.parse(event.body);

        // Create schema shape to validate the request body
        const schema = Joi.object({
            template_name: Joi.string().required(),
            template_message: Joi.string().required(),
            user_id: Joi.string().required(),

            // idempotent key
            idempotent_key: Joi.string().required(),
        });


        // Validate the request body against the schema
        const {error, value} = schema.validate(requestBody);

        if (!error) {
            // Make sure record doesn't exist in Templates table with same details
            const templateQueryResults = await DynamoDBClient.query({
                TableName: process.env.DDB_TEMPLATES_TABLE_NAME,
                Limit: 1,
                KeyConditionExpression: "user_id = :user_id",
                FilterExpression: "idempotent_key = :idempotent_key",
                ExpressionAttributeValues: {
                    ":user_id": value.user_id, ":idempotent_key": value.idempotent_key,
                },
            });

            if (!!templateQueryResults && templateQueryResults.Count && templateQueryResults.Items.length) {
                return handleSuccess(templateQueryResults.Items[0]);
            }

            const params = {
                TableName: process.env.DDB_TEMPLATES_TABLE_NAME, Item: {
                    user_id: value.user_id,
                    template_id: uuid.v1(),
                    template_message: value.template_message,
                    template_name: value.template_name,
                    created_at: Date.now(),
                    idempotent_key: value.idempotent_key,
                },
            };

            await DynamoDBClient.put(params);

            return handleSuccess(params.Item);


        }
        return handleError(HttpStatus.BAD_REQUEST, `[Template:Create:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: ${error}`);

    } catch (e) {
        return handleError(HttpStatus.INTERNAL_SERVER_ERROR, `[Template:Create:Error]: ${e.stack}`);
    }
};

module.exports.update = async (event) => {

    if (!event.body || !event.pathParameters) throw new Error("Missing Parameter step one");

    try {

        const {template_id, user_id} = event.pathParameters;

        const requestBody = JSON.parse(event.body);

        if (!template_id || !user_id) {
            return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: Missing path parameter`);
        }

        const schema = Joi.object({
            template_name: Joi.string().required(),
            template_message: Joi.string().required(),
        });


        const {error, value} = schema.validate(requestBody);
        console.log(schema.validate(requestBody));


        if (!error) {
            const params = {
                TableName: process.env.DDB_TEMPLATES_TABLE_NAME,
                Key: {
                    user_id: user_id,
                    template_id: template_id,
                },
                UpdateExpression:
                    "set template_message = :message, template_name = :name",
                ExpressionAttributeValues: {
                    ":message": value.template_message,
                    ":name": value.template_name,
                },
                ReturnValues: "ALL_NEW",
            }

            const updateResult = await DynamoDBClient.update(params);

            if (!updateResult) {
                throw new Error("Template not found");
            }


            return handleSuccess(updateResult.Attributes);
        }

        return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: ${error}`);

    } catch (error) {
        return handleError(HttpStatus.INTERNAL_SERVER_ERROR,
            `[Template:Update:Error]: ${error.stack}`);
    }

}

module.exports.delete = async (event) => {

    if (!event.pathParameters) throw new Error("Missing Parameter step one");

    const schema = Joi.object({
        user_id: Joi.string().required(),
        template_id: Joi.string().required(),
    });

    try {

        const {error, value} = schema.validate(event.pathParameters);

        if (error) {
            return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: Missing path parameter`);
        }

        if (!error) {
            const params = {
                TableName: process.env.DDB_TEMPLATES_TABLE_NAME,
                Key: {
                    user_id: value.user_id,
                    template_id: value.template_id,
                },
            }

            const deleteResult = await DynamoDBClient.delete(params);

            if (!deleteResult) {
                throw new Error("Template not found");
            }


            return handleSuccess(deleteResult.Attributes);
        }

        return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: ${error}`);

    } catch (error) {
        return handleError(HttpStatus.INTERNAL_SERVER_ERROR,
            `[Template:Update:Error]: ${error.stack}`);
    }

}

module.exports.details = async (event) => {

    if (!event.pathParameters) throw new Error(`Missing Parameter ${event.pathParameters}`);

    const schema = Joi.object({
        user_id: Joi.string().required(),
        template_id: Joi.string().required(),
    });

    const {error, value} = schema.validate(event.pathParameters);

    if (error) {
        return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: Missing path parameter`);
    }


    if (!error) {
        const params = {
            TableName: process.env.DDB_TEMPLATES_TABLE_NAME,
            Key: {
                user_id: value.user_id,
                template_id: value.template_id,
            },
        }

        const templateResult = await DynamoDBClient.get(params);

        if (!templateResult) {
            throw new Error("Template not found");
        }

        return handleSuccess(templateResult.Item);
    }

}

module.exports.list = async (event) => {

        if (!event.pathParameters) throw new Error(`Missing Parameter ${event.pathParameters}`);

        const schema = Joi.object({
            user_id: Joi.string().required(),
        });

        const {error, value} = schema.validate(event.pathParameters);

        if (error) {
            return handleError(HttpStatus.BAD_REQUEST, `[Template:Update:Error]:${HttpStatus[HttpStatus.BAD_REQUEST]}: Missing path parameter`);
        }

        if (!error){
            const params = {
                TableName: process.env.DDB_TEMPLATES_TABLE_NAME,
                KeyConditionExpression: "user_id = :user_id",
                FilterExpression: "user_id = :user_id",
                ExpressionAttributeValues: {
                    ":user_id": value.user_id,
                },
            }

            const templateResult = await DynamoDBClient.scan(params);

            if (!templateResult) {
                throw new Error("Template not found");
            }

            return handleSuccess(templateResult.items);
        }


}
