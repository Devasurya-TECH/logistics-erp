"use client";

import { createClient } from "@/utils/supabase/client";

export type DriverMediaKind = "delivery-proof" | "fuel-receipt" | "day-start" | "day-end";

const PROOFS_BUCKET = "proofs";

function extensionFromType(type: string) {
    if (type.includes("png")) return "png";
    if (type.includes("webp")) return "webp";
    return "jpg";
}

function slug(input: string) {
    return input.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if ("createImageBitmap" in window) {
        return createImageBitmap(file);
    }

    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
        });
        return img;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function compressImageFile(file: File, maxWidth = 1280, quality = 0.78) {
    const source = await fileToImageBitmap(file);
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    const scale = Math.min(1, maxWidth / width);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Unable to prepare image upload.");
    }

    ctx.drawImage(source as CanvasImageSource, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) {
        throw new Error("Unable to compress image.");
    }

    const compressed = new File(
        [blob],
        `${file.name.replace(/\.[^.]+$/, "") || "proof"}.webp`,
        { type: "image/webp", lastModified: Date.now() },
    );

    if ("close" in source && typeof source.close === "function") {
        source.close();
    }

    return compressed;
}

export async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Unable to read image file."));
        reader.readAsDataURL(file);
    });
}

export function buildDriverMediaPath(input: {
    driverId: string;
    kind: DriverMediaKind;
    tripId?: string;
    dropId?: string;
    fuelEntryId?: string;
}) {
    const now = Date.now();
    const base = `driver/${slug(input.driverId)}`;

    if (input.kind === "delivery-proof") {
        return `${base}/trip/${slug(input.tripId || "unknown")}/drop/${slug(input.dropId || "unknown")}/${now}.webp`;
    }
    if (input.kind === "fuel-receipt") {
        return `${base}/fuel/${slug(input.fuelEntryId || `${now}`)}/${now}.webp`;
    }
    if (input.kind === "day-start") {
        return `${base}/day-start/${now}.webp`;
    }
    return `${base}/day-end/${now}.webp`;
}

export async function uploadDriverMedia(input: {
    file: File;
    objectPath: string;
}) {
    const supabase = createClient();
    const compressed = await compressImageFile(input.file);
    const fileForUpload =
        compressed.size < input.file.size ? compressed : input.file;
    const contentType = fileForUpload.type || `image/${extensionFromType(fileForUpload.type)}`;

    const { error: uploadError } = await supabase.storage
        .from(PROOFS_BUCKET)
        .upload(input.objectPath, fileForUpload, {
            cacheControl: "31536000",
            upsert: false,
            contentType,
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data, error: signError } = await supabase.storage
        .from(PROOFS_BUCKET)
        .createSignedUrl(input.objectPath, 60 * 60 * 24);

    if (signError) {
        throw signError;
    }

    return {
        objectPath: input.objectPath,
        signedUrl: data.signedUrl,
        sizeBytes: fileForUpload.size,
        mimeType: contentType,
    };
}
