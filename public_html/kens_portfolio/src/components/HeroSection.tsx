import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
interface HeroSectionProps {
  name?: string;
  title?: string;
  introduction?: string;
  imageUrl?: string;
  onContactClick?: () => void;
}

const HeroSection = ({
  name = "Ken Muvatsi",
  title = "title",
  introduction = "introduction",
  imageUrl = '/ken.jpg',
  onContactClick = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  },
}: HeroSectionProps) => {
  return (
    <section className="w-full min-h-[600px] bg-black flex items-center relative overflow-hidden">
      {/* Background with dotted pattern */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(192, 192, 192, 0.3) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-zinc-900 opacity-80 z-0"></div>

      <div className="container mx-auto px-4 md:px-6 py-12 flex flex-col md:flex-row items-center z-10">
        {/* Content */}
        <div className="md:w-3/5 md:pr-8 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-100 mb-4">
            {name}
          </h1>
          <h2 className="text-xl md:text-2xl font-medium text-gray-300 mb-6">
            {title} | Honda Motor Co.
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl">{introduction}</p>
          
          <div className="flex flex-wrap gap-4">
            
            <Button
              onClick={onContactClick}
              className="bg-zinc-800 hover:bg-zinc-700 text-gray-200 px-6 py-2 rounded-md border border-gray-700"
            >
              Contact Me <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

          </div>
        </div>

        {/* Image */}
        <div className="md:w-2/5 relative">
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-zinc-800 shadow-xl mx-auto">
            <img
              src={imageUrl}
              alt={`${name} - ${title} at Honda`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-black rounded-full flex items-center justify-center shadow-lg border border-gray-700">
            <img
              src="/Honda.jpg"
              alt="Honda Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
