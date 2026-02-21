"use client";
/**
 * ScrambleText
 * ─────────────────────────────────────────────────────────────
 * Renders a string that "decodes" from randomised hex characters
 * into the real value, left-to-right.  Perfect for hash displays.
 *
 * Props:
 *   text      – final string to reveal
 *   speed     – ms between each character reveal (default 18)
 *   className – forwarded to the wrapping <span>
 */

import { useEffect, useRef, useState } from "react";

const HEX = "0123456789abcdef";
const rand = (len: number) =>
  Array.from({ length: len }, () => HEX[Math.floor(Math.random() * HEX.length)]).join("");

interface Props {
  text: string;
  speed?: number;
  className?: string;
}

export default function ScrambleText({ text, speed = 18, className }: Props) {
  const [displayed, setDisplayed] = useState(() => rand(text.length));
  // Re-animate whenever `text` changes
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    // Reset to fully scrambled
    setDisplayed(rand(text.length));
    let index = 0;

    const tick = () => {
      index++;
      setDisplayed(textRef.current.slice(0, index) + rand(Math.max(0, text.length - index)));
      if (index < text.length) {
        id = window.setTimeout(tick, speed);
      }
    };

    let id = window.setTimeout(tick, speed);
    return () => window.clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <span className={className}>{displayed}</span>;
}
