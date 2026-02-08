/**
 * Attachments component for uploading and viewing files on items.
 * Uses Convex file storage for secure file handling.
 */

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";
import { takePhoto } from "../lib/camera";

interface AttachmentsProps {
  itemId: Id<"items">;
  userDid: string;
  legacyDid?: string;
  canEdit: boolean;
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/json",
];

export function Attachments({ itemId, userDid, legacyDid, canEdit }: AttachmentsProps) {
  const { haptic } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"_storage"> | null>(null);

  // Fetch attachment URLs
  const attachments = useQuery(api.attachments.getAttachmentUrls, { itemId });

  // Mutations
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const addAttachment = useMutation(api.attachments.addAttachment);
  const removeAttachment = useMutation(api.attachments.removeAttachment);

  const handleUploadClick = () => {
    if (!canEdit) return;
    haptic("light");
    fileInputRef.current?.click();
  };

  const handleCameraCapture = async () => {
    if (!canEdit) return;
    
    setUploadError(null);
    haptic("light");

    try {
      const photo = await takePhoto();
      if (!photo) {
        // User cancelled
        return;
      }

      // Convert data URL to blob
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();

      // Validate size
      if (blob.size > MAX_FILE_SIZE) {
        setUploadError("Photo too large. Maximum size is 10MB.");
        haptic("error");
        return;
      }

      setIsUploading(true);
      haptic("medium");

      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl({
        itemId,
        userDid,
        legacyDid,
      });

      // Step 2: Upload to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();

      // Step 3: Add attachment to item
      await addAttachment({
        itemId,
        storageId,
        userDid,
        legacyDid,
      });

      haptic("success");
    } catch (err) {
      console.error("Failed to upload photo:", err);
      setUploadError("Failed to upload photo. Please try again.");
      haptic("error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setUploadError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum size is 10MB.");
      haptic("error");
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("File type not supported. Use images, PDFs, or text files.");
      haptic("error");
      return;
    }

    setIsUploading(true);
    haptic("medium");

    try {
      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl({
        itemId,
        userDid,
        legacyDid,
      });

      // Step 2: Upload to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Add attachment to item
      await addAttachment({
        itemId,
        storageId,
        userDid,
        legacyDid,
      });

      haptic("success");
    } catch (err) {
      console.error("Failed to upload attachment:", err);
      setUploadError("Failed to upload file. Please try again.");
      haptic("error");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (storageId: Id<"_storage">) => {
    if (!canEdit) return;
    
    haptic("medium");
    setDeletingId(storageId);

    try {
      await removeAttachment({
        itemId,
        storageId,
        userDid,
        legacyDid,
      });
      haptic("success");
    } catch (err) {
      console.error("Failed to remove attachment:", err);
      haptic("error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment grid */}
      {attachments && attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map(({ storageId, url }) => (
            <div
              key={storageId}
              className="relative group aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden"
            >
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                >
                  <img
                    src={url}
                    alt="Attachment"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, show file icon
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement?.classList.add("flex", "items-center", "justify-center");
                      const icon = document.createElement("div");
                      icon.innerHTML = `<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>`;
                      target.parentElement?.appendChild(icon.firstChild!);
                    }}
                  />
                </a>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              {/* Delete button */}
              {canEdit && (
                <button
                  onClick={() => handleDelete(storageId)}
                  disabled={deletingId === storageId}
                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {deletingId === storageId ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={handleCameraCapture}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Camera
              </>
            )}
          </button>
          
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Files
          </button>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <p className="text-xs text-red-500 dark:text-red-400">{uploadError}</p>
      )}

      {/* Empty state */}
      {(!attachments || attachments.length === 0) && !canEdit && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No attachments
        </p>
      )}
    </div>
  );
}

/**
 * Compact attachment preview for list items.
 * Shows small thumbnail count.
 */
interface AttachmentPreviewProps {
  itemId: Id<"items">;
  count?: number;
}

export function AttachmentPreview({ count }: AttachmentPreviewProps) {
  if (!count || count === 0) return null;

  return (
    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span className="text-[10px] font-medium">{count}</span>
    </div>
  );
}
