import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { tokens } from "@/styles/tokens";
import { Field, PrimaryButton } from "@/components/UI";

const { color, font } = tokens;

function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function Registro() {
  const [nombreCentro, setNombreCentro] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<"ok" | "confirmar-email" | null>(null);

  const valido = nombreCentro.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setEnviando(false);
      setError(
        authError.message.toLowerCase().includes("already")
          ? "Ya existe una cuenta con ese email."
          : "No pudimos crear la cuenta. Probá de nuevo."
      );
      return;
    }

    // Si Supabase exige confirmar el email antes de dar una sesión activa,
    // signUp no devuelve session y no podemos seguir creando el centro
    // todavía (las policies exigen un usuario autenticado). Avisamos al
    // dueño que confirme el mail y vuelva a intentar el registro.
    if (!authData.session) {
      setEnviando(false);
      setResultado("confirmar-email");
      return;
    }

    const slug = slugify(nombreCentro);
    const { data: centro, error: centroError } = await supabase
      .from("centros")
      .insert({ nombre: nombreCentro.trim(), slug, aprobado: false })
      .select()
      .single();

    if (centroError || !centro) {
      setEnviando(false);
      setError(
        centroError?.message.includes("duplicate")
          ? "Ya existe un centro con un nombre muy parecido. Probá con otro."
          : "No pudimos crear el centro. Probá de nuevo."
      );
      return;
    }

    const { error: vinculoError } = await supabase
      .from("centro_usuarios")
      .insert({ centro_id: centro.id, user_id: authData.session.user.id, rol: "admin" });

    setEnviando(false);
    if (vinculoError) {
      setError("La cuenta se creó pero no pudimos vincularla a tu centro. Contactanos.");
      return;
    }

    setResultado("ok");
  }

  if (resultado === "ok") {
    return (
      <Centrado>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>¡Listo!</h1>
        <p style={{ marginTop: 12, fontSize: 15, color: color.textSoft, lineHeight: 1.6 }}>
          Creamos tu cuenta y tu centro <strong>{nombreCentro}</strong>. Está pendiente de aprobación — en cuanto lo
          activemos vas a poder entrar a tu panel con el email y la contraseña que acabás de crear.
        </p>
      </Centrado>
    );
  }

  if (resultado === "confirmar-email") {
    return (
      <Centrado>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>Confirmá tu email</h1>
        <p style={{ marginTop: 12, fontSize: 15, color: color.textSoft, lineHeight: 1.6 }}>
          Te enviamos un mail a <strong>{email}</strong> para confirmar tu cuenta. Una vez confirmada, volvé a esta
          página y completá el registro de nuevo con el mismo email para terminar de crear tu centro.
        </p>
      </Centrado>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 400, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color.accentDefault }} />
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16 }}>turnito</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>Sumá tu centro</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: color.textSoft }}>
            Creá tu cuenta para empezar a usar Turnito. Tu centro queda pendiente de aprobación.
          </p>
        </div>
        <Field id="reg-centro" label="Nombre del centro" value={nombreCentro} onChange={(e) => setNombreCentro(e.target.value)} placeholder="Ej. Studio Fit Palermo" />
        <Field id="reg-email" label="Tu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
        <Field id="reg-password" label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        {error && <p style={{ color: "#8A1418", fontSize: 14, margin: 0 }}>{error}</p>}
        <PrimaryButton accent={color.accentDefault} disabled={!valido || enviando} type="submit">
          {enviando ? "Creando…" : "Crear mi cuenta"}
        </PrimaryButton>
      </form>
    </div>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 420, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}
