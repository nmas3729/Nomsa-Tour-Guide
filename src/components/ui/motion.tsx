"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import type { Variants } from "framer-motion";

const easeOut = [0.25, 0.1, 0.25, 1] as const;

export function createMotionVariants(reducedMotion: boolean) {
  const duration = reducedMotion ? 0 : 0.5;

  return {
    fadeUp: {
      hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
      visible: { opacity: 1, y: 0, transition: { duration, ease: easeOut } },
    },
    fadeLeft: {
      hidden: { opacity: 0, x: reducedMotion ? 0 : 20 },
      visible: { opacity: 1, x: 0, transition: { duration, ease: easeOut } },
    },
    fadeRight: {
      hidden: { opacity: 0, x: reducedMotion ? 0 : -20 },
      visible: { opacity: 1, x: 0, transition: { duration, ease: easeOut } },
    },
    blurReveal: {
      hidden: { opacity: 0, filter: reducedMotion ? "blur(0px)" : "blur(10px)", y: reducedMotion ? 0 : 12 },
      visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration, ease: easeOut } },
    },
    scaleReveal: {
      hidden: { opacity: 0, scale: reducedMotion ? 1 : 0.96 },
      visible: { opacity: 1, scale: 1, transition: { duration: reducedMotion ? 0 : 0.45, ease: easeOut } },
    },
    staggerContainer: {
      hidden: {},
      visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.08 } },
    },
    staggerChildren: {
      hidden: { opacity: 0, y: reducedMotion ? 0 : 14 },
      visible: { opacity: 1, y: 0, transition: { duration, ease: easeOut } },
    },
    floating: {
      rest: { y: 0 },
      hover: { y: reducedMotion ? 0 : -4, transition: { duration: 0.2, ease: easeOut } },
    },
    slowRotate: {
      rest: { rotate: 0 },
      hover: { rotate: reducedMotion ? 0 : 2, transition: { duration: 0.25, ease: easeOut } },
    },
    cardHover: {
      rest: { y: 0, scale: 1 },
      hover: { y: reducedMotion ? 0 : -4, scale: reducedMotion ? 1 : 1.01, transition: { duration: 0.22, ease: easeOut } },
    },
    buttonHover: {
      rest: { scale: 1 },
      hover: { scale: reducedMotion ? 1 : 1.025, transition: { duration: 0.16, ease: easeOut } },
    },
    imageReveal: {
      hidden: { opacity: 0, scale: reducedMotion ? 1 : 1.03 },
      visible: { opacity: 1, scale: 1, transition: { duration: reducedMotion ? 0 : 0.65, ease: easeOut } },
    },
    pageTransition: {
      hidden: { opacity: 0, y: reducedMotion ? 0 : 4 },
      visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.24, ease: easeOut } },
    },
  } satisfies Record<string, Variants>;
}

export function FadeIn({
  children,
  ...props
}: ComponentProps<typeof motion.div>) {
  const reducedMotion = useReducedMotion();
  const variants = createMotionVariants(Boolean(reducedMotion));
  return (
    <motion.div
      initial={false}
      whileInView="visible"
      variants={variants.fadeUp}
      viewport={{ once: true, margin: "-60px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeInScale({
  children,
  ...props
}: ComponentProps<typeof motion.div>) {
  const reducedMotion = useReducedMotion();
  const variants = createMotionVariants(Boolean(reducedMotion));
  return (
    <motion.div
      initial={false}
      whileInView="visible"
      variants={variants.scaleReveal}
      viewport={{ once: true, margin: "-40px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  direction = "up",
  ...props
}: ComponentProps<typeof motion.div> & { direction?: "up" | "down" | "left" | "right" }) {
  const reducedMotion = useReducedMotion();
  const offsets = { up: { y: 24 }, down: { y: -24 }, left: { x: 24 }, right: { x: -24 } };
  const variants: Variants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, ...offsets[direction] },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: reducedMotion ? 0 : 0.5, ease: easeOut } },
  };
  return (
    <motion.div
      initial={false}
      whileInView="visible"
      variants={variants}
      viewport={{ once: true, margin: "-40px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const variants = createMotionVariants(Boolean(reducedMotion));
  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={variants.pageTransition}
    >
      {children}
    </motion.div>
  );
}
