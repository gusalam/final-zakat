import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashLogo from '@/assets/splash-logo.webp';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onCompleteRef.current(), 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.img
            src={splashLogo}
            alt="Logo Masjid Al-Ikhlas"
            className="w-28 h-28 rounded-full bg-primary-foreground/20 p-1 mb-6"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
          <motion.h1
            className="text-2xl md:text-4xl font-serif font-bold text-primary-foreground text-center px-4"
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 12,
              mass: 1,
              delay: 0.3,
            }}
          >
            Sistem Zakat
          </motion.h1>
          <motion.p
            className="text-primary-foreground/90 text-lg font-serif mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Masjid Al-Ikhlas
          </motion.p>
          <motion.p
            className="text-primary-foreground/60 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            Kebon Baru
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
