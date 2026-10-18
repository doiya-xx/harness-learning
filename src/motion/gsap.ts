import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrollToPlugin)

export { gsap, ScrollTrigger, SplitText, useGSAP }
export const NO_REDUCE = '(prefers-reduced-motion: no-preference)'
export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
