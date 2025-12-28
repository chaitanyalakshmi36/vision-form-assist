import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Database, LogOut, User, Brain, Shield, CheckCircle, Clock, Copy, Sparkles } from "lucide-react";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import AIAssistant from "@/components/AIAssistant";
import AssistedFillingPanel from "@/components/AssistedFillingPanel";
import MockFormMode from "@/components/MockFormMode";
interface VaultItem {
  id: string;
  category: string;
  field_name: string;
  field_value: string;
  is_verified: boolean;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [vaultData, setVaultData] = useState<VaultItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "vault" | "assisted" | "mock" | "forms">("overview");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchVaultData(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchVaultData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchVaultData = async (userId: string) => {
    const { data, error } = await supabase
      .from("data_vault")
      .select("*")
      .eq("user_id", userId)
      .order("category");
    
    if (!error && data) {
      setVaultData(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const groupedVaultData = vaultData.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, VaultItem[]>);

  const categoryIcons: Record<string, any> = {
    personal: User,
    identity: Shield,
    contact: FileText,
    academic: CheckCircle,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin-slow w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SmartForm AI</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Overview", icon: Brain },
              { id: "vault", label: "Data Vault", icon: Database },
              { id: "assisted", label: "Assisted Filling", icon: Copy },
              { id: "mock", label: "Mock Forms", icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
              <p className="text-muted-foreground">Upload documents, manage your vault, and auto-fill forms with AI</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vaultData.length}</p>
                    <p className="text-sm text-muted-foreground">Data Fields</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vaultData.filter(v => v.is_verified).length}</p>
                    <p className="text-sm text-muted-foreground">Verified</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vaultData.filter(v => !v.is_verified).length}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(groupedVaultData).length}</p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-card border border-border rounded-2xl p-6 text-left card-hover group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Document</h3>
                <p className="text-sm text-muted-foreground">Scan and extract data with AI</p>
              </button>

              <button
                onClick={() => setActiveTab("vault")}
                className="bg-card border border-border rounded-2xl p-6 text-left card-hover group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Data Vault</h3>
                <p className="text-sm text-muted-foreground">View your stored information</p>
              </button>

              <button
                onClick={() => setActiveTab("assisted")}
                className="bg-card border border-border rounded-2xl p-6 text-left card-hover group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Copy className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Assisted Filling</h3>
                <p className="text-sm text-muted-foreground">Copy data field-by-field</p>
              </button>

              <button
                onClick={() => setActiveTab("mock")}
                className="bg-card border border-border rounded-2xl p-6 text-left card-hover group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Mock Forms</h3>
                <p className="text-sm text-muted-foreground">Practice before submitting</p>
              </button>
            </div>

            {/* Getting Started */}
            {vaultData.length === 0 && (
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-border rounded-2xl p-8">
                <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
                <ol className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">1</span>
                    <span>Upload your identity documents (Aadhaar, PAN, etc.)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">2</span>
                    <span>AI will extract and verify the information</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/60 text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">3</span>
                    <span>Your data is securely stored in your personal vault</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/40 text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">4</span>
                    <span>Use Smart Forms to auto-fill any application</span>
                  </li>
                </ol>
                <Button variant="hero" className="mt-6" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Document
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "vault" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Data Vault</h1>
                <p className="text-muted-foreground">Your securely stored personal information</p>
              </div>
              <Button variant="hero" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </div>

            {Object.keys(groupedVaultData).length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No data yet</h3>
                <p className="text-muted-foreground mb-6">Upload your first document to populate your vault</p>
                <Button variant="hero" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(groupedVaultData).map(([category, items]) => {
                  const Icon = categoryIcons[category] || FileText;
                  return (
                    <div key={category} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{category}</h3>
                          <p className="text-xs text-muted-foreground">{items.length} fields</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">{item.field_name}</p>
                              <p className="font-medium">{item.field_value}</p>
                            </div>
                            {item.is_verified ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <Clock className="w-5 h-5 text-warning" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "assisted" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">Assisted Manual Filling</h1>
              <p className="text-muted-foreground">Copy your verified data to fill external forms accurately</p>
            </div>
            <AssistedFillingPanel vaultData={vaultData} />
          </div>
        )}

        {activeTab === "mock" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mock Form Mode</h1>
              <p className="text-muted-foreground">Practice filling forms and validate your data before real submissions</p>
            </div>
            <MockFormMode vaultData={vaultData} />
          </div>
        )}
      </main>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          if (user) fetchVaultData(user.id);
        }}
      />

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default Dashboard;
