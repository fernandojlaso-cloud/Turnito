import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { tokens } from "@/styles/tokens";
import { Field, FondoApp, PrimaryButton } from "@/components/UI";

const { color, font } = tokens;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (e2) setError("Email o contraseña incorrectos.");
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FondoApp />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <form
          onSubmit={entrar}
          style={{
            width: 360,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(6px)",
            borderRadius: 20,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color.accentDefault }} />
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16 }}>turnito</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 24 }}>Panel del centro</h1>
          <Field id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field id="password" label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: "#8A1418", fontSize: 14, margin: 0 }}>{error}</p>}
          <PrimaryButton accent={color.accentDefault} disabled={cargando} type="submit">
            {cargando ? "Ingresando…" : "Ingresar"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
