import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthLayout({ children }) {
  const images = [
    "/src/assets/auth/img1.jpg",
    "/src/assets/auth/img2.jpg",
    "/src/assets/auth/img3.jpg",
    "/src/assets/auth/img4.jpg",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="d-flex min-vh-100">

      {/* LEFT SIDE SLIDESHOW */}
      <div
        className="d-none d-md-block"
        style={{
          width: "95%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={images[index]}
            src={images[index]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              width: "100%",
              height: "100vh",
              objectFit: "cover",
            }}
          />
        </AnimatePresence>
      </div>

      {/* RIGHT SIDE FORM */}
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          width: "100%",
          background: "white",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}