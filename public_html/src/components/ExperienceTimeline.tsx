import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

interface TimelineEntry {
  id: string;
  role: string;
  company: string;
  duration: string;
  location: string;
  responsibilities: string[];
  achievements: string[];
}

interface ExperienceTimelineProps {
  entries?: TimelineEntry[];
}

const ExperienceTimeline = ({
  entries = defaultEntries,
}: ExperienceTimelineProps) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section
      className="py-16 bg-zinc-900"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-100">
          Professional Experience
        </h2>

        <div className="relative max-w-4xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-zinc-700"></div>

          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative mb-12 ${index % 2 === 0 ? "text-right" : "text-left"}`}
            >
              {/* Timeline dot */}
              <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-4">
                <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center shadow-lg">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Content card */}
              <div
                className={`w-5/12 ${index % 2 === 0 ? "mr-auto pr-8" : "ml-auto pl-8"}`}
              >
                <Card className="overflow-hidden border-l-4 border-gray-400 shadow-md hover:shadow-lg transition-shadow bg-zinc-800 text-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-100">
                          {entry.role}
                        </h3>
                        <p className="text-gray-300 font-medium">
                          {entry.company}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {entry.duration}
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                          {entry.location}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(entry.id)}
                        className="mt-1"
                      >
                        {expandedId === entry.id ? (
                          <ChevronUp />
                        ) : (
                          <ChevronDown />
                        )}
                      </Button>
                    </div>

                    {expandedId === entry.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t border-zinc-700"
                      >
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            Key Responsibilities:
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {entry.responsibilities.map((item, i) => (
                              <li key={i} className="text-gray-400">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">
                            Key Achievements:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.achievements.map((achievement, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="bg-zinc-700 text-gray-300 border-zinc-600"
                              >
                                {achievement}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const defaultEntries: TimelineEntry[] = [
  {
    id: "1",
    role: "role",
    company: "Company",
    duration: "YYYY - YYYY",
    location: "City, Country",
    responsibilities: [
      "responsibilities # one, What Why, How",
      "responsibilities # two, What Why, How",
      "responsibilities # three, What Why, How",
      "responsibilities # four, What Why, How",
    ],
    achievements: [
      "Achivement # one",
      "Achivement # two",
      "Achivement # three",
      "Achivement # four",
    ],
  },
  {
    id: "2",
    role: "Role",
    company: "Company",
    duration: "YYYY - YYYY",
    location: "City, Country",
    responsibilities: [
      "responsibilities # one, What Why, How",
      "responsibilities # two, What Why, How",
      "responsibilities # three, What Why, How",
      "responsibilities # four, What Why, How",
    ],
    achievements: [
      "Achivement # one",
      "Achivement # two",
      "Achivement # three",
      "Achivement # four",
    ],
  },
  {
    id: "3",
    role: "Role",
    company: "Company",
    duration: "YYYY - YYYY",
    location: "City, Country",
    responsibilities: [
      "responsibilities # one, What Why, How",
      "responsibilities # two, What Why, How",
      "responsibilities # three, What Why, How",
      "responsibilities # four, What Why, How",
    ],
    achievements: [
      "Achivement # one",
      "Achivement # two",
      "Achivement # three",
      "Achivement # four",
    ],
  },
  {
    id: "4",
    role: "Role",
    company: "Company",
    duration: "YYYY - YYYY",
    location: "City, Country",
    responsibilities: [
      "responsibilities # one, What Why, How",
      "responsibilities # two, What Why, How",
      "responsibilities # three, What Why, How",
      "responsibilities # four, What Why, How",
    ],
    achievements: [
      "Achivement # one",
      "Achivement # two",
      "Achivement # three",
      "Achivement # four",
    ],
  },
];


export default ExperienceTimeline;