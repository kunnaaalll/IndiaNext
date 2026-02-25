"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useSpring,
  AnimatePresence,
  Variants,
} from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Zap,
  Bot,
  Shield,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Code,
  FileText,
  Video,
  Layout,
  Brain,
  Sparkles,
  Target,
  Presentation,
  Globe,
  Ban,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

// --- Theme Colors ---
const CYAN = "#00CCFF";
const ORANGE = "#FF6600";
const GREEN = "#00FF55";

// --- Animation Variants ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function RulesPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden">
      {/* Scroll Progress */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-white/5 z-[100]">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-cyan-400 origin-left shadow-[0_0_15px_rgba(255,102,0,0.6),0_0_5px_rgba(34,211,238,0.4)] relative"
          style={{ scaleX }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-full bg-white blur-sm opacity-50" />
        </motion.div>
      </div>

      {/* Background */}
      <CyberBackground />

      {/* Navbar */}
      <RulesNavbar />

      {/* Hero */}
      <RulesHero />

      {/* Tracks */}
      <IdeaSprintSection />
      <BuildStormSection />

      {/* AI Policy */}
      <AIUsagePolicySection />

      {/* Code of Conduct */}
      <CodeOfConductSection />

      {/* Final Authority */}
      <FinalAuthoritySection />

      {/* Footer CTA */}
      <FooterCTA />

      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]" />
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Navbar (Rules page variant)
// ─────────────────────────────────────────────────────────────
const RULES_NAV_LINKS = [
  { label: "./HOME", href: "/" },
  { label: "./IDEASPRINT", href: "#ideasprint" },
  { label: "./BUILDSTORM", href: "#buildstorm" },
  { label: "./AI_POLICY", href: "#ai-policy" },
  { label: "./CONDUCT", href: "#conduct" },
  { label: "./FAQ", href: "/faq" },
];

const RulesNavbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-transparent backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 via-cyan-400 to-green-500 rounded-lg opacity-30 blur-md group-hover:opacity-60 transition-opacity" />
              <div className="relative w-full h-full border border-white/20 bg-black/60 rounded-lg flex items-center justify-center backdrop-blur-sm overflow-hidden p-1">
                <Image src="/logo-new.png" alt="IndiaNext Logo" width={32} height={32} className="object-contain" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="font-black text-lg md:text-xl tracking-tighter leading-none">
                INDIA<span className="text-orange-500">NEXT</span>
              </span>
              <span className="text-[0.5rem] md:text-[0.55rem] text-gray-500 tracking-[0.3em] md:tracking-[0.4em] font-mono font-bold">DEPLOYMENT_2026</span>
            </div>
          </Link>

          {/* Mobile: KES logos + hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image src="/kessc-logo-Photoroom.png" alt="KES Logo" width={44} height={44} className="object-contain sm:w-[52px] sm:h-[52px]" />
              <Image src="/KES 90 years logo in PNG format-01.png" alt="KES 90 Years" width={64} height={40} className="object-contain opacity-90 sm:w-[80px] sm:h-[48px]" />
            </div>
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-sm bg-white/5 active:bg-white/10 transition-colors" aria-label="Open menu">
              <Menu size={20} className="text-white" />
            </button>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10 text-[10px] font-bold text-gray-400 font-mono tracking-widest">
            {RULES_NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white transition-colors relative group">
                {link.label === "./HOME" && <ArrowLeft size={12} className="inline mr-1" />}
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-orange-500 transition-all group-hover:w-full" />
              </Link>
            ))}
            <Link
              href="/register"
              className="group relative px-6 py-2.5 overflow-hidden rounded-sm bg-orange-500 text-black font-black hover:text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]"
            >
              <div className="absolute inset-0 w-full h-full bg-[#020202] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2 text-[10px] tracking-widest uppercase italic">
                REGISTER <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <div className="flex items-center gap-5 ml-2 pl-6 border-l border-white/10 group/kes cursor-pointer pointer-events-auto">
              <Image src="/kessc-logo-Photoroom.png" alt="KES Logo" width={72} height={72} className="object-contain group-hover/kes:-translate-y-1 transition-transform duration-300 opacity-100" />
              <Image src="/KES 90 years logo in PNG format-01.png" alt="KES 90 Years" width={112} height={64} className="object-contain opacity-90 group-hover/kes:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed top-0 right-0 bottom-0 w-72 z-[70] bg-[#050505] border-l border-white/10 md:hidden flex flex-col">
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
                <span className="font-mono text-[10px] font-black tracking-[0.5em] text-gray-500 uppercase">NAVIGATION</span>
                <button onClick={() => setSidebarOpen(false)} className="w-9 h-9 flex items-center justify-center border border-white/10 rounded-sm bg-white/5 active:bg-white/10 transition-colors" aria-label="Close menu">
                  <X size={18} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-5">
                <div className="flex flex-col gap-1">
                  {RULES_NAV_LINKS.map((link, i) => (
                    <motion.div key={link.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={link.href} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-sm group">
                        <span className="w-6 text-[10px] font-mono font-black text-gray-700 group-hover:text-orange-500 transition-colors">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase">{link.label}</span>
                        <ChevronRight size={14} className="ml-auto text-gray-800 group-hover:text-orange-500 transition-colors" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 px-4">
                  <Link href="/register" onClick={() => setSidebarOpen(false)} className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 text-black font-mono text-xs font-black tracking-widest uppercase rounded-sm active:scale-95 transition-transform shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                    REGISTER <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </div>
              <div className="px-5 py-6 border-t border-white/5">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Image src="/kessc-logo-Photoroom.png" alt="KES Logo" width={48} height={48} className="object-contain opacity-100" />
                  <Image src="/KES 90 years logo in PNG format-01.png" alt="KES 90 Years" width={80} height={44} className="object-contain opacity-90" />
                </div>
                <p className="text-center font-mono text-[8px] text-gray-700 tracking-[0.3em] uppercase font-bold">K.E.S. SHROFF COLLEGE</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
const RulesHero = () => (
  <section className="relative z-10 min-h-[70vh] flex flex-col items-center justify-center pt-28 pb-16 px-4">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,102,0,0.06),transparent_60%)]" />

    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="text-center relative z-20 max-w-5xl mx-auto"
    >
      {/* Badge */}
      <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-5 py-2 border border-orange-500/20 bg-orange-500/5 rounded-full mb-10 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="font-mono text-[9px] text-orange-400 tracking-[0.5em] font-black uppercase">
          Official Rulebook v1.0
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1 variants={fadeInUp} className="text-6xl md:text-[10rem] font-black leading-[0.8] tracking-tighter uppercase italic mb-6">
        <span className="block text-transparent bg-clip-text bg-gradient-to-br from-orange-500 via-white to-cyan-400 drop-shadow-[0_0_40px_rgba(255,100,0,0.4)]">
          RULES
        </span>
      </motion.h1>

      <motion.p variants={fadeInUp} className="text-gray-500 text-lg md:text-xl font-bold tracking-tight max-w-2xl mx-auto mb-8">
        INDIANEXT: FutureProof India Hackathon — the complete mission parameters, engagement rules, and operational protocol.
      </motion.p>

      {/* Quick Nav Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-12">
        {[
          { icon: <Lightbulb size={20} />, label: "IdeaSprint", href: "#ideasprint", color: GREEN },
          { icon: <Zap size={20} />, label: "BuildStorm", href: "#buildstorm", color: ORANGE },
          { icon: <Bot size={20} />, label: "AI Policy", href: "#ai-policy", color: CYAN },
          { icon: <Shield size={20} />, label: "Conduct", href: "#conduct", color: "#f59e0b" },
        ].map((item, i) => (
          <Link key={i} href={item.href}>
            <motion.div
              whileHover={{ y: -4, scale: 1.03 }}
              className="p-5 border border-white/10 bg-white/[0.02] rounded-sm hover:border-white/20 transition-all text-center group cursor-pointer"
            >
              <div className="mx-auto mb-3 transition-colors" style={{ color: item.color }}>
                {item.icon}
              </div>
              <p className="text-[10px] font-mono font-black tracking-[0.3em] uppercase text-gray-500 group-hover:text-white transition-colors">
                {item.label}
              </p>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Reusable building blocks
// ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  number: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
}

const SectionHeader = ({ number, title, subtitle, accent, icon }: SectionHeaderProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="mb-16 text-center"
  >
    <div className="inline-flex items-center gap-3 mb-6">
      <div className="text-2xl" style={{ color: accent }}>{icon}</div>
      <span className="font-mono text-[10px] font-black tracking-[0.5em] uppercase" style={{ color: accent }}>
        SECTION_{number}
      </span>
    </div>
    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.85] mb-4">
      {title}
    </h2>
    <div className="flex items-center justify-center gap-4 font-mono text-[10px] tracking-[0.5em] font-black uppercase" style={{ color: accent }}>
      <div className="w-12 h-px" style={{ backgroundColor: `${accent}50` }} />
      {subtitle}
      <div className="w-12 h-px" style={{ backgroundColor: `${accent}50` }} />
    </div>
  </motion.div>
);

interface RuleCardProps {
  index: number;
  text: string;
  accent: string;
}

const RuleCard = ({ index, text, accent }: RuleCardProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ x: 8 }}
    className="flex items-start gap-5 p-5 border border-white/5 bg-white/[0.02] rounded-sm hover:border-white/10 transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full transition-all duration-300" style={{ backgroundColor: accent }} />
    <div
      className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center text-xs font-black font-mono border"
      style={{ borderColor: `${accent}40`, color: accent, backgroundColor: `${accent}10` }}
    >
      {String(index + 1).padStart(2, "0")}
    </div>
    <p className="text-gray-300 text-sm leading-relaxed font-medium">{text}</p>
  </motion.div>
);

interface EvalCardProps {
  icon: React.ReactNode;
  title: string;
  accent: string;
  index: number;
}

const EvalCard = ({ icon, title, accent, index }: EvalCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.06 }}
    whileHover={{ y: -6, scale: 1.02 }}
    className="p-6 border border-white/10 bg-[#050505] rounded-sm hover:border-white/20 transition-all text-center relative overflow-hidden group"
  >
    <div className="absolute top-0 left-0 right-0 h-px group-hover:bg-gradient-to-r from-transparent to-transparent transition-all" style={{ backgroundImage: `linear-gradient(to right, transparent, ${accent}, transparent)` }} />
    <div className="mx-auto mb-4 transition-transform group-hover:scale-110" style={{ color: accent }}>
      {icon}
    </div>
    <p className="text-[11px] font-mono font-black tracking-[0.2em] uppercase text-gray-400 group-hover:text-white transition-colors">
      {title}
    </p>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// Section 1 — IdeaSprint
// ─────────────────────────────────────────────────────────────
const IdeaSprintSection = () => {
  const rules = [
    "This is an open innovation track — teams may choose any real-world problem aligned with the hackathon domains.",
    "The idea must be original and not a previously built or commercially deployed project.",
    "Previously created concepts are allowed only if significant improvements and new implementation are demonstrated.",
    "A prototype, mockup, or proof-of-concept must be submitted along with the pitch.",
    "Plagiarism or copied content will lead to immediate disqualification.",
    "The organizing committee's decision will be final in case of disputes.",
  ];

  const submissions = [
    { icon: <FileText size={20} />, label: "Idea Deck", detail: "Max 10 slides" },
    { icon: <Video size={20} />, label: "Pitch Video", detail: "3 minutes max" },
    { icon: <Layout size={20} />, label: "Prototype", detail: "Figma / Wireframe / Demo / POC Code" },
  ];

  const evalCriteria = [
    { icon: <Sparkles size={24} />, title: "Creativity & Innovation" },
    { icon: <Target size={24} />, title: "Problem Relevance" },
    { icon: <Globe size={24} />, title: "Social Impact" },
    { icon: <Brain size={24} />, title: "Feasibility & Scalability" },
    { icon: <Code size={24} />, title: "Prototype Quality" },
    { icon: <Presentation size={24} />, title: "Presentation" },
  ];

  return (
    <section id="ideasprint" className="py-32 relative z-10 bg-[#020202] border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          number="01"
          title="IdeaSprint"
          subtitle="OPEN_INNOVATION_TRACK"
          accent={GREEN}
          icon={<Lightbulb size={28} />}
        />

        {/* Objective */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 p-8 border border-white/10 bg-white/[0.02] rounded-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-4" style={{ color: GREEN }}>
             MISSION_OBJECTIVE
          </h3>
          <p className="text-gray-300 leading-relaxed text-base">
            Participants must conceptualize, design, and present an innovative solution addressing a real-world problem.
            Teams are expected to submit a prototype or proof-of-concept that demonstrates the feasibility of their idea.
          </p>
        </motion.div>

        {/* Rules */}
        <div className="mb-16">
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
             ENGAGEMENT_RULES
          </h3>
          <div className="flex flex-col gap-3">
            {rules.map((rule, i) => (
              <RuleCard key={i} index={i} text={rule} accent={GREEN} />
            ))}
          </div>
        </div>

        {/* Submission Requirements */}
        <div className="mb-16">
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
             SUBMISSION_REQUIREMENTS
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {submissions.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-6 border border-white/10 bg-[#050505] rounded-sm text-center group hover:border-green-500/30 transition-all"
              >
                <div className="mx-auto mb-3 text-green-400 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <p className="text-white font-black text-lg mb-1">{item.label}</p>
                <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Evaluation */}
        <div>
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
            🏆 EVALUATION_MATRIX
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {evalCriteria.map((item, i) => (
              <EvalCard key={i} index={i} icon={item.icon} title={item.title} accent={GREEN} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Section 2 — BuildStorm
// ─────────────────────────────────────────────────────────────
const BuildStormSection = () => {
  const rules = [
    "This is a category-based track (TrustTech, HealthTech, EdTech, ClimateTech, Digital Inclusion).",
    "Teams must select ONE category and build strictly within that domain.",
    "The solution must directly address the chosen problem statement.",
    "The MVP must be developed during the official 24-hour hackathon period.",
    "Use of APIs, frameworks, SDKs, and libraries is permitted.",
    "Pre-built UI templates are allowed; however, core logic and implementation must be completed during the event.",
    "A fully working demo is mandatory for evaluation.",
    "Incomplete, non-functional, or copied projects will be disqualified.",
  ];

  const evalCriteria = [
    { icon: <Brain size={24} />, title: "Problem Understanding" },
    { icon: <Code size={24} />, title: "Technical Implementation" },
    { icon: <CheckCircle2 size={24} />, title: "Functionality & Demo" },
    { icon: <Target size={24} />, title: "Practical Feasibility" },
    { icon: <Layout size={24} />, title: "UX & Design" },
    { icon: <Sparkles size={24} />, title: "Innovation & Scalability" },
    { icon: <Presentation size={24} />, title: "Final Presentation" },
  ];

  return (
    <section id="buildstorm" className="py-32 relative z-10 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          number="02"
          title="BuildStorm"
          subtitle="24HR_DEVELOPMENT_TRACK"
          accent={ORANGE}
          icon={<Zap size={28} />}
        />

        {/* Objective */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 p-8 border border-white/10 bg-white/[0.02] rounded-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-4" style={{ color: ORANGE }}>
             MISSION_OBJECTIVE
          </h3>
          <p className="text-gray-300 leading-relaxed text-base">
            Participants must design and develop a working Minimum Viable Product (MVP) within 24 hours
            based on a selected or assigned problem statement.
          </p>
        </motion.div>

        {/* 24-Hour Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-16 p-6 border-2 border-orange-500/30 bg-orange-500/5 rounded-sm text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock size={24} className="text-orange-500" />
            <span className="text-3xl font-black text-orange-500 tracking-tighter">24 HOURS</span>
          </div>
          <p className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase">
            Problem Solving &amp; MVP Build Challenge
          </p>
        </motion.div>

        {/* Rules */}
        <div className="mb-16">
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
             ENGAGEMENT_RULES
          </h3>
          <div className="flex flex-col gap-3">
            {rules.map((rule, i) => (
              <RuleCard key={i} index={i} text={rule} accent={ORANGE} />
            ))}
          </div>
        </div>

        {/* Evaluation */}
        <div>
          <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
            🏆 EVALUATION_MATRIX
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {evalCriteria.map((item, i) => (
              <EvalCard key={i} index={i} icon={item.icon} title={item.title} accent={ORANGE} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Section 3 — AI Usage Policy
// ─────────────────────────────────────────────────────────────
const AIUsagePolicySection = () => {
  const allowed = [
    "Code suggestions and autocompletion",
    "Debugging assistance and error resolution",
    "Documentation writing and formatting",
    "UI/UX ideas and design inspiration",
    "Research & concept validation",
  ];

  const restrictions = [
    "AI-generated content must be understood by the participant.",
    "Blind copy-pasting without understanding may result in penalties.",
    "Submitting a fully AI-generated or pre-built project is strictly prohibited.",
    "All final integration, implementation, and deployment must be done by the team.",
    "Judges may ask technical questions to verify authorship.",
    "Failure to justify your solution may lead to score reduction or disqualification.",
  ];

  return (
    <section id="ai-policy" className="py-32 relative z-10 bg-[#020202] border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          number="03"
          title="AI Policy"
          subtitle="APPLICABLE_TO_ALL_TRACKS"
          accent={CYAN}
          icon={<Bot size={28} />}
        />

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 p-8 border border-white/10 bg-white/[0.02] rounded-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <p className="text-gray-300 leading-relaxed text-base">
            AI tools are <strong className="text-cyan-400">permitted</strong> but must be used
            <strong className="text-cyan-400"> responsibly</strong>. Tools include ChatGPT, GitHub Copilot, Gemini, and others.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Allowed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 border border-green-500/20 bg-green-500/[0.03] rounded-sm"
          >
            <h3 className="flex items-center gap-3 font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6" style={{ color: GREEN }}>
              <CheckCircle2 size={18} /> ALLOWED_USES
            </h3>
            <div className="flex flex-col gap-3">
              {allowed.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 size={14} className="text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Restrictions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 border border-red-500/20 bg-red-500/[0.03] rounded-sm"
          >
            <h3 className="flex items-center gap-3 font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-red-400">
              <AlertTriangle size={18} /> RESTRICTIONS
            </h3>
            <div className="flex flex-col gap-3">
              {restrictions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <AlertTriangle size={14} className="text-red-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Section 4 — Code of Conduct
// ─────────────────────────────────────────────────────────────
const CodeOfConductSection = () => {
  const mustDo = [
    "Maintain respectful communication at all times.",
    "Avoid harassment, discrimination, or offensive behavior.",
    "Follow instructions provided by the organizing committee.",
    "Refrain from cheating, plagiarism, or unethical practices.",
    "Respect intellectual property rights.",
    "Avoid disruptive or malicious technical activities.",
  ];

  const prohibited = [
    "Using pre-built complete projects.",
    "Tampering with other teams' work.",
    "Offensive or abusive communication.",
    "Spamming, hacking, or network misuse.",
    "Impersonation or false identity.",
  ];

  const penalties = [
    { icon: <AlertTriangle size={20} />, label: "Score Deduction", color: "#f59e0b" },
    { icon: <XCircle size={20} />, label: "Immediate Disqualification", color: "#ef4444" },
    { icon: <Ban size={20} />, label: "Ban from Future Events", color: "#dc2626" },
  ];

  return (
    <section id="conduct" className="py-32 relative z-10 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          number="04"
          title="Code of Conduct"
          subtitle="MISSION_PROTOCOL"
          accent="#f59e0b"
          icon={<Shield size={28} />}
        />

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 p-8 border border-white/10 bg-white/[0.02] rounded-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          <p className="text-gray-300 leading-relaxed text-base">
            All participants, mentors, judges, and organizers are expected to maintain
            <strong className="text-amber-400"> professionalism</strong> and <strong className="text-amber-400">respect</strong> throughout the event.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Must */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 border border-green-500/20 bg-green-500/[0.03] rounded-sm"
          >
            <h3 className="flex items-center gap-3 font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6" style={{ color: GREEN }}>
              <CheckCircle2 size={18} /> PARTICIPANTS_MUST
            </h3>
            <div className="flex flex-col gap-3">
              {mustDo.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 size={14} className="text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Prohibited */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 border border-red-500/20 bg-red-500/[0.03] rounded-sm"
          >
            <h3 className="flex items-center gap-3 font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-red-400">
              <XCircle size={18} /> PROHIBITED_ACTIONS
            </h3>
            <div className="flex flex-col gap-3">
              {prohibited.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <XCircle size={14} className="text-red-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Penalties */}
        <h3 className="font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-gray-500">
          ⚡ VIOLATION_CONSEQUENCES
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {penalties.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 border border-white/10 bg-[#050505] rounded-sm text-center group hover:border-red-500/30 transition-all"
            >
              <div className="mx-auto mb-3" style={{ color: p.color }}>
                {p.icon}
              </div>
              <p className="text-gray-400 font-black text-sm uppercase tracking-wider">{p.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Final Authority Clause
// ─────────────────────────────────────────────────────────────
const FinalAuthoritySection = () => (
  <section className="py-24 relative z-10 bg-[#020202] border-t border-white/5">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-10 border-2 border-amber-500/30 bg-amber-500/[0.03] rounded-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
        <Scale size={40} className="mx-auto mb-6 text-amber-500" />
        <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">
          Final Authority Clause
        </h3>
        <div className="flex items-center justify-center gap-4 font-mono text-[10px] tracking-[0.5em] font-black uppercase text-amber-500 mb-6">
          <div className="w-8 h-px bg-amber-500/30" />
          SECTION_05
          <div className="w-8 h-px bg-amber-500/30" />
        </div>
        <p className="text-gray-300 leading-relaxed text-base max-w-xl mx-auto">
          The decision of the organizing committee and judges will be <strong className="text-amber-400">final and binding</strong> in
          all matters related to evaluation, disputes, and eligibility.
        </p>
      </motion.div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Footer CTA
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Footer CTA
// ─────────────────────────────────────────────────────────────
const FooterCTA = () => (
  <footer className="py-32 border-t border-white/5 bg-black relative z-10">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic mb-6">
          Ready to <span className="text-orange-500">Deploy</span>?
        </h2>
        <p className="text-gray-500 text-lg font-bold tracking-tight mb-12 max-w-xl mx-auto">
          You&apos;ve read the rules. Now join the mission.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            href="/register"
            className="group relative px-10 py-4 overflow-hidden rounded-sm bg-orange-500 text-black font-black hover:text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]"
          >
            <div className="absolute inset-0 w-full h-full bg-[#020202] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-3 text-sm tracking-widest uppercase italic">
              REGISTER NOW <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href="/"
            className="px-10 py-4 border border-white/10 rounded-sm text-gray-400 font-black text-sm tracking-widest uppercase italic hover:text-white hover:border-white/20 transition-all"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </motion.div>

      <div className="mt-24 pt-12 border-t border-white/5">
        <p className="text-gray-800 text-[8px] font-mono tracking-[0.8em] font-black uppercase">
          &copy; 2026 INDIANEXT // ALL_RIGHTS_RESERVED // POWERED_BY_KESSC
        </p>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────────────────────────
// Cyber Background
// ─────────────────────────────────────────────────────────────
const CyberBackground = () => (
  <div className="fixed inset-0 z-0 bg-[#050505] perspective-1000 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#0d0d1a_0%,#000000_100%)]" />
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
      transition={{ duration: 10, repeat: Infinity }}
      className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-orange-600 rounded-full blur-[200px] mix-blend-screen"
    />
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.08, 0.05] }}
      transition={{ duration: 15, repeat: Infinity, delay: 2 }}
      className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-600 rounded-full blur-[200px] mix-blend-screen"
    />
    <div className="absolute bottom-[-10%] left-[-50%] right-[-50%] h-[80vh] bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [transform:rotateX(75deg)] origin-bottom animate-grid-flow opacity-30" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20" />
  </div>
);
