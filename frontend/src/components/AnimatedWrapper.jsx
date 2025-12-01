import { motion } from "framer-motion";

export default function AnimatedWrapper({ children }) {
  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        backgroundImage: "url('/src/assets/food-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.15)",
          padding: "25px",
          borderRadius: "18px",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
          margin: "20px"
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}