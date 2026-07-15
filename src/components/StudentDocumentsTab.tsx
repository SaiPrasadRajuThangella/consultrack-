import { useMemo, useState } from "react";
import {
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Plus,
  Upload,
  X,
  XCircle,
} from "lucide-react-native";
import { Text, TextInput } from "@/src/components/ui/Text";
import { cn } from "@/src/lib/utils";

export type DocumentUrlRecord = {
  documentType?: string;
  url?: string;
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  size?: number;
};

export type PickedDocFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

function formatDocLabel(docType: string) {
  return docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function docCategory(docType: string) {
  const t = docType.toUpperCase();
  if (t.includes("PASSPORT")) return "Identity";
  if (
    t.includes("SSC") ||
    t.includes("INTER") ||
    t.includes("BACHELOR") ||
    t.includes("TRANSCRIPT") ||
    t.includes("MARK")
  ) {
    return "Education";
  }
  if (t.includes("LOR") || t.includes("RESUME") || t.includes("CV")) {
    return "SOP/LOR";
  }
  return "Other";
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(record?: DocumentUrlRecord) {
  const raw = record?.createdAt || record?.uploadedAt;
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

async function pickDocumentFile(): Promise<PickedDocFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
  };
}

export type StudentDocumentsTabProps = {
  student: {
    documentsSubmited?: boolean;
    documentSubmited?: boolean;
    documentUrls?: DocumentUrlRecord[];
  };
  mandatoryDocTypes: string[];
  extraDocs: string[];
  files: Record<string, PickedDocFile | null>;
  uploading: boolean;
  onPickFile: (docType: string) => void | Promise<void>;
  onUploadDocuments: (specificType?: string) => void | Promise<void>;
  onViewDocument: (url: string) => void;
  onAddDocumentUpload: (
    name: string,
    file: PickedDocFile,
  ) => boolean | Promise<boolean>;
};

export function StudentDocumentsTab({
  student,
  mandatoryDocTypes,
  extraDocs,
  files,
  uploading,
  onPickFile,
  onUploadDocuments,
  onViewDocument,
  onAddDocumentUpload,
}: StudentDocumentsTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocFile, setNewDocFile] = useState<PickedDocFile | null>(null);

  const allDocTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...mandatoryDocTypes,
          ...extraDocs,
          ...(student.documentUrls
            ?.map((d) => d.documentType)
            .filter(Boolean) as string[]),
        ]),
      ),
    [mandatoryDocTypes, extraDocs, student.documentUrls],
  );

  let verified = 0;
  let missing = 0;
  let pending = 0;

  allDocTypes.forEach((docType) => {
    const uploaded = student.documentUrls?.find(
      (d) => d.documentType === docType && d.url,
    );
    if (uploaded) verified += 1;
    else if (files[docType]) pending += 1;
    else missing += 1;
  });

  const docsSubmitted = Boolean(
    student.documentsSubmited ?? student.documentSubmited,
  );

  const resetAddModal = () => {
    setNewDocName("");
    setNewDocFile(null);
    setIsAddModalOpen(false);
  };

  const openAddModal = () => {
    setNewDocName("");
    setNewDocFile(null);
    setIsAddModalOpen(true);
  };

  const handleRowActions = (docType: string) => {
    const uploadedDoc = student.documentUrls?.find(
      (d) => d.documentType === docType,
    );
    const hasUrl = Boolean(uploadedDoc?.url);
    const stagedFile = files[docType];

    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive" | "default";
    }[] = [];

    if (hasUrl && uploadedDoc?.url) {
      buttons.push({
        text: "View",
        onPress: () => onViewDocument(uploadedDoc.url!),
      });
    }

    buttons.push({
      text: hasUrl ? "Replace file" : "Choose file",
      onPress: () => void onPickFile(docType),
    });

    if (stagedFile) {
      buttons.push({
        text: "Save / Upload",
        onPress: () => void onUploadDocuments(docType),
      });
    }

    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert(formatDocLabel(docType), "Choose an action", buttons);
  };

  const submitNewDocument = async () => {
    if (!newDocName.trim() || !newDocFile) {
      Alert.alert("Validation", "Document name and file are required");
      return;
    }
    const ok = await onAddDocumentUpload(newDocName.trim(), newDocFile);
    if (ok) resetAddModal();
  };

  return (
    <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="flex-row items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-slate-900">
            Document center
          </Text>
          <Text className="mt-1 text-xs text-slate-400">
            {verified} verified · {pending} pending · {missing} missing
            {docsSubmitted ? "  ·  All submitted" : ""}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={openAddModal}
            className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 active:bg-blue-100"
          >
            <Plus size={14} color="#1d4ed8" />
            <Text className="text-xs font-semibold text-blue-700">Add doc</Text>
          </Pressable>
          <Pressable
            onPress={openAddModal}
            className="flex-row items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2 active:bg-blue-600"
          >
            <Upload size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">Upload</Text>
          </Pressable>
        </View>
      </View>

      {allDocTypes.length === 0 ? (
        <View className="items-center px-4 py-14">
          <FileText size={40} color="#cbd5e1" />
          <Text className="mt-3 text-sm font-medium text-slate-900">
            No documents listed
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-400">
            Upload documents to complete the student file.
          </Text>
          <Pressable
            onPress={openAddModal}
            className="mt-4 flex-row items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 active:bg-slate-50"
          >
            <Upload size={14} color="#475569" />
            <Text className="text-sm font-medium text-slate-700">
              Upload document
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {allDocTypes.map((docType) => {
            const uploadedDoc = student.documentUrls?.find(
              (d) => d.documentType === docType,
            );
            const hasUrl = Boolean(uploadedDoc?.url);
            const stagedFile = files[docType];
            const sizeBytes =
              stagedFile?.size ?? uploadedDoc?.fileSize ?? uploadedDoc?.size;
            const sizeLabel = formatFileSize(sizeBytes);
            const uploadedLabel = formatUploadDate(uploadedDoc);

            let statusLabel = "missing";
            let statusClass = "bg-slate-100 border-slate-200";
            let statusText = "text-slate-600";
            if (hasUrl) {
              statusLabel = "verified";
              statusClass = "bg-emerald-50 border-emerald-200";
              statusText = "text-emerald-700";
            } else if (stagedFile) {
              statusLabel = "pending";
              statusClass = "bg-amber-50 border-amber-200";
              statusText = "text-amber-700";
            }

            return (
              <View
                key={docType}
                className="border-b border-slate-100 px-4 py-3.5"
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className={cn(
                      "mt-0.5 h-8 w-8 items-center justify-center rounded-full",
                      hasUrl ? "bg-emerald-50" : "bg-red-50",
                    )}
                  >
                    {hasUrl ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <XCircle size={16} color="#dc2626" />
                    )}
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-slate-900">
                      {formatDocLabel(docType)}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-400">
                      {docCategory(docType)}
                      {uploadedLabel ? ` · ${uploadedLabel}` : ""}
                      {sizeLabel ? ` · ${sizeLabel}` : ""}
                    </Text>
                    {stagedFile ? (
                      <Text
                        className="mt-1 text-xs text-amber-600"
                        numberOfLines={1}
                      >
                        Ready: {stagedFile.name}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    className={cn(
                      "rounded-full border px-2 py-0.5",
                      statusClass,
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[10px] font-semibold capitalize",
                        statusText,
                      )}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row flex-wrap items-center justify-end gap-2">
                  {stagedFile ? (
                    <Pressable
                      disabled={uploading}
                      onPress={() => void onUploadDocuments(docType)}
                      className={cn(
                        "flex-row items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 active:bg-blue-600",
                        uploading && "opacity-60",
                      )}
                    >
                      {uploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Upload size={12} color="#fff" />
                      )}
                      <Text className="text-xs font-semibold text-white">
                        Save
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => void onPickFile(docType)}
                    className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
                  >
                    <Upload size={12} color="#475569" />
                    <Text className="text-xs font-medium text-slate-700">
                      {hasUrl ? "Replace" : "Choose"}
                    </Text>
                  </Pressable>

                  {hasUrl ? (
                    <Pressable
                      onPress={() =>
                        uploadedDoc?.url && onViewDocument(uploadedDoc.url)
                      }
                      className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
                    >
                      <FileText size={12} color="#475569" />
                      <Text className="text-xs font-medium text-slate-700">
                        View
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => handleRowActions(docType)}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-slate-50"
                  >
                    <MoreHorizontal size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={resetAddModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={resetAddModal} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                Add new document
              </Text>
              <Pressable
                onPress={resetAddModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={16} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Document name
              </Text>
              <TextInput
                placeholder="e.g. Internship Letter"
                placeholderTextColor="#94a3b8"
                value={newDocName}
                onChangeText={setNewDocName}
                className="mb-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900"
              />

              <Text className="mb-1.5 text-xs font-medium text-slate-500">
                Select file
              </Text>
              <Pressable
                onPress={async () => {
                  try {
                    const picked = await pickDocumentFile();
                    if (picked) setNewDocFile(picked);
                  } catch {
                    Alert.alert("Error", "Could not open file picker");
                  }
                }}
                className="mb-5 flex-row items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3.5 active:bg-slate-100"
              >
                <Text
                  className={cn(
                    "mr-2 flex-1 text-sm",
                    newDocFile ? "text-slate-900" : "text-slate-400",
                  )}
                  numberOfLines={1}
                >
                  {newDocFile?.name ?? "Tap to choose a file"}
                </Text>
                <Upload size={16} color="#64748b" />
              </Pressable>

              <Pressable
                disabled={!newDocName.trim() || !newDocFile || uploading}
                onPress={() => void submitNewDocument()}
                className={cn(
                  "flex-row items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 active:bg-blue-600",
                  (!newDocName.trim() || !newDocFile || uploading) &&
                    "opacity-60",
                )}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Upload size={16} color="#fff" />
                    <Text className="text-sm font-semibold text-white">
                      Upload document
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export { pickDocumentFile };
