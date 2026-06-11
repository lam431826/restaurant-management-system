import { useState, useEffect } from 'react'
import heroImg from '../assets/images/hero.png'

import Navbar from './Navbar'
import SocialBadge from './SocialBadge'
import InstagramIcon from '../assets/icons/InstagramIcon'
import FacebookIcon from '../assets/icons/FacebookIcon'
import TwitterIcon from '../assets/icons/TwitterIcon'
import MenuSection from './MenuSection'
import ReservationSection from './ReservationSection'
import AboutSection from './AboutSection'
import MenuNav from './MenuNav'
import Footer from './Footer'
import BlogSection from './BlogSection'
import BlogSingleSection from './BlogSingleSection'
import ContactSection from './ContactSection'

export default function Frontpage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="bg-[#0a0b0a]">
    <MenuNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

    {/* ── Navbar — fixed, follows scroll ── */}
    <Navbar
      className={`fixed top-10 left-10 z-30 bg-[#0a0b0a] flex gap-3 items-center justify-center p-2 rounded-xl transition-[border-color,box-shadow] duration-300 ease-out ${
        scrolled
          ? 'border border-[rgba(239,231,210,0.2)] shadow-lg shadow-black/40'
          : 'border border-transparent'
      }`}
      onMenuOpen={() => setMenuOpen(true)}
    />

    <section className="relative w-screen h-screen overflow-hidden">

      {/* ── Full-screen hero image ── */}
      <img
        src={heroImg}
        alt="Japanese cuisine"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
      />

      {/* ── Bottom gradient overlay ── */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-black opacity-70 pointer-events-none" />

      {/* ── Header text — bottom-left ── */}
      <div className="absolute left-[5%] bottom-[14%] z-[2] pointer-events-none select-none">
        <p
          className="text-[#face8d] leading-[0.9] m-0 animate-fade-up"
          style={{
            fontFamily: "'Bitter Rose', cursive",
            fontSize: 'clamp(52px, 8vw, 160px)',
            animationDelay: '200ms',
          }}
        >
          The pure taste of
        </p>
        <p
          className="text-white uppercase tracking-[3px] leading-none m-0 animate-fade-up"
          style={{
            fontFamily: 'Forum, serif',
            fontSize: 'clamp(46px, 8.5vw, 140px)',
            animationDelay: '350ms',
          }}
        >
          Japan
        </p>
      </div>

      {/* ── Social card — bottom-right ── */}
      <div
        className="absolute bottom-0 right-0 bg-[#0a0b0a] flex flex-col gap-6 items-start pb-4 pl-6 pr-4 pt-6 rounded-tl-[24px] z-[3] animate-fade-in"
        style={{ animationDelay: '500ms' }}
        style={{ isolation: 'isolate' }}
      >
        <RoundedCorner position="bottom-left" />
        <RoundedCorner position="top-right" />

        <div className="flex gap-2 items-center relative">
          <SocialBadge href="https://instagram.com" label="Instagram">
            <InstagramIcon />
          </SocialBadge>
          <SocialBadge href="https://facebook.com" label="Facebook">
            <FacebookIcon />
          </SocialBadge>
          <SocialBadge href="https://twitter.com" label="Twitter">
            <TwitterIcon />
          </SocialBadge>
        </div>
      </div>
    </section>
    <MenuSection />
    <ReservationSection />
    <AboutSection />
    <BlogSection />
    <BlogSingleSection />
    <ContactSection />
    <div className="px-6 pb-6">
      <Footer />
    </div>
    </div>
  )
}

function RoundedCorner({ position }) {
  const isBottomLeft = position === 'bottom-left'
  return (
    <div
      className={`absolute size-6 overflow-hidden ${
        isBottomLeft ? 'bottom-0 left-[-24px]' : 'top-[-24px] right-0'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 w-full h-full">
        <path
          d={isBottomLeft ? 'M24 24 Q0 24 0 0 L24 0 Z' : 'M0 0 Q24 0 24 24 L0 24 Z'}
          fill="#0a0b0a"
        />
      </svg>
    </div>
  )
}
