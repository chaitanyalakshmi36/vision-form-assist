import { useState } from "react";
import { Copy, CheckCircle, AlertTriangle, ExternalLink, Info, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface VaultItem {
  id: string;
  category: string;
  field_name: string;
  field_value: string;
  is_verified: boolean;
}

interface AssistedFillingPanelProps {
  vaultData: VaultItem[];
}

interface FieldFormat {
  name: string;
  format: string;
  warning?: string;
  transform?: (value: string) => string;
}

const fieldFormats: Record<string, FieldFormat> = {
  "Full Name": { 
    name: "Name as per Document", 
    format: "UPPERCASE, no special characters",
    warning: "Must match Aadhaar/ID exactly",
    transform: (v) => v.toUpperCase()
  },
  "Name": { 
    name: "Name as per Document", 
    format: "UPPERCASE, no special characters",
    warning: "Must match Aadhaar/ID exactly",
    transform: (v) => v.toUpperCase()
  },
  "Father's Name": { 
    name: "Father's Name", 
    format: "UPPERCASE",
    warning: "Must match certificate exactly",
    transform: (v) => v.toUpperCase()
  },
  "Mother's Name": { 
    name: "Mother's Name", 
    format: "UPPERCASE",
    transform: (v) => v.toUpperCase()
  },
  "Date of Birth": { 
    name: "Date of Birth", 
    format: "DD/MM/YYYY",
    warning: "Verify format matches the form requirement"
  },
  "DOB": { 
    name: "Date of Birth", 
    format: "DD/MM/YYYY",
    warning: "Verify format matches the form requirement"
  },
  "Aadhaar Number": { 
    name: "Aadhaar Number", 
    format: "XXXX XXXX XXXX (12 digits with spaces)",
    warning: "Must be exactly 12 digits"
  },
  "PAN Number": { 
    name: "PAN Number", 
    format: "AAAAA0000A (10 characters)",
    warning: "Alphanumeric, case sensitive"
  },
  "Mobile": { 
    name: "Mobile Number", 
    format: "10 digits, no country code"
  },
  "Phone": { 
    name: "Phone Number", 
    format: "10 digits, no country code"
  },
  "Email": { 
    name: "Email Address", 
    format: "lowercase@domain.com",
    transform: (v) => v.toLowerCase()
  },
  "Address": { 
    name: "Permanent Address", 
    format: "As per document, include PIN code"
  },
  "PIN Code": { 
    name: "PIN Code", 
    format: "6 digits"
  },
  "Registration Number": { 
    name: "Registration/Roll Number", 
    format: "Alphanumeric, case sensitive",
    warning: "Verify with original certificate"
  },
};

const AssistedFillingPanel = ({ vaultData }: AssistedFillingPanelProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleCopy = async (item: VaultItem) => {
    const format = fieldFormats[item.field_name];
    const value = format?.transform ? format.transform(item.field_value) : item.field_value;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(item.id);
      toast({
        title: "Copied to clipboard",
        description: `${item.field_name}: ${value}`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const filteredData = vaultData.filter(item => 
    item.field_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.field_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, VaultItem[]>);

  const verifiedCount = vaultData.filter(v => v.is_verified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ExternalLink className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Assisted Manual Filling</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Copy your verified data field-by-field to fill external forms accurately. 
              Open the target form in another tab and paste values one at a time.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle className="w-4 h-4" />
                {verifiedCount} verified fields
              </span>
              <span className="flex items-center gap-1.5 text-warning">
                <AlertTriangle className="w-4 h-4" />
                {vaultData.length - verifiedCount} pending verification
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Instructions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your target form in a new browser tab</li>
              <li>Click "Copy" on each field below to copy the value</li>
              <li>Paste into the corresponding form field</li>
              <li>Review format requirements and warnings before pasting</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Fields by Category */}
      {Object.keys(groupedData).length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "No fields match your search" : "No data in your vault yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([category, items]) => (
            <div key={category} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold capitalize flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {category} Information
                </h3>
              </div>
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const format = fieldFormats[item.field_name];
                  const displayValue = format?.transform 
                    ? format.transform(item.field_value) 
                    : item.field_value;
                  
                  return (
                    <div key={item.id} className="p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{format?.name || item.field_name}</p>
                            {item.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-mono bg-muted/50 px-3 py-2 rounded-lg truncate">
                            {displayValue}
                          </p>
                          {format && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Format:</span> {format.format}
                              </p>
                              {format.warning && (
                                <p className="text-xs text-warning flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {format.warning}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant={copiedId === item.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCopy(item)}
                          className="shrink-0"
                        >
                          {copiedId === item.id ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legal Notice */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This tool assists with manual form filling only. It does not automatically fill, 
            submit, or interact with any external websites. Always verify data accuracy before 
            submitting official forms.
          </span>
        </p>
      </div>
    </div>
  );
};

export default AssistedFillingPanel;
