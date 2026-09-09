import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.tsx';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_40%,transparent_100%)]"></div>
      
      <header className="px-8 py-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <div className="bg-slate-900 p-1.5 rounded-lg shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">TaskFlow</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link to="/login">
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-slate-900">Sign In</Button>
          </Link>
        </motion.div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-[-8vh]">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-3xl space-y-8"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-600 mb-4 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            v2.0 is now live
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Manage your tasks. <br/>
            <span className="bg-gradient-to-r from-slate-500 to-slate-800 bg-clip-text text-transparent">
              Stay focused.
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            A professional task management solution designed to help you organize your work, set priorities, and get things done beautifully.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto font-bold text-base px-8 h-14 rounded-2xl gap-2 group">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold text-base px-8 h-14 rounded-2xl bg-white/50 backdrop-blur-sm">
                View Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
