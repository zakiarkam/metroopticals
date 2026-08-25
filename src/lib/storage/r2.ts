import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "metro";

// Public read URL (r2.dev subdomain or custom domain), no trailing slash.
export const PUBLIC_BASE_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ""
).replace(/\/+$/, "");

let client: S3Client | null = null;

const getClient = (): S3Client => {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY."
    );
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }

  return client;
};

export type UploadFolder =
  | "product/image"
  | "product/catalogue"
  | "category/image"
  | "advertisement/image"
  | "brand/image";

export interface UploadOptions {
  folder: UploadFolder;
  file: File;
  customFileName?: string;
}

export interface UploadResult {
  fileName: string;
  publicUrl: string;
}

// Object keys are built from user-supplied names; strip anything that could
// escape the folder prefix ("../", "/", control chars) before use.
export const sanitizeFileName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".");
  if (!cleaned || cleaned === "." || cleaned === "_") {
    throw new Error("Invalid file name");
  }
  return cleaned;
};

export const uploadFile = async ({
  folder,
  file,
  customFileName,
}: UploadOptions): Promise<UploadResult> => {
  try {
    const timestamp = Date.now();
    const fileName = sanitizeFileName(
      customFileName || `${timestamp}-${file.name}`
    );
    const filePath = `${folder}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000",
      })
    );

    return {
      fileName,
      publicUrl: `${PUBLIC_BASE_URL}/${filePath}`,
    };
  } catch (error: any) {
    throw new Error(error?.message || "Failed to upload file");
  }
};

export const deleteFile = async (
  folder: UploadFolder,
  fileName: string
): Promise<void> => {
  const filePath = `${folder}/${sanitizeFileName(fileName)}`;
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    })
  );
};

export const getPublicUrl = (folder: UploadFolder, fileName: string): string =>
  `${PUBLIC_BASE_URL}/${folder}/${fileName}`;
