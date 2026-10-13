"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";

/**
 * Estado e navegação de um carrossel baseado em CSS scroll-snap.
 * O scroll nativo cuida do swipe no mobile; o hook sincroniza o índice ativo
 * e oferece navegação por botões, indicadores e teclado.
 */
export function useCarousel(slideCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track || slideCount === 0) return;
      const target = (index + slideCount) % slideCount; // navegação circular
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    },
    [slideCount],
  );

  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex((current) => (current === index ? current : index));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    },
    [next, prev],
  );

  return { trackRef, activeIndex, goTo, next, prev, handleScroll, handleKeyDown };
}
