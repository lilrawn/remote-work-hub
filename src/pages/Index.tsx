import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { CategorySection } from '@/components/CategorySection';
import { FeaturedJobs } from '@/components/FeaturedJobs';
import { ReviewsSection } from '@/components/ReviewsSection';
import { SupportChat } from '@/components/SupportChat';
import { Footer } from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <CategorySection />
        <FeaturedJobs />
        <ReviewsSection />
      </main>
      <Footer />
      <SupportChat />
    </div>
  );
};

export default Index;
