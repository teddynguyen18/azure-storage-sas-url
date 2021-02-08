const {
  StorageSharedKeyCredential,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} = require('@azure/storage-blob');

const { NODE_ENV, STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY } = process.env;
const isProduction = NODE_ENV === 'production';

const DEFAULT_EXPIRE_IN = 1, //minute
  DEFAULT_PERMISSIONS = 'rw'; // r-read, a-add, c-create, w-write, d-delete, x-deleteVersion, t-tag, m-move, e-execute

const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
const blobServiceClient = new BlobServiceClient(
  `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
  sharedKeyCredential
);

exports.generateSasUrl = function (
  containerName,
  blobName,
  permissions = DEFAULT_PERMISSIONS,
  expiresIn = DEFAULT_EXPIRE_IN,
  contentType // Not mandatory
) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const blobSASpermissions = BlobSASPermissions.parse(permissions);

  const startsOn = new Date();
  startsOn.setMinutes(startsOn.getMinutes() - 5); // Skip clock skew with server

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresIn);

  const blobSAS = generateBlobSASQueryParameters(
    {
      blobName,
      containerName,
      contentType,
      expiresOn,
      permissions: blobSASpermissions.toString(),
      protocol: isProduction ? SASProtocol.HTTPS : SASProtocol.HTTPSandHTTP,
      startsOn,
    },
    sharedKeyCredential
  );

  return `${blobClient.url}?${blobSAS}`;
};

exports.copyAttachment = async function (
  sourceContainerName,
  sourceBlobName,
  destinationContainerName,
  destinationBlobName
) {
  const blobClient = blobServiceClient.getContainerClient(sourceContainerName).getBlobClient(sourceBlobName);
  const newBlobClient = blobServiceClient
    .getContainerClient(destinationContainerName)
    .getBlobClient(destinationBlobName);

  const result = await (await newBlobClient.beginCopyFromURL(blobClient.url)).pollUntilDone();

  return result;
};
