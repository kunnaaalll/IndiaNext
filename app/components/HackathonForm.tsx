
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Check, Loader2 } from 'lucide-react';

// Design Constants
const THEME = {
  bg: 'bg-black',
  text: 'text-white',
  accent: 'text-blue-500', 
  glow: 'shadow-[inset_0_0_100px_rgba(0,100,255,0.2)]',
};

const QUESTIONS = [
  {
    id: 'teamName',
    type: 'text',
    question: "What is your Team Name?",
    placeholder: "e.g. Code Warriors",
    required: true,
  },
  {
    id: 'leaderName',
    type: 'text',
    question: "Team Leader's Full Name",
    placeholder: "John Doe",
    required: true,
  },
  {
    id: 'email',
    type: 'email',
    question: "Leader's Email Address",
    placeholder: "leader@college.edu",
    required: true,
    isEmail: true,
  },
  {
    id: 'phone',
    type: 'tel',
    question: "Leader's Contact Number",
    placeholder: "+91 99999 99999",
    required: true,
  },
  {
    id: 'college',
    type: 'text',
    question: "College / Institution Name",
    placeholder: "IIT Bombay, LPU, etc.",
    required: true,
  },
  {
    id: 'track',
    type: 'choice',
    question: "Which track are you applying for?",
    subtext: "Innovation: Build your own idea (30 teams). Problem Statement: Solve a given problem on the spot (70 teams).",
    options: ["Innovation (Own Idea)", "Problem Statement (On Spot)"],
    required: true,
  },
  // Innovation Track Questions
  {
    id: 'projectTitle',
    type: 'text',
    question: "What is your Project Title?",
    placeholder: "e.g. Smart Traffic Manager",
    required: true,
    condition: (answers: any) => answers.track === "Innovation (Own Idea)",
  },
  {
    id: 'projectAbstract',
    type: 'long-text',
    question: "Describe your solution/idea in detail.",
    subtext: "This is crucial for your selection. Explain the problem and your proposed solution.",
    placeholder: "Our solution aims to...",
    required: true,
    condition: (answers: any) => answers.track === "Innovation (Own Idea)",
  },
  {
    id: 'techStack',
    type: 'text',
    question: "What Tech Stack will you use?",
    placeholder: "React, Node, Python, etc.",
    required: true,
    condition: (answers: any) => answers.track === "Innovation (Own Idea)",
  },
  // Problem Statement Track Questions
  {
    id: 'screeningSolution',
    type: 'long-text',
    question: "Screening Challenge: Smart Campus System",
    subtext: "PROBLEM: Design a scalable system to manage student attendance efficiently without biometric or manual entry. \n\nTASK: Describe your approach.",
    placeholder: "We propose using...",
    required: true,
    condition: (answers: any) => answers.track === "Problem Statement (On Spot)",
  },
  {
    id: 'skills',
    type: 'text',
    question: "What are your team's top technical skills?",
    subtext: "List the technologies you are most proficient in.",
    placeholder: "Web Dev, App Dev, AI/ML...",
    required: true,
    condition: (answers: any) => answers.track === "Problem Statement (On Spot)",
  },
  {
    id: 'portfolio',
    type: 'url',
    question: "Portfolio / GitHub / Previous Projects Link",
    subtext: "Show us what you've built before.",
    placeholder: "https://github.com/...",
    required: true,
    condition: (answers: any) => answers.track === "Problem Statement (On Spot)",
  },
  // Common Final Question
  {
    id: 'comments',
    type: 'long-text',
    question: "Any other details?",
    placeholder: "Anything else...",
    required: false,
  }
];

export default function HackathonForm() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [direction, setDirection] = useState(0);

  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalSteps = QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentQuestion = QUESTIONS[currentStep];

  const handleStart = () => setStarted(true);

  const getNextValidStep = (current: number, dir: number, currentAnswers: any) => {
    let nextStep = current + dir;
    while (nextStep >= 0 && nextStep < totalSteps) {
       const q = QUESTIONS[nextStep];
       if (q.condition && !q.condition(currentAnswers)) {
         nextStep += dir;
       } else {
         return nextStep;
       }
    }
    return nextStep;
  };

  const handleNext = async () => {
    // Special handling for email step
    if (currentQuestion.id === 'email' && !emailVerified) {
        if (!answers.email || !answers.email.includes('@')) {
            setErrorMsg("Please enter a valid email.");
            return;
        }
        await sendOtp();
        return;
    }

    const nextStep = getNextValidStep(currentStep, 1, answers);
    
    if (nextStep < totalSteps) {
      setDirection(1);
      setCurrentStep(nextStep);
      setErrorMsg(""); // clear errors
    } else {
      await submitForm();
    }
  };

  const submitForm = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(answers),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Submission failed');
          
          setIsCompleted(true);
      } catch (err: any) {
          setErrorMsg(err.message);
      } finally {
          setLoading(false);
      }
  };

  const sendOtp = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
          const res = await fetch('/api/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: answers.email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          
          setShowOtpInput(true);
      } catch (err: any) {
          setErrorMsg(err.message);
      } finally {
          setLoading(false);
      }
  };

  const verifyOtp = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
          const res = await fetch('/api/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: answers.email, otp: otpValue }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setEmailVerified(true);
          setShowOtpInput(false);
          // Auto advance after verification
          setTimeout(() => {
             const nextStep = getNextValidStep(currentStep, 1, answers);
             setDirection(1);
             setCurrentStep(nextStep);
          }, 500);

      } catch (err: any) {
          setErrorMsg(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handlePrev = () => {
    if (showOtpInput) {
        setShowOtpInput(false);
        return;
    }
    const prevStep = getNextValidStep(currentStep, -1, answers);
    if (prevStep >= 0) {
      setDirection(-1);
      setCurrentStep(prevStep);
      setErrorMsg("");
    }
  };

  const handleAnswer = (value: any) => {
    setAnswers((prev: any) => ({ ...prev, [QUESTIONS[currentStep].id]: value }));
    setErrorMsg("");
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && started && !isCompleted && !loading) {
        if (showOtpInput) {
             if (otpValue.length === 6) verifyOtp();
             return;
        }
        
        if (currentQuestion.type !== 'long-text' || e.metaKey || e.ctrlKey) { 
           e.preventDefault();
           if (currentQuestion.required && !answers[currentQuestion.id]) return;
           handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, isCompleted, currentStep, answers, currentQuestion, showOtpInput, otpValue, loading]);


  if (!started) return <WelcomeScreen onStart={handleStart} />;
  if (isCompleted) return <ThankYouScreen />;

  return (
    <div className={`min-h-screen w-full flex flex-col ${THEME.bg} ${THEME.text} ${THEME.glow} relative overflow-hidden font-sans`}>
      {/* Header */}
      <header className="absolute top-8 left-8 z-10 flex items-center gap-2">
           <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
             <div className="w-2 h-2 bg-white rounded-full"></div>
           </div>
           <span className="font-semibold text-lg tracking-tight">IndiaNext</span>
      </header>

      {/* Progress */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
        <motion.div 
          className="h-full bg-neon-orange"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-16 md:px-32 max-w-4xl mx-auto w-full">
         <AnimatePresence mode="wait" custom={direction}>
           {!showOtpInput ? (
               <motion.div
                 key={currentStep}
                 custom={direction}
                 initial={{ opacity: 0, y: direction > 0 ? 50 : -50 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: direction > 0 ? -50 : 50 }}
                 transition={{ duration: 0.3 }}
                 className="w-full"
               >
                 <div className="mb-6 flex items-center gap-3 text-neon-orange">
                   <span className="text-sm font-medium">Step {currentStep + 1}<span className="text-gray-600">/</span>{totalSteps}</span>
                 </div>

                 <h2 className="text-2xl md:text-4xl font-light mb-4 leading-tight">
                   {currentQuestion.question} <span className="text-red-500 text-lg align-top">{currentQuestion.required && '*'}</span>
                 </h2>
                 
                 {currentQuestion.subtext && (
                   <p className="text-gray-400 text-lg mb-8 font-light max-w-2xl">{currentQuestion.subtext}</p>
                 )}

                 <div className="mt-8">
                   <InputRenderer 
                     question={currentQuestion} 
                     value={answers[currentQuestion.id] || ''} 
                     onChange={handleAnswer} 
                   />
                 </div>
                 
                 {errorMsg && <p className="text-red-400 mt-4">{errorMsg}</p>}

                 <div className="mt-8 flex items-center gap-4">
                    <button 
                       onClick={handleNext}
                       disabled={loading || (currentQuestion.required && !answers[currentQuestion.id])}
                       className="px-6 py-2 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <>OK <Check size={18} /></>}
                    </button>
                    <span className="text-xs text-gray-500 hidden sm:inline ml-2">press <strong className="text-gray-300">Enter ↵</strong></span>
                 </div>
               </motion.div>
           ) : (
               <motion.div
                 key="otp"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full"
               >
                  <h2 className="text-2xl md:text-4xl font-light mb-4 leading-tight">Enter Verification Code</h2>
                  <p className="text-gray-400 text-lg mb-8 font-light">We sent a 6-digit code to {answers.email}</p>
                  
                  <input
                    type="text"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, ''); 
                        if (val.length <= 6) setOtpValue(val);
                    }}
                    className="w-full bg-transparent border-b border-gray-600 text-4xl pb-4 focus:outline-none focus:border-white transition-colors font-mono tracking-widest text-center"
                    placeholder="000000"
                    autoFocus
                  />
                  
                  {errorMsg && <p className="text-red-400 mt-4 text-center">{errorMsg}</p>}

                  <div className="mt-8 flex justify-center gap-4">
                     <button
                        onClick={verifyOtp}
                        disabled={otpValue.length !== 6 || loading}
                        className="px-8 py-3 rounded-full bg-neon-blue text-black font-bold text-xl hover:bg-white hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,102,255,0.4)]"
                     >
                        {loading ? <Loader2 className="animate-spin" /> : "Verify Code"}
                     </button>
                  </div>
                  <div className="mt-4 text-center">
                      <button onClick={() => setShowOtpInput(false)} className="text-gray-500 hover:text-white text-sm">Wrong email?</button>
                  </div>
               </motion.div>
           )}
         </AnimatePresence>
      </main>

      {/* Nav Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
         <button 
           onClick={handlePrev} 
           disabled={currentStep === 0 && !showOtpInput}
           className={`p-2 rounded bg-gray-900 hover:bg-gray-800 transition-colors ${currentStep === 0 && !showOtpInput ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
         >
           <ChevronUp size={24} />
         </button>
         <button 
           onClick={handleNext}
           disabled={currentQuestion.required && !answers[currentQuestion.id]}
           className={`p-2 rounded bg-neon-blue hover:bg-white hover:text-black transition-all text-black mt-1 opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto`}
         >
           <ChevronDown size={24} />
         </button>
      </div>
    </div>
  );
}

// Subcomponents matching original styles

const WelcomeScreen = ({ onStart }: { onStart: () => void }) => (
  <div className={`min-h-screen w-full flex flex-col justify-center items-center ${THEME.bg} ${THEME.text} ${THEME.glow} relative text-center px-4`}>
     <div className="max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">IndiaNext <br /> 2026</h1>
        <p className="text-xl md:text-2xl text-gray-400 font-light mb-10">
          Join the top Teams. <br/> 30 Innovation Track. 70 Problem Solvers.
        </p>
        <button 
          onClick={onStart}
          className="px-8 py-3 rounded-full bg-white text-black font-bold text-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Begin Registration
        </button>
        <p className="mt-4 text-sm text-gray-500">🕒 Takes 3 minutes</p>
     </div>
  </div>
);

const ThankYouScreen = () => (
   <div className={`min-h-screen w-full flex flex-col justify-center items-center ${THEME.bg} ${THEME.text} ${THEME.glow} relative text-center px-4`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl"
      >
         <h1 className="text-4xl md:text-5xl font-medium mb-6">Thank you for applying.</h1>
         <p className="text-xl text-gray-400 font-light">We'll be in touch shortly.</p>
         <a href="/" className="mt-8 inline-block text-neon-blue hover:text-white underline transition-colors">Back to home</a>
      </motion.div>
   </div>
);

const InputRenderer = ({ question, value, onChange }: any) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
       if (inputRef.current) inputRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [question]);

  if (question.type === 'choice') {
    return (
      <div className="flex flex-col gap-3 max-w-xs">
        {question.options.map((opt: string, idx: number) => (
          <OptionButton 
            key={opt} 
            idx={idx} 
            opt={opt} 
            selected={value === opt} 
            onSelect={() => onChange(opt)} 
          />
        ))}
      </div>
    );
  }

  if (question.type === 'long-text') {
    return (
      <textarea
        ref={inputRef as any}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className="w-full bg-transparent border-b border-gray-600 text-2xl md:text-3xl pb-2 focus:outline-none focus:border-white transition-colors placeholder-gray-600 resize-none h-40 font-light"
      />
    );
  }

  return (
    <input
      ref={inputRef as any}
      type={question.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder}
      className={`w-full bg-transparent border-b border-gray-600 text-2xl md:text-4xl pb-4 focus:outline-none focus:border-white transition-colors placeholder-gray-600 font-light
          ${question.type === 'tel' || question.type === 'number' ? 'font-mono' : ''}
      `}
    />
  );
};

const OptionButton = ({ opt, selected, onSelect }: any) => {
   const keyKey = opt.charAt(0).toUpperCase();
   
   useEffect(() => {
     const handler = (e: KeyboardEvent) => {
        if (e.key.toUpperCase() === keyKey) {
            onSelect();
        }
     };
     window.addEventListener('keydown', handler);
     return () => window.removeEventListener('keydown', handler);
   }, [keyKey, onSelect]);

   return (
      <button
        onClick={onSelect}
        className={`text-left px-4 py-3 rounded border text-xl transition-all flex items-center gap-3 w-full
           ${selected ? 'bg-neon-orange/20 border-neon-orange text-white' : 'border-gray-700 hover:bg-gray-800 text-gray-300'}
        `}
      >
        <div className={`w-8 h-8 border rounded flex items-center justify-center text-sm font-bold transition-colors
           ${selected ? 'bg-neon-orange border-neon-orange text-white' : 'border-gray-600 text-gray-500'}
        `}>
          {keyKey}
        </div>
        <span>{opt}</span>
        {selected && <Check size={20} className="ml-auto text-neon-orange" />}
      </button>
   );
};
