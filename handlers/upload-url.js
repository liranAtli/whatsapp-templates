"use strict";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Joi = require("@hapi/joi");

const client = new S3Client({
  region: "eu-west-1",
});

module.exports.getSignedUrl = async (req, res) => {
  if (!req.body || !req.pathParameters)
    throw new Error(`Missing Parameter ${req.body} or ${req.pathParameters}`);

  console.log(JSON.parse(req.body));

  try {
    const { user_id } = req.pathParameters;

    if (!user_id) {
      return handleError(
        HttpStatus.BAD_REQUEST,
        `[Upload:GetSignedUrl:Error]:${
          HttpStatus[HttpStatus.BAD_REQUEST]
        }: "Invalid parameter user_id"`
      );
    }

    const requestBody = JSON.parse(req.body);

    const schema = Joi.object({
      file_name: Joi.string().required(),
    });

    const { error, value } = schema.validate(requestBody);

    console.log("Error: ", error);
    console.log("Value: ", value);
    if (!error) {
      // Date in yyyy-mm-dd format
      const date = new Date().toJSON().slice(0, 10);
      // Create relative file path in user_id/data/file_name format
      const filePath = `${user_id}/${date}/${value.file_name}`;

      // Read s3 bucket name from environment variable RECIPIENT_S3_BUCKET_NAME
      const bucketName = process.env.RECIPIENT_S3_BUCKET_NAME;

      const params = {
        Bucket: bucketName,
        Key: filePath,
        Expires: 6000, // Url is going to expire in 10 minute
      };

      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucketName,
          Key: filePath,
        }),
        { expiresIn: 6000 }
      );
    }

    return { url };
  } catch (err) {
    console.log(err.message);
    return err;
  }
};
