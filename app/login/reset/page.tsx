import ResetForm from "./reset-form";

// Landing page of the recovery-email link: /auth/callback exchanges the code for a recovery
// session and forwards here, where the user sets a new password.
export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="glass w-full max-w-md rounded-2xl border p-8 shadow-xl shadow-primary/10">
        <ResetForm />
      </div>
    </main>
  );
}
