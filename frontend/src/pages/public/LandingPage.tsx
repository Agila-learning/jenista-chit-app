import { HeroSection } from '../../components/public/HeroSection';
import { TrackChitSection } from '../../components/public/TrackChitSection';
import { PlansSection } from '../../components/public/PlansSection';
import { AboutUsSection } from '../../components/public/AboutUsSection';
import { TestimonialsSection } from '../../components/public/TestimonialsSection';
import { AppFeaturesSection } from '../../components/public/AppFeaturesSection';
import { HowItWorksSection } from '../../components/public/HowItWorksSection';
import { ContactSection } from '../../components/public/ContactSection';

export const LandingPage = () => {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <AppFeaturesSection />
      <AboutUsSection />
      <PlansSection />
      <TestimonialsSection />
      <TrackChitSection />
      <ContactSection />
    </>
  );
};
