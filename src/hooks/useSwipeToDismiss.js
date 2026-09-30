import { useDragControls } from "framer-motion";

// Wires up real swipe-down-to-close on a bottom-sheet modal. Every modal
// already has a cosmetic "drag handle" div — this makes it actually work.
//
// dragControls is bound ONLY to the handle (dragListener: false on the sheet
// itself), so dragging inside a scrollable form field never fights with
// dismissing the sheet — only touching the handle starts the gesture.
//
// Usage:
//   const { dragHandleProps, sheetProps } = useSwipeToDismiss(onClose);
//   <motion.div {...sheetProps} ...>
//     <div {...dragHandleProps} className="...">...</div>
export function useSwipeToDismiss(onClose) {
  const controls = useDragControls();

  return {
    dragHandleProps: {
      onPointerDown: (e) => controls.start(e),
    },
    sheetProps: {
      drag: "y",
      dragControls: controls,
      dragListener: false,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.5 },
      dragMomentum: false,
      onDragEnd: (_event, info) => {
        if (info.offset.y > 100 || info.velocity.y > 500) onClose();
      },
    },
  };
}
