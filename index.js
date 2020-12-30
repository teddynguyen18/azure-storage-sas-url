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

exports.generateSasUrl = function (
  containerName,
  blobName,
  permissions = DEFAULT_PERMISSIONS,
  expiresIn = DEFAULT_EXPIRE_IN,
  contentType // Not mandatory
) {
  const sharedKeyCredential = new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);
  const blobServiceClient = new BlobServiceClient(
    `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const pageBlobClient = containerClient.getPageBlobClient(blobName);

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

  return `${pageBlobClient.url}?${blobSAS}`;
};
