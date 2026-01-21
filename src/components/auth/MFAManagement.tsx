"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Plus, Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const supabase = getSupabaseClient();

interface MFAFactor {
  id: string;
  type: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

export default function MFAManagement() {
  const router = useRouter();
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message);
        setLoading(false);
        return;
      }

      const allFactors = (data?.all || []).map((factor: any) => ({
        id: factor.id,
        type: factor.type,
        friendly_name: factor.friendly_name,
        status: factor.status,
        created_at: factor.created_at,
      }));

      setFactors(allFactors);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load factors");
      setLoading(false);
    }
  };

  const handleRemoveFactor = async (factorId: string, isLastFactor: boolean = false) => {
    setRemovingId(factorId);
    setError("");

    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (unenrollError) {
        setError(unenrollError.message || "Failed to remove authenticator");
        setRemovingId(null);
        return;
      }

      // Reload factors
      await loadFactors();
      setRemovingId(null);
    } catch (err: any) {
      setError(err.message || "Failed to remove authenticator");
      setRemovingId(null);
    }
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const hasVerifiedFactors = verifiedFactors.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading security settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {hasVerifiedFactors && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Enabled</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Enrolled Factors List */}
          {hasVerifiedFactors ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Enrolled Authenticators:</p>
              {verifiedFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {factor.friendly_name || "Authenticator App"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(factor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (verifiedFactors.length === 1) {
                        // For last factor, show confirmation dialog
                        setConfirmRemoveId(factor.id);
                      } else {
                        // For multiple factors, use simple confirm
                        if (confirm("Are you sure you want to remove this authenticator?")) {
                          handleRemoveFactor(factor.id);
                        }
                      }
                    }}
                    disabled={removingId === factor.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {removingId === factor.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}

              {/* Warning if removing last factor */}
              {verifiedFactors.length === 1 && (
                <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <p>
                    This is your only enrolled authenticator. Removing it will disable two-factor authentication.
                    Make sure to enroll a new authenticator before removing this one.
                  </p>
                </div>
              )}

              {/* Add Another Factor Button */}
              <Button
                variant="outline"
                onClick={() => router.push("/admin/mfa/enroll")}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Authenticator
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <p>
                  Two-factor authentication is not enabled. Enable it to add an extra layer of security to your account.
                </p>
              </div>
              <Button
                onClick={() => router.push("/admin/mfa/enroll")}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}

          {/* Unverified Factors (if any) */}
          {factors.filter((f) => f.status === "unverified").length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Pending Verification:</p>
              {factors
                .filter((f) => f.status === "unverified")
                .map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {factor.friendly_name || "Authenticator App"}
                      </p>
                      <p className="text-xs text-muted-foreground">Needs verification</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFactor(factor.id)}
                      disabled={removingId === factor.id}
                    >
                      {removingId === factor.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Last Factor */}
      {confirmRemoveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Remove Last Authenticator?
              </CardTitle>
              <CardDescription>
                This action will disable two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  This is your only enrolled authenticator. Removing it will <strong>disable two-factor authentication</strong> for your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  You will need to enroll a new authenticator to re-enable 2FA. Are you sure you want to continue?
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRemoveId(null)}
                  disabled={removingId === confirmRemoveId}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRemoveFactor(confirmRemoveId, true);
                    setConfirmRemoveId(null);
                  }}
                  disabled={removingId === confirmRemoveId}
                >
                  {removingId === confirmRemoveId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Yes, Remove It"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
