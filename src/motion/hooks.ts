import { useEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP, NO_REDUCE, prefersReduced } from './gsap'

/** 1. Home hero entrance */
export function useHeroIntro(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(NO_REDUCE, () => {
      const split = SplitText.create('[data-hero-title]', { type: 'lines', mask: 'lines', autoSplit: true })
      const tl = gsap.timeline()
      tl.from(split.lines, { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.12 })
        .from('[data-hero-rest]', { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, '-=0.4')
      return () => split.revert()
    })
    return () => mm.revert()
  }, { scope })
}

/** 2. Ruler cursor bound to page scroll */
export function useRuler(cursor: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const el = cursor.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(NO_REDUCE, () => {
      gsap.fromTo(el, { y: 0 }, {
        y: () => window.innerHeight - 3, ease: 'none',
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3, invalidateOnRefresh: true },
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        gsap.set(el, { y: max > 0 ? (window.scrollY / max) * (window.innerHeight - 3) : 0 })
      }
      update()
      window.addEventListener('scroll', update, { passive: true })
      return () => window.removeEventListener('scroll', update)
    })
    return () => mm.revert()
  }, { scope: cursor })
}

/** 3. Learning path steps appear once */
export function useStepsReveal(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(NO_REDUCE, () => {
      gsap.from('[data-step]', {
        opacity: 0, y: 28, duration: 0.6, ease: 'power2.out', stagger: 0.15,
        scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true },
      })
    })
    return () => mm.revert()
  }, { scope })
}

/** 4. TOC highlight follows h2/h3 */
export function useTocSync(scope: RefObject<HTMLElement | null>, ids: string[], onActive: (id: string) => void) {
  useGSAP(() => {
    const root = scope.current
    if (!root || !ids.length) return
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    els.forEach((h, i) => {
      ScrollTrigger.create({
        trigger: h, start: 'top 30%', end: 'max',
        onEnter: () => onActive(h.id),
        onLeaveBack: () => onActive(els[i - 1]?.id ?? ''),
      })
    })
    ScrollTrigger.refresh()
  }, { scope, dependencies: [ids.join('|')], revertOnUpdate: true })
}

export function scrollToEl(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (prefersReduced()) {
    const y = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo(0, y)
  } else {
    gsap.to(window, { scrollTo: { y: el, offsetY: 80 }, duration: 0.6, ease: 'power2.inOut' })
  }
}

/** 5. Article switch feedback */
export function useArticleSwitch(scope: RefObject<HTMLElement | null>, key: string) {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(NO_REDUCE, () => {
      gsap.fromTo(scope.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'transform,opacity' })
    })
    return () => mm.revert()
  }, { scope, dependencies: [key], revertOnUpdate: true })
}

/** 6. Theme change colour transition */
export function themeFlash() {
  if (prefersReduced()) return
  const targets = document.querySelectorAll('[data-theme-anim]')
  const cs = getComputedStyle(document.documentElement)
  gsap.fromTo(targets,
    { backgroundColor: cs.getPropertyValue('--color-blue'), color: cs.getPropertyValue('--color-bg') },
    { backgroundColor: 'transparent', color: 'inherit', duration: 0.5, ease: 'power2.out', clearProps: 'backgroundColor,color' })
}

/** Refresh ScrollTrigger after route / layout change */
export function useRefreshOn(dep: unknown) {
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 50)
    return () => clearTimeout(t)
  }, [dep])
}
