import Link from "next/link";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { TechStackSection } from "@/components/home/TechStackSection";
import { PerformanceSection } from "@/components/home/PerformanceSection";
import { GettingStartedSection } from "@/components/home/GettingStartedSection";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <HeroSection />
      <FeaturesSection />
      <TechStackSection />
      <PerformanceSection />
      <GettingStartedSection />
      <Footer />
    </div>
  );
}
