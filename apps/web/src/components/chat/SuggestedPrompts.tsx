import { motion } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';

const PROMPTS = [
  { label: 'Attendance Report', prompt: 'Create attendance report for BSCS students with conditional formatting for absences' },
  { label: 'Payroll Sheet', prompt: 'Generate payroll sheet for teaching staff with all salary components and net pay formula' },
  { label: 'Fee Defaulters', prompt: 'Create fee defaulter dashboard with chart and summary statistics' },
  { label: 'Exam Marksheet', prompt: 'Create examination marksheet for CS101 with grade calculation formulas' },
  { label: 'Financial Analytics', prompt: 'Generate monthly financial analytics sheet with charts and KPIs' },
  { label: 'Timetable', prompt: 'Build timetable management sheet for semester 2025' },
  { label: 'Inventory Tracker', prompt: 'Create lab inventory tracking system with low-stock alerts' },
  { label: 'Student Performance', prompt: 'Generate student performance analysis with GPA trends and charts' },
  { label: 'Clean Duplicates', prompt: 'Remove duplicate student entries from the active sheet' },
  { label: 'Pivot Table', prompt: 'Create pivot table for fee collection statistics by department' },
];

export function SuggestedPrompts() {
  const { addUserMessage } = useChatStore();

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-6"
      >
        <div className="text-3xl mb-2">🤖</div>
        <h2 className="text-base font-semibold text-foreground">SPREADSTER AI</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Tell me what to build, format, or analyze
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-1.5 w-full">
        {PROMPTS.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => addUserMessage(item.prompt)}
            className="text-left p-2.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-accent/30 transition-all group"
          >
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
