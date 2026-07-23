import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { shouldShowAds } from "../utils/subscription";
import "./AdSlot.css";

export default function AdSlot({ placement = "default", label = "Advertisement" }) {
  const { user } = useContext(AuthContext);

  if (!shouldShowAds(user)) return null;

  return (
    <aside className={`ad-slot ad-slot-${placement}`} aria-label={label}>
      <span>{label}</span>
      <strong>Ad space</strong>
    </aside>
  );
}
