import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { shouldShowAds } from "../utils/subscription";

const scriptId = "tastewise-adsense";
const defaultClientId = "ca-pub-4660903158720316";

export default function AdSenseLoader() {
  const { user, authReady } = useContext(AuthContext);

  useEffect(() => {
    const existingScript = document.getElementById(scriptId);
    const shouldLoad = authReady && Boolean(user) && shouldShowAds(user);

    if (!shouldLoad) {
      existingScript?.remove();
      return;
    }

    if (existingScript) return;

    const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || defaultClientId;
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    document.head.appendChild(script);
  }, [authReady, user]);

  return null;
}
