import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { subirLogo } from "@/lib/logo";
import { tokens } from "@/styles/tokens";
import { Field, FondoApp, LogoPicker, PrimaryButton } from "@/components/UI";

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
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<"ok" | "confirmar-email" | null>(null);

  const valido =
    nombreCentro.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 6 &&
    telefonoWhatsapp.trim().length > 5;

  function elegirLogo(file: File) {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

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
      .insert({ nombre: nombreCentro.trim(), slug, telefono_whatsapp: telefonoWhatsapp.trim(), aprobado: false })
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

    if (vinculoError) {
      setEnviando(false);
      setError("La cuenta se creó pero no pudimos vincularla a tu centro. Contactanos.");
      return;
    }

    // El logo es opcional: si falla la subida no bloqueamos el alta del
    // centro, que ya quedó creado y vinculado.
    if (logoFile) {
      const url = await subirLogo(centro.id, logoFile);
      if (url) await supabase.from("centros").update({ logo_url: url }).eq("id", centro.id);
    }

    setEnviando(false);
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
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FondoApp />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <form
          onSubmit={handleSubmit}
          style={{ width: 420, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(6px)", borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
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
          <LogoPicker label="Logo de tu centro (opcional)" preview={logoPreview} onFile={elegirLogo} />
          <Field id="reg-centro" label="Nombre del centro" value={nombreCentro} onChange={(e) => setNombreCentro(e.target.value)} placeholder="Ej. Studio Fit Palermo" />
          <Field
            id="reg-whatsapp"
            label="WhatsApp del centro"
            type="tel"
            value={telefonoWhatsapp}
            onChange={(e) => setTelefonoWhatsapp(e.target.value)}
            placeholder="Ej. 11 2345 6789"
          />
          <p style={{ margin: "-12px 0 0", fontSize: 12, color: color.textMuted }}>
            A este número te van a escribir tus clientes para avisarte sobre sus turnos.
          </p>
          <Field id="reg-email" label="Tu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
          <Field id="reg-password" label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          {error && <p style={{ color: "#8A1418", fontSize: 14, margin: 0 }}>{error}</p>}
          <PrimaryButton accent={color.accentDefault} disabled={!valido || enviando} type="submit">
            {enviando ? "Creando…" : "Crear mi cuenta"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FondoApp />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: 420, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(6px)", borderRadius: 20, padding: 32, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
