import { useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheetModal({ isOpen, onClose, title, children }: BottomSheetModalProps) {
  
  // Body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 999,
            }}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--panel-bg)',
              borderTopLeftRadius: 'var(--border-radius-lg)',
              borderTopRightRadius: 'var(--border-radius-lg)',
              padding: '24px',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
              zIndex: 1000,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Grabber Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }} />
            </div>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600 }}>{title}</h2>
            
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
