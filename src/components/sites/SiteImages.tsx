import { useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";

type Props = {
  siteId: Id<"sites">;
  ownerDid: string;
  hostname: string;
};

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon,image/avif";
const MAX_BYTES = 10 * 1024 * 1024;

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function SiteImages({ siteId, ownerDid, hostname }: Props) {
  const images = useQuery(api.siteImages.listSiteImages, { ownerDid, siteId });
  const generateUploadUrl = useAction(api.siteImages.generateSiteImageUploadUrl);
  const addImage = useMutation(api.siteImages.addSiteImage);
  const removeImage = useAction(api.siteImages.removeSiteImage);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  const { haptic } = useSettings();

  const sorted = useMemo(
    () => (images ?? []).slice().sort((a, b) => b.createdAt - a.createdAt),
    [images]
  );

  const handleUpload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      addToast("That image is over the 10 MB limit.", "error");
      return;
    }
    setUploading(true);
    haptic("medium");
    try {
      const buffer = await file.arrayBuffer();
      const sha256 = await sha256Hex(buffer);
      const { uploadUrl, bucketKey, fileName } = await generateUploadUrl({
        ownerDid,
        siteId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        byteLength: file.size,
      });
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: buffer,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      await addImage({
        ownerDid,
        siteId,
        fileName,
        bucketKey,
        contentType: file.type || "application/octet-stream",
        byteLength: file.size,
        sha256,
      });
      addToast(`Uploaded ${fileName}`);
      haptic("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      addToast(message, "error");
      haptic("error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (image: Doc<"siteImages">) => {
    if (!confirm(`Delete ${image.fileName}?`)) return;
    try {
      await removeImage({ ownerDid, imageId: image._id });
      addToast(`Deleted ${image.fileName}`);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Could not delete that image.",
        "error"
      );
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-gray-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Images
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Referenced from your HTML as <code>/_assets/&lt;filename&gt;</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
          No images yet.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-gray-800">
          {sorted.map((image) => {
            const href = hostname
              ? `https://${hostname}/_assets/${image.fileName}`
              : "";
            return (
              <li
                key={image._id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={href || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100 hover:text-amber-600"
                  >
                    {image.fileName}
                  </a>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {image.contentType} · {formatBytes(image.byteLength)}
                  </p>
                </div>
                <code className="hidden sm:block text-xs text-stone-500 dark:text-stone-400">
                  /_assets/{image.fileName}
                </code>
                <button
                  type="button"
                  onClick={() => handleRemove(image)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
