import ForgotForm from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="glass w-full max-w-md rounded-2xl border p-8 shadow-xl shadow-primary/10">
        <ForgotForm />
      </div>
    </main>
  );
}
