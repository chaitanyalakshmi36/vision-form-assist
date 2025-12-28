import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, AlertCircle, FileText, GraduationCap, Award, Sparkles, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VaultItem {
  id: string;
  category: string;
  field_name: string;
  field_value: string;
  is_verified: boolean;
}

interface MockFormModeProps {
  vaultData: VaultItem[];
}

interface FormField {
  id: string;
  label: string;
  vaultKey: string[];
  required: boolean;
  format?: string;
  validation?: RegExp;
  placeholder?: string;
  warning?: string;
  transform?: (value: string) => string;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  fields: FormField[];
}

const formTemplates: FormTemplate[] = [
  {
    id: "govt-exam",
    name: "Government Exam Registration",
    description: "SSC, UPSC, Bank PO style registration form",
    icon: FileText,
    fields: [
      { id: "name", label: "Candidate Name (as per Aadhaar)", vaultKey: ["Full Name", "Name"], required: true, format: "UPPERCASE", transform: (v) => v.toUpperCase(), warning: "Must match Aadhaar exactly" },
      { id: "father", label: "Father's Name", vaultKey: ["Father's Name"], required: true, format: "UPPERCASE", transform: (v) => v.toUpperCase() },
      { id: "mother", label: "Mother's Name", vaultKey: ["Mother's Name"], required: true, format: "UPPERCASE", transform: (v) => v.toUpperCase() },
      { id: "dob", label: "Date of Birth", vaultKey: ["Date of Birth", "DOB"], required: true, format: "DD/MM/YYYY", validation: /^\d{2}\/\d{2}\/\d{4}$/ },
      { id: "gender", label: "Gender", vaultKey: ["Gender"], required: true, placeholder: "Male / Female / Other" },
      { id: "aadhaar", label: "Aadhaar Number", vaultKey: ["Aadhaar Number", "Aadhaar"], required: true, format: "XXXX XXXX XXXX", validation: /^\d{4}\s?\d{4}\s?\d{4}$/, warning: "Must be 12 digits" },
      { id: "mobile", label: "Mobile Number", vaultKey: ["Mobile", "Phone", "Mobile Number"], required: true, format: "10 digits", validation: /^\d{10}$/ },
      { id: "email", label: "Email Address", vaultKey: ["Email", "Email Address"], required: true, transform: (v) => v.toLowerCase() },
      { id: "address", label: "Permanent Address", vaultKey: ["Address", "Permanent Address"], required: true },
      { id: "pincode", label: "PIN Code", vaultKey: ["PIN Code", "Pincode"], required: true, format: "6 digits", validation: /^\d{6}$/ },
    ]
  },
  {
    id: "college-admission",
    name: "College Admission Form",
    description: "University/College enrollment application",
    icon: GraduationCap,
    fields: [
      { id: "name", label: "Full Name", vaultKey: ["Full Name", "Name"], required: true, format: "UPPERCASE", transform: (v) => v.toUpperCase() },
      { id: "dob", label: "Date of Birth", vaultKey: ["Date of Birth", "DOB"], required: true, format: "DD/MM/YYYY" },
      { id: "10th-marks", label: "10th Percentage/CGPA", vaultKey: ["10th Percentage", "10th Marks", "Class 10 Percentage"], required: true },
      { id: "12th-marks", label: "12th Percentage/CGPA", vaultKey: ["12th Percentage", "12th Marks", "Class 12 Percentage"], required: true },
      { id: "board", label: "Board of Education", vaultKey: ["Board", "Education Board", "10th Board"], required: true },
      { id: "passing-year", label: "Year of Passing (12th)", vaultKey: ["12th Year", "Year of Passing", "Passing Year"], required: true, validation: /^20\d{2}$/ },
      { id: "aadhaar", label: "Aadhaar Number", vaultKey: ["Aadhaar Number", "Aadhaar"], required: true },
      { id: "email", label: "Email Address", vaultKey: ["Email", "Email Address"], required: true },
      { id: "mobile", label: "Mobile Number", vaultKey: ["Mobile", "Phone", "Mobile Number"], required: true },
      { id: "address", label: "Correspondence Address", vaultKey: ["Address", "Permanent Address"], required: true },
    ]
  },
  {
    id: "scholarship",
    name: "Scholarship Application",
    description: "Merit/Need-based scholarship form",
    icon: Award,
    fields: [
      { id: "name", label: "Applicant Name", vaultKey: ["Full Name", "Name"], required: true, format: "UPPERCASE", transform: (v) => v.toUpperCase(), warning: "As per bank account" },
      { id: "father", label: "Father's/Guardian's Name", vaultKey: ["Father's Name"], required: true },
      { id: "dob", label: "Date of Birth", vaultKey: ["Date of Birth", "DOB"], required: true },
      { id: "category", label: "Category", vaultKey: ["Category", "Caste Category"], required: true, placeholder: "General / OBC / SC / ST" },
      { id: "aadhaar", label: "Aadhaar Number", vaultKey: ["Aadhaar Number", "Aadhaar"], required: true },
      { id: "bank-account", label: "Bank Account Number", vaultKey: ["Bank Account", "Account Number"], required: true, warning: "Verify with passbook" },
      { id: "ifsc", label: "IFSC Code", vaultKey: ["IFSC", "IFSC Code", "Bank IFSC"], required: true, format: "11 characters", validation: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
      { id: "income", label: "Annual Family Income", vaultKey: ["Family Income", "Annual Income"], required: true },
      { id: "10th-marks", label: "10th Percentage", vaultKey: ["10th Percentage", "10th Marks"], required: true },
      { id: "institution", label: "Current Institution Name", vaultKey: ["Institution", "College Name", "School Name"], required: true },
    ]
  }
];

interface FieldStatus {
  value: string;
  status: "empty" | "filled" | "mismatch" | "invalid";
  warning?: string;
  suggestion?: string;
}

const MockFormMode = ({ vaultData }: MockFormModeProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, FieldStatus>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const findVaultValue = (keys: string[]): VaultItem | undefined => {
    for (const key of keys) {
      const item = vaultData.find(v => 
        v.field_name.toLowerCase() === key.toLowerCase()
      );
      if (item) return item;
    }
    return undefined;
  };

  const autoFillForm = (template: FormTemplate) => {
    const values: Record<string, FieldStatus> = {};
    
    template.fields.forEach(field => {
      const vaultItem = findVaultValue(field.vaultKey);
      if (vaultItem) {
        let value = vaultItem.field_value;
        if (field.transform) value = field.transform(value);
        
        let status: FieldStatus["status"] = "filled";
        let warning: string | undefined;
        
        // Validate format
        if (field.validation && !field.validation.test(value)) {
          status = "invalid";
          warning = `Format mismatch: Expected ${field.format}`;
        }
        
        values[field.id] = { value, status, warning };
      } else {
        values[field.id] = { 
          value: "", 
          status: "empty",
          warning: field.required ? "Required field - no data found in vault" : undefined
        };
      }
    });
    
    setFormValues(values);
    setSelectedTemplate(template);
    generateAIWarnings(template, values);
  };

  const generateAIWarnings = async (template: FormTemplate, values: Record<string, FieldStatus>) => {
    setIsValidating(true);
    const warnings: string[] = [];
    
    // Check for empty required fields
    template.fields.forEach(field => {
      const fieldValue = values[field.id];
      if (field.required && (!fieldValue?.value || fieldValue.status === "empty")) {
        warnings.push(`⚠️ "${field.label}" is required but missing from your vault`);
      }
      if (fieldValue?.status === "invalid") {
        warnings.push(`⛔ "${field.label}" format may cause rejection: ${fieldValue.warning}`);
      }
    });

    // Add context-specific warnings
    if (template.id === "govt-exam") {
      if (values["name"]?.value && !values["name"].value.match(/^[A-Z\s]+$/)) {
        warnings.push("⚠️ Name should be in UPPERCASE for government forms");
      }
      if (values["aadhaar"]?.value && values["aadhaar"].value.replace(/\s/g, "").length !== 12) {
        warnings.push("⛔ Aadhaar must be exactly 12 digits");
      }
    }

    // Try to get AI analysis
    try {
      const filledFields = Object.entries(values)
        .filter(([_, v]) => v.value)
        .map(([k, v]) => `${k}: ${v.value}`)
        .join("\n");

      const { data } = await supabase.functions.invoke("ai-assistant", {
        body: {
          message: `Analyze this form data for potential issues. Form type: ${template.name}. Fields:\n${filledFields}\n\nProvide 2-3 brief warnings about potential errors or mismatches.`,
          context: "Mock form validation"
        }
      });

      if (data?.message) {
        const aiLines = data.message.split("\n").filter((l: string) => l.trim()).slice(0, 3);
        aiLines.forEach((line: string) => {
          if (!warnings.some(w => w.includes(line.substring(0, 20)))) {
            warnings.push(`🤖 ${line.replace(/^[-•*]\s*/, "")}`);
          }
        });
      }
    } catch (error) {
      console.log("AI validation skipped");
    }

    setAiWarnings(warnings);
    setIsValidating(false);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    const field = selectedTemplate?.fields.find(f => f.id === fieldId);
    let status: FieldStatus["status"] = value ? "filled" : "empty";
    let warning: string | undefined;

    if (field?.validation && value && !field.validation.test(value)) {
      status = "invalid";
      warning = `Format: ${field.format}`;
    }

    setFormValues(prev => ({
      ...prev,
      [fieldId]: { value, status, warning }
    }));
  };

  const handleReset = () => {
    if (selectedTemplate) {
      autoFillForm(selectedTemplate);
      toast({ title: "Form reset", description: "Values restored from vault" });
    }
  };

  const handleSubmitCheck = () => {
    if (!selectedTemplate) return;

    const issues: string[] = [];
    selectedTemplate.fields.forEach(field => {
      const value = formValues[field.id];
      if (field.required && (!value?.value || value.status === "empty")) {
        issues.push(field.label);
      }
      if (value?.status === "invalid") {
        issues.push(`${field.label} (format error)`);
      }
    });

    if (issues.length > 0) {
      toast({
        title: "Submission Not Ready",
        description: `Please fix: ${issues.slice(0, 3).join(", ")}${issues.length > 3 ? ` and ${issues.length - 3} more` : ""}`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Ready for Submission! ✓",
        description: "All fields validated. You can now fill the actual form.",
      });
    }
  };

  const getFieldIcon = (status: FieldStatus["status"]) => {
    switch (status) {
      case "filled": return <CheckCircle className="w-4 h-4 text-success" />;
      case "invalid": return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "mismatch": return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const readinessScore = selectedTemplate 
    ? Math.round((Object.values(formValues).filter(v => v.status === "filled").length / selectedTemplate.fields.length) * 100)
    : 0;

  if (!selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-accent/5 to-success/5 border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Mock Form Mode</h2>
              <p className="text-muted-foreground text-sm">
                Practice filling forms with your verified data. Identify errors and mismatches 
                before submitting real applications. Choose a template below to start.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {formTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => autoFillForm(template)}
              className="bg-card border border-border rounded-2xl p-6 text-left hover:border-primary/50 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <template.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <p className="text-xs text-primary">{template.fields.length} fields →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
            ← Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedTemplate.name}</h2>
            <p className="text-sm text-muted-foreground">Mock form - practice mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            readinessScore >= 80 ? "bg-success/10 text-success" :
            readinessScore >= 50 ? "bg-warning/10 text-warning" :
            "bg-destructive/10 text-destructive"
          }`}>
            {readinessScore}% Ready
          </div>
        </div>
      </div>

      {/* AI Warnings */}
      {aiWarnings.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" />
            AI Validation Warnings
          </h4>
          <ul className="text-sm space-y-1">
            {aiWarnings.map((warning, i) => (
              <li key={i} className="text-muted-foreground">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Fields */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="font-medium">Form Fields</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
        <div className="divide-y divide-border">
          {selectedTemplate.fields.map((field) => {
            const fieldStatus = formValues[field.id] || { value: "", status: "empty" };
            
            return (
              <div key={field.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-2">{getFieldIcon(fieldStatus.status)}</div>
                  <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </label>
                    <Input
                      value={fieldStatus.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      className={fieldStatus.status === "invalid" ? "border-destructive" : ""}
                    />
                    <div className="flex items-center gap-3 mt-1">
                      {field.format && (
                        <span className="text-xs text-muted-foreground">Format: {field.format}</span>
                      )}
                      {fieldStatus.warning && (
                        <span className="text-xs text-warning">{fieldStatus.warning}</span>
                      )}
                      {field.warning && fieldStatus.status === "filled" && (
                        <span className="text-xs text-warning flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {field.warning}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submission Readiness */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Submission Readiness Checklist</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {[
            { label: "All required fields filled", check: Object.values(formValues).filter(v => v.status !== "empty").length === selectedTemplate.fields.filter(f => f.required).length },
            { label: "No format errors", check: !Object.values(formValues).some(v => v.status === "invalid") },
            { label: "Name matches ID document", check: formValues["name"]?.status === "filled" },
            { label: "Contact details verified", check: formValues["email"]?.status === "filled" && formValues["mobile"]?.status === "filled" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.check ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={item.check ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Form
          </Button>
          <Button variant="hero" onClick={handleSubmitCheck} className="flex-1">
            <Send className="w-4 h-4 mr-2" />
            Check Readiness
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MockFormMode;
