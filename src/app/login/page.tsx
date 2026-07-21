import Image from "next/image";
import { signIn } from "./actions";

function safeNextPath(value?: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <div className="login-page">
      {/* suppressHydrationWarning on the form controls: a browser extension (form-filler/
          autofill type) injects attributes into form/input nodes after the server HTML is
          sent but before/while React hydrates - same known cause as ProjectDocumentUploadForm. */}
      <form className="card login-card" action={signIn} suppressHydrationWarning>
        <div className="login-head">
          <span className="brand-mark">
            <Image src="/brand/logo.png" alt="Kivitely" width={120} height={120} priority />
          </span>
          <small>Bejelentkezés</small>
        </div>

        {params.error ? <div className="inline-note error-message">{params.error}</div> : null}

        <label>
          E-mail cím
          <input name="email" type="email" autoComplete="username" required suppressHydrationWarning />
        </label>
        <label>
          Jelszó
          <input name="password" type="password" autoComplete="current-password" required suppressHydrationWarning />
        </label>

        <input type="hidden" name="next" value={next} suppressHydrationWarning />

        <button className="button primary" type="submit">
          Bejelentkezés
        </button>
      </form>
    </div>
  );
}
