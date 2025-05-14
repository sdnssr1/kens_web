import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Skill {
  name: string;
  proficiency: number;
  category: "business" | "technical" | "soft";
  description: string;
  yearsOfExperience: number;
  projects?: string[];
}

interface SkillsSectionProps {
  skills?: Skill[];
}

const SkillsSection = ({ skills = defaultSkills }: SkillsSectionProps) => {
  const [selectedSkill, setSelectedSkill] = React.useState<Skill | null>(null);

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  const handleCloseDialog = () => {
    setSelectedSkill(null);
  };

  const businessSkills = skills.filter(
    (skill) => skill.category === "business",
  );
  const technicalSkills = skills.filter(
    (skill) => skill.category === "technical",
  );
  const softSkills = skills.filter((skill) => skill.category === "soft");

  return (
    <section
      id="skills"
      className="py-16 bg-black"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(192, 192, 192, 0.1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-100">
          Skills & Expertise
        </h2>

        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">
            Business Domain Expertise
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessSkills.map((skill, index) => (
              <SkillCard key={index} skill={skill} onClick={handleSkillClick} />
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">
            Technical Knowledge
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicalSkills.map((skill, index) => (
              <SkillCard key={index} skill={skill} onClick={handleSkillClick} />
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">
            Soft Skills
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {softSkills.map((skill, index) => (
              <SkillCard key={index} skill={skill} onClick={handleSkillClick} />
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedSkill} onOpenChange={handleCloseDialog}>
        {selectedSkill && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedSkill.name}
              </DialogTitle>
              <DialogDescription>
                <div className="mt-4">
                  <Badge variant="secondary" className="mb-2">
                    {selectedSkill.category.charAt(0).toUpperCase() +
                      selectedSkill.category.slice(1)}{" "}
                    Skill
                  </Badge>
                  <Badge variant="outline" className="ml-2 mb-2">
                    {selectedSkill.yearsOfExperience}{" "}
                    {selectedSkill.yearsOfExperience === 1 ? "year" : "years"}{" "}
                    of experience
                  </Badge>

                  <p className="text-sm text-gray-600 mt-4">
                    {selectedSkill.description}
                  </p>

                  {selectedSkill.projects &&
                    selectedSkill.projects.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">
                          Related Projects:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {selectedSkill.projects.map((project, index) => (
                            <li key={index}>{project}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
};

interface SkillCardProps {
  skill: Skill;
  onClick: (skill: Skill) => void;
}

const SkillCard = ({ skill, onClick }: SkillCardProps) => {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-gray-400 bg-zinc-800 text-gray-200"
      onClick={() => onClick(skill)}
    >
      <CardContent className="p-6">
        <h4 className="font-medium text-lg mb-2 text-gray-200">{skill.name}</h4>
        <div className="flex items-center mb-2">
          <Progress value={skill.proficiency} className="h-2 bg-zinc-700" />
          <span className="ml-2 text-sm text-gray-400">
            {skill.proficiency}%
          </span>
        </div>
        <p className="text-sm text-gray-400 line-clamp-2">
          {skill.description}
        </p>
      </CardContent>
    </Card>
  );
};

const defaultSkills: Skill[] = [
  // Business Domain Skills
  {
    name: "Automotive Industry Knowledge",
    proficiency: 95,
    category: "business",
    description:
      "Comprehensive understanding of the automotive industry, market trends, and competitive landscape with specific focus on Honda's position in the global market.",
    yearsOfExperience: 15,
    projects: [
      "Honda Global Market Strategy 2020",
      "Competitive Analysis Report 2022",
    ],
  },
  {
    name: "Strategic Planning",
    proficiency: 90,
    category: "business",
    description:
      "Expertise in developing and implementing strategic business plans to achieve organizational objectives and drive growth.",
    yearsOfExperience: 12,
    projects: [
      "Honda 5-Year Growth Strategy",
      "North American Market Expansion Plan",
    ],
  },
  {
    name: "Financial Analysis",
    proficiency: 85,
    category: "business",
    description:
      "Strong capability in financial modeling, budgeting, forecasting, and investment analysis to support business decisions.",
    yearsOfExperience: 10,
    projects: ["Annual Budget Planning", "ROI Analysis for New Product Lines"],
  },
  {
    name: "Supply Chain Management",
    proficiency: 80,
    category: "business",
    description:
      "Experience optimizing supply chain operations, logistics, and vendor relationships to improve efficiency and reduce costs.",
    yearsOfExperience: 8,
    projects: [
      "Supply Chain Optimization Initiative",
      "Vendor Relationship Management Program",
    ],
  },

  // Technical Skills
  {
    name: "Data Analysis",
    proficiency: 85,
    category: "technical",
    description:
      "Proficient in analyzing complex datasets to extract actionable insights using various analytical tools and methodologies.",
    yearsOfExperience: 10,
    projects: ["Customer Segmentation Analysis", "Sales Performance Dashboard"],
  },
  {
    name: "Project Management",
    proficiency: 90,
    category: "technical",
    description:
      "Certified project manager with experience leading cross-functional teams and delivering projects on time and within budget.",
    yearsOfExperience: 12,
    projects: ["New Model Launch 2021", "Manufacturing Process Improvement"],
  },
  {
    name: "Business Intelligence Tools",
    proficiency: 75,
    category: "technical",
    description:
      "Experience with various BI tools including Tableau, Power BI, and Excel for data visualization and reporting.",
    yearsOfExperience: 7,
    projects: [
      "Executive Dashboard Implementation",
      "Sales Analytics Platform",
    ],
  },
  {
    name: "ERP Systems",
    proficiency: 80,
    category: "technical",
    description:
      "Knowledge of enterprise resource planning systems, particularly SAP and Oracle, for integrated business process management.",
    yearsOfExperience: 8,
    projects: ["ERP Implementation Project", "System Integration Initiative"],
  },

  // Soft Skills
  {
    name: "Leadership",
    proficiency: 95,
    category: "soft",
    description:
      "Proven ability to inspire and lead teams, foster collaboration, and drive results in complex organizational environments.",
    yearsOfExperience: 15,
    projects: ["Department Restructuring", "Leadership Development Program"],
  },
  {
    name: "Negotiation",
    proficiency: 90,
    category: "soft",
    description:
      "Strong negotiation skills with experience in vendor contracts, partnerships, and internal resource allocation.",
    yearsOfExperience: 12,
    projects: [
      "Major Supplier Contract Negotiation",
      "Strategic Partnership Formation",
    ],
  },
  {
    name: "Communication",
    proficiency: 95,
    category: "soft",
    description:
      "Excellent verbal and written communication skills with experience presenting to executive leadership and external stakeholders.",
    yearsOfExperience: 15,
    projects: [
      "Annual Shareholder Presentations",
      "Internal Communication Strategy",
    ],
  },
  {
    name: "Problem Solving",
    proficiency: 90,
    category: "soft",
    description:
      "Analytical approach to problem-solving with the ability to identify root causes and develop effective solutions.",
    yearsOfExperience: 14,
    projects: [
      "Crisis Management Response Team",
      "Process Bottleneck Resolution",
    ],
  },
];

export default SkillsSection;
