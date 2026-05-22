import { motion } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import { BarChart3, DollarSign, GraduationCap, FileSpreadsheet, ClipboardList, Calendar, Package, TrendingUp, Trash2, PieChart } from 'lucide-react';

const PROMPTS = [
  { icon: ClipboardList, label: 'Attendance',     color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/20',    prompt: 'Create attendance report for BSCS students with conditional formatting for absences' },
  { icon: DollarSign,    label: 'Payroll',         color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20', prompt: 'Generate payroll sheet for teaching staff with all salary components and net pay formula' },
  { icon: BarChart3,     label: 'Fee Dashboard',   color: 'from-violet-500/20 to-purple-500/20 border-violet-500/20', prompt: 'Create fee defaulter dashboard with chart and summary statistics' },
  { icon: GraduationCap, label: 'Marksheet',       color: 'from-amber-500/20 to-orange-500/20 border-amber-500/20',  prompt: 'Create examination marksheet for CS101 with grade calculation formulas' },
  { icon: TrendingUp,    label: 'Analytics',       color: 'from-pink-500/20 to-rose-500/20 border-pink-500/20',      prompt: 'Generate monthly financial analytics sheet with charts and KPIs' },
  { icon: Calendar,      label: 'Timetable',       color: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/20',       prompt: 'Build timetable management sheet for semester 2025' },
  { icon: Package,       label: 'Inventory',       color: 'from-lime-500/20 to-green-500/20 border-lime-500/20',     prompt: 'Create lab inventory tracking system with low-stock alerts' },
  { icon: FileSpreadsheet,label:'Performance',     color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/20',  prompt: 'Generate student performance analysis with GPA trends and charts' },
  { icon: Trash2,        label: 'Clean Data',      color: 'from-slate-500/20 to-gray-500/20 border-slate-500/20',    prompt: 'Remove duplicate student entries from the active sheet' },
  { icon: PieChart,      label: 'Pivot Table',     color: 'from-fuchsia-500/20 to-violet-500/20 border-fuchsia-500/20', prompt: 'Create pivot table for fee collection statistics by department' },
];

export function SuggestedPrompts() {
  const { addUserMessage } = useChatStore();

  return (
    <div className="flex flex-col h-full py-5 px-3 overflow-y-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center mb-5"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-3">
          <span className="text-xl">✦</span>
        </div>
        <h2 className="text-sm font-bold text-foreground">What can I help you build?</h2>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Describe any spreadsheet task in plain English
        </p>
      </motion.div>

      {/* Prompt grid */}
      <div className="grid grid-cols-2 gap-2">
        {PROMPTS.map(({ icon: Icon, label, color, prompt }, i) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035, duration: 0.22 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => addUserMessage(prompt)}
            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl bg-gradient-to-br ${color} border backdrop-blur-sm hover:shadow-md transition-all group text-left`}
          >
            <Icon size={14} className="text-foreground/60 group-hover:text-foreground transition-colors" />
            <span className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-tight">
              {label}
            </span>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground/50 mt-5">
        ↵ Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}

