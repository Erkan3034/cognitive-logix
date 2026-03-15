// import { useState } from "react";
// import { supabase } from "../lib/supabaseClient.js";

export default function Login() {
  // AUTH DEVRE DIŞI - Supabase auth geçici olarak kapatıldı
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const [message, setMessage] = useState("");

  // async function signIn(e) {
  //   e.preventDefault();
  //   setMessage("");

  //   if (!supabase) {
  //     setMessage("Supabase env not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  //     return;
  //   }

  //   const { error } = await supabase.auth.signInWithPassword({ email, password });
  //   if (error) setMessage(error.message);
  //   else setMessage("Signed in!");
  // }

  return (
    <div>
      <h2>Giriş</h2>
      <p style={{ color: "#666" }}>🔒 Kimlik doğrulama geliştirme sürecinde geçici olarak devre dışıdır.</p>
      {/* <form onSubmit={signIn} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-posta"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="şifre"
          type="password"
          required
        />
        <button type="submit">Giriş yap</button>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>} */}
    </div>
  );
}
