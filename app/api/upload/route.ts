import { NextResponse } from "next/server";
import { getUserOrCreate } from "@/lib/auth-sync";
import { v2 as cloudinary } from "cloudinary";

const isDev = process.env.NODE_ENV !== "production";
const log = (msg: string) => {
  if (isDev) {
    console.info(msg);
  }
};

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    log("[UPLOAD_API] Start");
    log("[UPLOAD_API] Content-Type: " + (request.headers.get("content-type") || "none"));
    
    // Parse FormData FIRST
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const questId = formData.get("questId") as string | null;

    const user = await getUserOrCreate();
    if (!user) {
      log("[UPLOAD_API] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log("[UPLOAD_API] User found: " + user.username);

    if (!file) {
      log("[UPLOAD_API] No file found in FormData");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    log(`[UPLOAD_API] File received: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    log(`[UPLOAD_API] Buffer created, size: ${buffer.length}`);

    // Upload to Cloudinary
    log("[UPLOAD_API] Starting Cloudinary stream...");
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `sidequest/${questId || "general"}`,
          resource_type: "auto",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error) {
            log("[UPLOAD_API] Cloudinary Stream Error: " + JSON.stringify(error));
            reject(error);
          } else {
            log("[UPLOAD_API] Cloudinary Success");
            resolve(result);
          }
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error("[UPLOAD_API] Global Catch:", error?.message || error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
