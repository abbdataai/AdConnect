import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useLoginMutation } from "../../api/auth";
import { useAuthStore } from "../../stores/auth";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { STR } from "../../strings";

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") || "/";
  const reason = params.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const login = useLoginMutation();

  if (user) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await login.mutateAsync({ email: email.trim().toLowerCase(), password });
      if (!res.ok) {
        setError(res.message || STR.login.invalid);
        return;
      }
      setSession(res.user, res.token, remember);
      navigate(next, { replace: true });
    } catch {
      setError(STR.errors.network);
    }
  }

  return (
    <main className="login">
      <div className="login__panel">
        <h1 className="login__title">{STR.app.title}</h1>
        <p className="login__tagline">{STR.app.tagline}</p>
        <p className="login__sub">{STR.login.sub}</p>
        <form onSubmit={onSubmit} className="login__form" data-testid="login-form">
          {reason === "expired" && (
            <p className="login__error" role="alert" data-testid="login-expired-notice">
              {STR.login.expired}
            </p>
          )}
          <Field kind="email" label={STR.login.email} value={email} onChange={setEmail} required testId="login-email" />
          <Field kind="password" label={STR.login.password} value={password} onChange={setPassword} required testId="login-password" />
          <label className="login__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              data-testid="login-remember"
            />
            {STR.login.remember}
          </label>
          {error && <p className="login__error" role="alert" data-testid="login-error">{error}</p>}
          <Button type="submit" disabled={login.isPending} data-testid="login-submit">
            {STR.login.submit}
          </Button>
          <a className="login__request" href="mailto:contato@mktwifi.com.br?subject=Solicitar%20acesso" data-testid="login-request-access">
            {STR.login.requestAccess}
          </a>
        </form>
      </div>
    </main>
  );
}
