
"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from "framer-motion";
import { ArrowRight, Code, Cpu, Globe, Rocket, Terminal, Zap, Shield, Radio, Lock, Activity } from "lucide-react";

// --- Theme Colors ---
const CYAN = "#00CCFF";
const ORANGE = "#FF6600";
const GREEN = "#00FF55";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden">
      <AnimatePresence>
        {loading && <OpeningSequence onComplete={() => setLoading(false)} />}
      </AnimatePresence>
      
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <CyberBackground />
          <Navbar />
          <HeroSection />
          <HighStakesTicker />
          <TracksSection />
          <AboutSection />
          <Footer />
        </motion.div>
      )}
    </div>
  );
}

// --- Opening Sequence ---
const OpeningSequence = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [text, setText] = useState("INITIALIZING SYSTEM...");
    
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 2;
            });
        }, 30);

        const texts = [
            "ESTABLISHING SECURE CONNECTION...",
            "VERIFYING CREDENTIALS...",
            "LOADING ASSETS...",
            "DECRYPTING MISSION FILES...",
            "ACCESS GRANTED."
        ];
        
        // Cycle texts
        let textIdx = 0;
        const textInterval = setInterval(() => {
            if (textIdx < texts.length) {
                setText(texts[textIdx]);
                textIdx++;
            }
        }, 800);

        setTimeout(onComplete, 4500);

        return () => {
            clearInterval(interval);
            clearInterval(textInterval);
        };
    }, [onComplete]);

    return (
        <motion.div 
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono"
        >
             <div className="w-64 md:w-96 relative">
                 <div className="flex justify-between text-xs text-green-500 mb-2">
                     <span>BOOT_SEQUENCE_V2.0.26</span>
                     <span>{progress}%</span>
                 </div>
                 <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                     <motion.div 
                        className="h-full bg-gradient-to-r from-orange-500 via-white to-green-500"
                        style={{ width: `${progress}%` }}
                     />
                 </div>
                 <p className="mt-4 text-center text-cyan-400 text-sm animate-pulse tracking-widest">{text}</p>
             </div>
             
             {/* Background Matrix Effect (Simplified) */}
             <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-50" />
        </motion.div>
    );
};

// --- Components ---

const Navbar = () => (
  <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
         <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 via-white to-green-500 rounded-full opacity-20 group-hover:opacity-40 blur-md transition-opacity" />
            <div className="relative w-full h-full border border-white/20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
               <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-green-500 group-hover:scale-110 transition-transform" />
            </div>
         </div>
         <div className="flex flex-col">
            <span className="font-bold text-xl tracking-wider leading-none">INDIA<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-300">NEXT</span></span>
            <span className="text-[0.6rem] text-gray-500 tracking-[0.2em] font-mono">GEN_2026</span>
         </div>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400 font-mono">
        <Link href="#about" className="hover:text-cyan-400 transition-colors">./ABOUT</Link>
        <Link href="#tracks" className="hover:text-green-400 transition-colors">./TRACKS</Link>
        
        <Link 
          href="/register" 
          className="group relative px-6 py-2 overflow-hidden rounded bg-white text-black font-bold hover:text-white transition-colors"
        >
          <div className="absolute inset-0 w-full h-full bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10 flex items-center gap-2">
            INITIALIZE <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  </nav>
);

const HeroSection = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 px-4 group overflow-hidden"
    >
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,85,0.03),transparent_50%)]" />
       
       <motion.div 
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 1, ease: "easeOut" }}
         className="text-center relative z-20 max-w-6xl mx-auto"
       >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-500/10 rounded-sm mb-12 backdrop-blur-md animate-pulse">
             <Lock size={12} className="text-red-500" />
             <span className="font-mono text-xs text-red-500 tracking-[0.3em] font-bold">CLASSIFIED ACCESS ONLY</span>
          </div>

          {/* Main Title with 3D Interaction */}
          <h1 className="text-6xl md:text-[12rem] font-black leading-none tracking-tighter mb-4 relative z-10 mix-blend-screen scale-y-110">
             <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF6600] via-white to-[#00FF55] drop-shadow-[0_0_30px_rgba(255,100,0,0.5)]">IndiaNext</span>
          </h1>
          
          <h2 className="text-xl md:text-3xl font-mono text-cyan-400 tracking-[0.5em] mb-12 opacity-80 uppercase">
              Build The Infrastructure Of Tomorrow
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-8">
              <Link href="/register" className="relative group w-full sm:w-auto">
                 <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-green-500 rounded-sm blur opacity-40 group-hover:opacity-100 transition duration-200 animate-tilt"></div>
                 <button className="relative w-full sm:w-auto px-12 py-6 bg-black border border-white/20 rounded-sm leading-none flex items-center justify-center gap-6 group-hover:bg-zinc-900 transition-colors">
                    <span className="flex flex-col items-start">
                         <span className="text-[0.6rem] text-gray-500 font-mono tracking-widest mb-1">OPERATIVE ID REQUIRED</span>
                         <span className="text-2xl text-white font-bold tracking-widest group-hover:text-green-400 transition-colors">ENTER SYSTEM</span>
                    </span>
                    <ArrowRight className="text-orange-500 group-hover:translate-x-2 transition-transform" />
                 </button>
              </Link>
          </div>
       </motion.div>
    </section>
  );
};

const HighStakesTicker = () => {
    return (
        <div className="relative z-20 py-8 bg-black border-y border-white/10 overflow-hidden">
             <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
                 <div>
                     <p className="text-gray-500 font-mono text-xs mb-1">PRIZE POOL</p>
                     <p className="text-3xl md:text-5xl font-bold text-white tracking-tight">₹10L+</p>
                 </div>
                 <div>
                     <p className="text-gray-500 font-mono text-xs mb-1">ELITE TEAMS</p>
                     <p className="text-3xl md:text-5xl font-bold text-orange-500 tracking-tight">Top 100</p>
                 </div>
                 <div>
                     <p className="text-gray-500 font-mono text-xs mb-1">HOURS</p>
                     <p className="text-3xl md:text-5xl font-bold text-green-500 tracking-tight">48</p>
                 </div>
                 <div>
                     <p className="text-gray-500 font-mono text-xs mb-1">CAREER</p>
                     <p className="text-xl md:text-2xl font-bold text-cyan-400 tracking-tight mt-2">Direct Interviews</p>
                 </div>
             </div>
        </div>
    )
}

const TracksSection = () => {
    return (
        <section id="tracks" className="py-32 relative z-10 bg-gradient-to-b from-black to-zinc-950">
            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-20 flex flex-col md:flex-row items-end justify-between gap-6 border-b border-white/10 pb-10">
                    <div>
                        <h2 className="text-5xl font-bold mb-2">MISSION TRACKS</h2>
                        <p className="text-gray-400 font-mono text-sm">SELECT YOUR OBJECTIVE</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    <HoloCard 
                        title="INNOVATION"
                        subtitle="OPEN_THEME"
                        accent={ORANGE}
                        icon={<Rocket />}
                        desc="Architect the future. No constraints. Pure imagination. Build the next unicorn."
                        tags={["Zero Limits", "Seed Funding", "Mentorship"]}
                    />
                    <HoloCard 
                        title="PROBLEM SOLVER"
                        subtitle="TARGETED_OPS"
                        accent={GREEN}
                        icon={<Terminal />}
                        desc="Decode national challenges. Implement scalable solutions for real-world governance."
                        tags={["Gov Tech", "Smart City", "Cash Prizes"]}
                    />
                </div>
            </div>
        </section>
    )
}

const AboutSection = () => (
    <section id="about" className="py-32 px-6 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto">
             <div className="grid md:grid-cols-3 gap-12">
                 <div className="col-span-1">
                     <h3 className="text-3xl font-bold mb-6 font-mono border-l-4 border-cyan-500 pl-6">THE MISSION</h3>
                     <p className="text-gray-400 leading-relaxed text-lg">
                         IndiaNext is not just a hackathon. It is a <span className="text-white">national imperative</span>. 
                         We are gathering the brightest minds to engineer the operating system of Future India.
                     </p>
                 </div>
                 <div className="col-span-2 grid sm:grid-cols-2 gap-6">
                     <TechDetail icon={<Cpu />} title="Quantum & AI" desc="Next-gen compute layers" />
                     <TechDetail icon={<Globe />} title="Web 3.0" desc="Decentralized governance" />
                     <TechDetail icon={<Shield />} title="CyberSec" desc="National defense infra" />
                     <TechDetail icon={<Radio />} title="IoT & 5G" desc="Hyper-connected cities" />
                 </div>
             </div>
        </div>
    </section>
);

const Footer = () => (
    <footer className="py-12 border-t border-white/10 bg-black text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
            <div className="w-12 h-12 mb-6 rounded-full bg-gradient-to-tr from-orange-600 via-white to-green-600 p-[1px]">
                  <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                  </div>
            </div>
            <p className="text-gray-500 font-mono text-sm mb-4">ENGINEERED FOR INDIA</p>
            <p className="text-gray-700 text-xs">© 2026 IndiaNext. All Systems Normal.</p>
        </div>
    </footer>
);

// --- Subcomponents ---

const HoloCard = ({ title, subtitle, accent, icon, desc, tags }: any) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
    };

    return (
        <div 
            onMouseMove={handleMouseMove}
            className="group relative min-h-[400px] bg-zinc-900/50 border border-white/10 p-8 overflow-hidden backdrop-blur-sm"
        >
            <motion.div 
                className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition duration-300"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${x}px ${y}px,
                      ${accent}15,
                      transparent 80%
                    )
                  `,
                }}
            />
            {/* Border glow */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-${accent === ORANGE ? 'orange-600' : 'green-600'} opacity-50`} />
            
            <div className="relative z-10 flex flex-col h-full">
                <div className={`w-16 h-16 mb-8 flex items-center justify-center border border-white/20 bg-white/5`}>
                     {React.cloneElement(icon, { size: 32, className: "text-white" })}
                </div>

                <div className="mb-2 font-mono text-xs" style={{ color: accent }}>{subtitle}</div>
                <h3 className="text-4xl font-bold mb-6 text-white uppercase tracking-tighter">{title}</h3>
                
                <p className="text-gray-400 mb-8 leading-relaxed max-w-sm flex-grow">{desc}</p>
                
                <div className="flex flex-wrap gap-2 mt-auto">
                    {tags.map((t: string) => (
                        <span key={t} className="px-3 py-1 border border-white/10 text-xs font-mono text-gray-500">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

const TechDetail = ({ icon, title, desc }: any) => (
    <div className="flex items-start gap-4 p-4 border border-white/5 hover:bg-white/5 transition-colors group">
        <div className="text-gray-500 group-hover:text-white transition-colors">{icon}</div>
        <div>
            <h4 className="font-bold text-lg mb-1">{title}</h4>
            <p className="text-sm text-gray-500 font-mono">{desc}</p>
        </div>
    </div>
);

const CyberBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#050505] perspective-1000 overflow-hidden">
        {/* Deep Space Base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a2e_0%,#000000_100%)]" />
        
        {/* Starfield */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
        <div className="absolute inset-0 opacity-40" 
             style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '60px 60px' }} 
        />
        
        {/* Brighter Nebulas */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF6600] rounded-full blur-[180px] opacity-20 animate-pulse mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00FF55] rounded-full blur-[180px] opacity-20 animate-pulse delay-1000 mix-blend-screen" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-[#00CCFF] rounded-full blur-[200px] opacity-10 animate-pulse delay-700 mix-blend-screen" />

        {/* Moving Grid Floor */}
        <div 
            className="absolute bottom-0 left-[-50%] right-[-50%] h-[60vh] bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [transform:rotateX(60deg)] origin-bottom animate-grid-flow mask-image:linear-gradient(to_top,black,transparent)"
        />
    </div>
);
