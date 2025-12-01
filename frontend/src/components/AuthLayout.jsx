import React, { useEffect, useState } from "react";
import "../styles/auth.css";

const images = [
  "/src/assets/img1.jpg",
  "/src/assets/img2.jpg",
  "/src/assets/img3.jpg",
  "/src/assets/img4.jpg",
  "/src/assets/img5.jpg",
  "/src/assets/img6.jpg",
];

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