import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";

interface ExtractedField {
  category: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  needsVerification: boolean;
  originalLabel?: string;
}

interface ExtractedData {
  rawText: string;
  documentType: string;
  fields: ExtractedField[];
  overallConfidence: number;
  warnings: string[];
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentUploadModal = ({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const { toast } = useToast();

  const documentTypes = [
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "passport", label: "Passport" },
    { value: "marksheet", label: "Marksheet / Certificate" },
    { value: "driving_license", label: "Driving License" },
    { value: "voter_id", label: "Voter ID" },
    { value: "other", label: "Other Document" },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith("image/") || droppedFile.type === "application/pdf")) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(droppedFile);
      }
    } else {
      toast({ title: "Invalid file", description: "Please upload an image or PDF", variant: "destructive" });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const processDocument = async () => {
    if (!file || !documentType) {
      toast({ title: "Missing info", description: "Please select a file and document type", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setStep("processing");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("process-document", {
          body: { 
            imageBase64: base64,
            documentType: documentType
          },
        });

        if (error) throw error;
        
        if (data?.success && data?.data) {
          setExtractedData(data.data);
          setStep("review");
          toast({ title: "Document processed!", description: "Please review the extracted data" });
        } else {
          throw new Error(data?.error || "Failed to process document");
        }
        
        setProcessing(false);
      };
    } catch (error: any) {
      console.error("Processing error:", error);
      toast({ 
        title: "Processing failed", 
        description: error.message || "Could not process the document", 
        variant: "destructive" 
      });
      setProcessing(false);
      setStep("upload");
    }
  };

  const saveToVault = async () => {
    if (!extractedData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save each field to the vault
      for (const field of extractedData.fields) {
        await supabase.from("data_vault").upsert({
          user_id: user.id,
          category: field.category,
          field_name: field.fieldName,
          field_value: field.fieldValue,
          is_verified: !field.needsVerification,
          verification_date: field.needsVerification ? null : new Date().toISOString(),
        }, {
          onConflict: "user_id,category,field_name"
        });
      }

      toast({ title: "Data saved!", description: "Your data has been stored in your vault" });
      onSuccess();
      resetModal();
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreview(null);
    setDocumentType("");
    setExtractedData(null);
    setStep("upload");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <p className="text-sm text-muted-foreground">
                {step === "upload" && "Upload and scan your document"}
                {step === "processing" && "AI is analyzing your document..."}
                {step === "review" && "Review extracted information"}
              </p>
            </div>
          </div>
          <button onClick={resetModal} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === "upload" && (
            <div className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border-2 border-input bg-card text-foreground focus:border-primary/50 focus:outline-none"
                >
                  <option value="">Select document type...</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  file ? "border-success bg-success/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {preview ? (
                  <div className="space-y-4">
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                    <p className="text-sm text-muted-foreground">{file?.name}</p>
                    <Button variant="outline" size="sm" onClick={() => { setFile(null); setPreview(null); }}>
                      Remove
                    </Button>
                  </div>
                ) : file ? (
                  <div className="space-y-4">
                    <FileText className="w-12 h-12 mx-auto text-success" />
                    <p className="font-medium">{file.name}</p>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop your document here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input">
                      <Button variant="outline" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Analyzing Document</h3>
                <p className="text-muted-foreground">Our AI is extracting information from your document...</p>
              </div>
              <div className="max-w-xs mx-auto space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Preprocessing image</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running OCR extraction</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <div className="w-4 h-4 rounded-full border-2" />
                  <span>Validating data</span>
                </div>
              </div>
            </div>
          )}

          {step === "review" && extractedData && (
            <div className="space-y-6">
              {/* Confidence Score */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  extractedData.overallConfidence >= 80 ? "bg-success/20 text-success" :
                  extractedData.overallConfidence >= 60 ? "bg-warning/20 text-warning" :
                  "bg-destructive/20 text-destructive"
                }`}>
                  {extractedData.overallConfidence}%
                </div>
                <div>
                  <p className="font-medium">Confidence Score</p>
                  <p className="text-sm text-muted-foreground">
                    Document type: {extractedData.documentType}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {extractedData.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Warnings</span>
                  </div>
                  <ul className="text-sm space-y-1">
                    {extractedData.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Fields */}
              <div className="space-y-4">
                <h4 className="font-medium">Extracted Information</h4>
                <div className="grid gap-3">
                  {extractedData.fields.map((field, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      field.needsVerification ? "border-warning/50 bg-warning/5" : "border-border bg-card"
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">{field.category}</p>
                          <p className="font-medium">{field.fieldName}</p>
                          <p className="text-lg">{field.fieldValue}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            field.confidence >= 90 ? "bg-success/20 text-success" :
                            field.confidence >= 70 ? "bg-warning/20 text-warning" :
                            "bg-destructive/20 text-destructive"
                          }`}>
                            {field.confidence}%
                          </span>
                          {field.needsVerification && (
                            <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">
                              Verify
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={resetModal}>
            Cancel
          </Button>
          {step === "upload" && (
            <Button variant="hero" onClick={processDocument} disabled={!file || !documentType}>
              <Upload className="w-4 h-4 mr-2" />
              Process Document
            </Button>
          )}
          {step === "review" && (
            <Button variant="success" onClick={saveToVault}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save to Vault
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
