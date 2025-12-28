import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthCallback = () => {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      window.location.replace("/dashboard");
    });
  }, []);

  return <p>Signing you in...</p>;
};

export default AuthCallback;
