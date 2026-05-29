import React, { useEffect, useState } from "react";
import "../styles/auth.css";

import img1 from "../assets/img1.jpg";
import img2 from "../assets/img2.jpg";
import img3 from "../assets/img3.jpg";
import img4 from "../assets/img4.jpg";
import img5 from "../assets/img5.jpg";
import img6 from "../assets/img6.jpg";

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