import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Linkedin, Mail, Phone } from "lucide-react";
import React, { useState } from "react";

interface ContactFormProps {
  onSubmit?: (formData: FormData) => void;
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactForm = ({ onSubmit }: ContactFormProps = {}) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Submit the form
      if (onSubmit) {
        onSubmit(formData);
      }
      setIsSubmitted(true);
      // Reset form after submission
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }
  };

  return (
    <div id="contact-section" className="w-full max-w-2xl mx-auto bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white-100">
            Get in Touch
          </CardTitle>
          <CardDescription className="text-center text-white-400">
            Fill out the form below!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <Alert className="bg-zinc-800 border-zinc-700 mb-6">
              <CheckCircle className="h-4 w-4 text-white-300" />
              <AlertDescription className="text-white-300">
                Thank you for your message! I will get back to you
                soon.
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white-300">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white-300">
                Subject
              </Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Subject of your message"
                value={formData.subject}
                onChange={handleChange}
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-red-500 text-sm">{errors.subject}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-white-300">
                Message
              </Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Your message here..."
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className={errors.message ? "border-red-500" : ""}
              />
              {errors.message && (
                <p className="text-red-500 text-sm">{errors.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white-200 border border-zinc-700"
            >
              Send Message
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="w-full border-t border-zinc-700 pt-4">
            <h3 className="text-sm font-extrabold text-white-300 mb-3">
              Connect with me
            </h3>
            <div className="flex flex-wrap gap-4 ">
              <a
                href="https://linkedin.com/in/ken-muvatsi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-white-600 hover:text-red-600" 
              >
                <Linkedin className="h-5 w-5 mr-2" />
                LinkedIn
              </a>
              <a
                href="mailto:kmuvatsi@lynnwoodhonda.com"
                className="flex items-center text-sm text-white-600 hover:text-red-600"
              >
                <Mail className="h-5 w-5 mr-2" />
                kmuvatsi@lynnwoodhonda.com
              </a>
              <a
                href="tel:+1234567890"
                className="flex items-center text-sm text-white-600 hover:text-red-600"
              >
                <Phone className="h-5 w-5 mr-2" />
                (206) 454-0466
              </a>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ContactForm;
