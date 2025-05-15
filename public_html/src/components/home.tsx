import { motion } from "framer-motion";
import ContactForm from "./ContactForm";
import ExperienceTimeline from "./ExperienceTimeline";
import HeroSection from "./HeroSection";
import { Separator } from "./ui/separator";

const HomePage = () => {
  // Create a placeholder SkillsSection component since it's not available
  const SkillsSection = () => {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Business Skills */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white-900">
              Business Expertise
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Strategic Planning
                  </span>
                  <span className="text-sm font-medium text-white-700">95%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "95%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Market Analysis
                  </span>
                  <span className="text-sm font-medium text-white-700">90%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "90%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Team Leadership
                  </span>
                  <span className="text-sm font-medium text-white-700">98%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "98%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Skills */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white-900">
              Technical Knowledge
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Automotive Industry
                  </span>
                  <span className="text-sm font-medium text-white-700">50%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "50%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Data Analysis
                  </span>
                  <span className="text-sm font-medium text-white-700">50%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "50%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Project Management
                  </span>
                  <span className="text-sm font-medium text-white-700">50%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "50%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Soft Skills */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white-900">Soft Skills</h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Communication
                  </span>
                  <span className="text-sm font-medium text-white-700">98%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "98%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Negotiation
                  </span>
                  <span className="text-sm font-medium text-white-700">94%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "94%" }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white-700">
                    Problem Solving
                  </span>
                  <span className="text-sm font-medium text-white-700">96%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: "96%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white-200">Ken Muvatsi</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#hero"
              className="text-sm font-medium text-white-700 hover:text-red-600 transition-colors"
            >
              Home
            </a>
            <a
              href="#experience"
              className="text-sm font-medium text-white-700 hover:text-red-600 transition-colors"
            >
              Experience
            </a>
            <a
              href="#skills"
              className="text-sm font-medium text-white-700 hover:text-red-600 transition-colors"
            >
              Skills
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-white-700 hover:text-red-600 transition-colors"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-white-700 hover:text-red-600 transition-colors"
            >
              Contact
            </a>
          </nav>
          <div className="md:hidden">
            {/* Mobile menu button would go here */}
            <button className="p-2 text-white-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-menu"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="hero" className="py-16 md:py-24">
          <HeroSection />
        </section>

        <Separator className="max-w-5xl mx-auto" />

        {/* Experience Timeline Section */}
        <section
          id="experience"
          className="py-16 md:py-24 bg-zinc-900"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-white-100 mb-4">
                Professional Experience
              </h2>
              <p className="text-lg text-white-400 max-w-2xl mx-auto">
                My career journey at Honda, showcasing leadership and business
                expertise in the automotive industry.
              </p>
            </motion.div>
            <ExperienceTimeline />
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto" />

        {/* Skills Section */}
        <section
          id="skills"
          className="py-16 md:py-24 bg-black"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-white-100 mb-4">
                Skills & Expertise
              </h2>
              <p className="text-lg text-white-400 max-w-2xl mx-auto">
                Core competencies and professional skills developed throughout
                my career at Honda.
              </p>
            </motion.div>
            <SkillsSection />
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto" />

        {/* About Section */}
        <section
          id="about"
          className="py-16 md:py-24 bg-zinc-900"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <img
                  src="/ken.jpg"
                  alt="Ken Muvatsi at Honda corporate office"
                  className="rounded-lg shadow-lg w-full h-auto object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white-100 mb-6">
                  About Me
                </h2>
                <p className="text-lg text-white-400 mb-4">
                  info
                </p>
                <p className="text-lg text-white-600 mb-4">
                  info
                </p>
                <p className="text-lg text-white-600">
                  info
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto" />

        {/* Contact Section */}
        <section
          id="contact"
          className="py-16 md:py-24 bg-black"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-white-100 mb-4">
                Get In Touch
              </h2>
              <p className="text-lg text-white-400 max-w-2xl mx-auto">
                Interested in connecting? Feel free to reach out through the
                form below or via my professional networks.
              </p>
            </motion.div>
            <div className="max-w-2xl mx-auto">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="bg-zinc-950 text-white-300 py-12"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(192, 192, 192, 0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <span className="text-xl font-bold text-white-200">
                Ken Muvatsi
              </span>
              <p className="mt-2 text-white-500">
                Business Professional at Honda
              </p>
            </div>
            <div className="flex space-x-6">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-linkedin"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-twitter"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a
                href="mailto:ken.muvatsi@example.com"
                className="text-white-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-mail"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-white-400 text-sm">
            <p>
              © {new Date().getFullYear()} Ken Muvatsi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
