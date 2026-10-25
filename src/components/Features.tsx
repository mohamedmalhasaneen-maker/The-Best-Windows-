import { ShieldCheck, CheckCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'خامات معتمدة',
    description: 'نستخدم أفضل القطاعات التركية والأوروبية الحاصلة على شهادات الجودة العالمية لضمان أطول عمر افتراضي للشبابيك والأبواب.'
  },
  {
    icon: CheckCircle,
    title: 'عزل حراري وصوتي',
    description: 'تقنيات عزل مزدوجة متطورة للصوت والحرارة والأتربة، مما يوفر لك بيئة داخلية هادئة ومثالية لمنزلك.'
  },
  {
    icon: Info,
    title: 'تنفيذ احترافي',
    description: 'فريق مهندسين وفنيين متخصصين لرفع المقاسات والتركيب بدقة تناهز الصفر خطأ، مع التزام تام بالجدول الزمني.'
  }
];

export default function Features() {
  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 print:mt-10">
      {FEATURES.map((feature, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="bg-white p-6 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:border-[#FACC15] transition-all duration-300 flex flex-col items-center text-center group"
        >
          <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] mb-4 group-hover:bg-[#0F172A] group-hover:text-white transition-colors duration-200">
            <feature.icon size={22} />
          </div>
          <h3 className="font-display font-black text-lg mb-2 text-[#0F172A]">{feature.title}</h3>
          <p className="text-slate-500 leading-relaxed text-sm">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
