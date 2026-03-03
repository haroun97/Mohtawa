import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const SHEET_WIDTH = 288; // w-72

interface ToolSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Contextual tool panel that slides in from the right.
 * Used for Adjust, Audio, Captions, Trim when the corresponding tool is selected.
 * Default state = closed (no permanent sidebar).
 */
export function ToolSheet({ isOpen, onClose, title, children }: ToolSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
          className="fixed right-0 top-0 bottom-0 z-[210] flex flex-col overflow-hidden rounded-l-2xl border-l border-border/50 bg-editor-surface/95 backdrop-blur-md shadow-2xl"
          style={{ width: SHEET_WIDTH }}
          aria-label={title}
        >
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-editor-surface-hover transition-colors text-white/70 hover:text-white"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 text-white">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
