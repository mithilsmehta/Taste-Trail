import React, { useEffect, useState } from "react";
import "../styles/auth.css";

import img1 from "../assets/img1.webp";
import img2 from "../assets/img2.webp";
import img3 from "../assets/img3.webp";
import img4 from "../assets/img4.webp";
import img5 from "../assets/img5.webp";
import img6 from "../assets/img6.webp";

const images = [img1, img2, img3, img4, img5, img6];

export default function AuthLayout({ children }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const slider = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(slider);
  }, []);

  return (
    <div className="auth-container">

      {/* LEFT IMAGE SLIDER */}
      <div className="auth-left">
        <img src={images[index]} className="auth-bg" />
      </div>

      {/* RIGHT FORM SECTION */}
      <div className="auth-right">
        <div className="auth-box shadow-lg">
          {children}
        </div>
      </div>

    </div>
  );
}
