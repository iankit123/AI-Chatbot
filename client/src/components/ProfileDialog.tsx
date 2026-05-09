import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneNameSignInFields } from "@/components/PhoneNameSignInDialog";
import { auth, isSignedInLocally, signOutUser } from "@/lib/supabase";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseGuestProfile(): { name?: string; age?: number; phone?: string } | null {
  try {
    const raw = localStorage.getItem("guestProfile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const [signedIn, setSignedIn] = useState(isSignedInLocally);
  const [profile, setProfile] = useState<{ name?: string; age?: number; phone?: string } | null>(null);
  const [guestView, setGuestView] = useState<"account" | "phone">("account");

  const refresh = () => {
    setSignedIn(isSignedInLocally());
    setProfile(parseGuestProfile());
  };

  useEffect(() => {
    if (!open) {
      setGuestView("account");
      return;
    }
    refresh();
  }, [open]);

  useEffect(() => {
    const onAuth = () => refresh();
    window.addEventListener("local-storage-auth", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("local-storage-auth", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser().catch(() => {
      auth.currentUser = null;
      localStorage.removeItem("authUser");
    });
    localStorage.removeItem("guestProfile");
    setSignedIn(false);
    setProfile(null);
    onOpenChange(false);
    window.location.href = "/";
  };

  const guestSubtitle =
    "Tap Sign in to add your name and phone number. We keep chats smoother across visits.";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setGuestView("account");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        {signedIn ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Your profile</DialogTitle>
              <DialogDescription>Your details on this device</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {(profile?.name || auth.currentUser?.displayName || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.name || auth.currentUser?.displayName || "—"}</p>
              </div>
              {profile?.phone ? (
                <div className="bg-muted/50 p-4 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium tabular-nums">{profile.phone}</p>
                </div>
              ) : null}
              <Button onClick={() => void handleSignOut()} variant="destructive" className="w-full">
                Sign out
              </Button>
            </div>
          </>
        ) : guestView === "phone" ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className="-mt-2 mb-2 h-8 self-start px-2 text-sm text-muted-foreground"
              onClick={() => setGuestView("account")}
            >
              ← Back
            </Button>
            <DialogHeader>
              <DialogTitle>Sign in</DialogTitle>
              <DialogDescription>
                Enter your name and phone number. No OTP — we only use this to recognise you on your next visit.
              </DialogDescription>
            </DialogHeader>
            <PhoneNameSignInFields
              defaultName={profile?.name ?? ""}
              defaultPhoneDigits={profile?.phone ?? ""}
              onSuccess={() => {
                refresh();
                setGuestView("account");
                onOpenChange(false);
              }}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Account</DialogTitle>
              <DialogDescription>{guestSubtitle}</DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <Button
                variant="default"
                className="w-full max-w-xs font-semibold tracking-wide uppercase text-sm"
                onClick={() => setGuestView("phone")}
              >
                Sign in
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
